// Webhook da Kiwify para o Paranoá News
//
// A Kiwify chama esta URL a cada evento de compra ou assinatura.
// A função valida a origem, registra o evento cru em kiwify_eventos
// e atualiza a tabela assinaturas, que é o que libera ou bloqueia
// a publicação de vagas pela empresa.
//
// A validade é calculada pela coluna `meses` da tabela planos:
// mensal soma 1 mês, trimestral 3, semestral 6. Renovando antes do
// vencimento, o tempo novo é somado ao que ainda restava.
//
// Segredo necessário: KIWIFY_WEBHOOK_TOKEN (o token que a Kiwify mostra
// junto da URL do webhook). Sem ele a função aceita qualquer chamada,
// então configure antes de colocar no ar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(algo: "SHA-1" | "SHA-256", token: string, corpo: string) {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    { name: "HMAC", hash: algo },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo)));
}

// A Kiwify manda a assinatura na query string. Aceitamos SHA-1 e SHA-256
// porque o algoritmo já variou entre versões do painel.
async function assinaturaConfere(url: URL, corpo: string, token: string) {
  const recebida = (url.searchParams.get("signature") ?? url.searchParams.get("hash") ?? "")
    .trim()
    .toLowerCase();
  if (!recebida) return false;
  const sha1 = await hmacHex("SHA-1", token, corpo);
  const sha256 = await hmacHex("SHA-256", token, corpo);
  return recebida === sha1 || recebida === sha256;
}

function primeiro(...valores: unknown[]) {
  for (const v of valores) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function dataValida(valor: unknown) {
  if (!valor) return null;
  const d = new Date(String(valor));
  return isNaN(d.getTime()) ? null : d;
}

function somarMeses(base: Date, meses: number) {
  const d = new Date(base.getTime());
  d.setMonth(d.getMonth() + meses);
  return d;
}

// Traduz o evento da Kiwify para o status que o portal usa
function statusPara(evento: string): "ativa" | "atrasada" | "cancelada" | "reembolsada" | null {
  const e = evento.toLowerCase();
  if (["compra_aprovada", "order_approved", "paid", "approved", "subscription_renewed", "renewed"].some((k) => e.includes(k))) {
    return "ativa";
  }
  if (["subscription_late", "late", "atrasad", "compra_recusada", "refused"].some((k) => e.includes(k))) {
    return "atrasada";
  }
  if (["reembols", "refund", "chargeback"].some((k) => e.includes(k))) {
    return "reembolsada";
  }
  if (["cancel"].some((k) => e.includes(k))) {
    return "cancelada";
  }
  return null;
}

// Descobre o plano comprado: primeiro pelo id do produto cadastrado na
// tabela planos, depois pelo nome do produto, e por último pelo texto solto.
function acharPlano(planos: any[], produtoId: string | null, produtoNome: string | null) {
  if (produtoId) {
    const porId = planos.find((p) => p.kiwify_product_id && p.kiwify_product_id === produtoId);
    if (porId) return porId;
  }

  const nome = (produtoNome ?? "").toLowerCase();
  if (nome) {
    const porNomeCadastrado = planos.find(
      (p) => p.kiwify_product_name && nome.includes(String(p.kiwify_product_name).toLowerCase()),
    );
    if (porNomeCadastrado) return porNomeCadastrado;

    if (nome.includes("semestr")) return planos.find((p) => p.meses === 6) ?? null;
    if (nome.includes("trimestr")) return planos.find((p) => p.meses === 3) ?? null;
    if (nome.includes("mensal")) return planos.find((p) => p.meses === 1) ?? null;
  }

  return planos.find((p) => p.meses === 1) ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Este endpoint recebe apenas POST da Kiwify.", { status: 405 });
  }

  const url = new URL(req.url);
  const corpo = await req.text();
  const token = Deno.env.get("KIWIFY_WEBHOOK_TOKEN") ?? "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: Record<string, any> = {};
  try {
    payload = JSON.parse(corpo);
  } catch {
    return new Response("Corpo inválido.", { status: 400 });
  }

  const valida = token ? await assinaturaConfere(url, corpo, token) : true;

  const cliente = payload.Customer ?? payload.customer ?? {};
  const assinaturaKiwify = payload.Subscription ?? payload.subscription ?? {};
  const produto = payload.Product ?? payload.product ?? {};

  const evento = primeiro(
    payload.webhook_event_type,
    payload.event,
    assinaturaKiwify.status,
    payload.order_status,
  ) ?? "desconhecido";

  const email = primeiro(cliente.email, cliente.Email, payload.customer_email, payload.email)?.toLowerCase() ?? null;

  await supabase.from("kiwify_eventos").insert({
    evento,
    email,
    assinatura_valida: valida,
    payload,
  });

  if (!valida) {
    return new Response("Assinatura do webhook inválida.", { status: 401 });
  }

  if (!email) {
    return new Response("Evento registrado, mas sem e-mail do cliente.", { status: 200 });
  }

  const novoStatus = statusPara(evento);
  if (!novoStatus) {
    return new Response("Evento registrado, sem mudança de assinatura.", { status: 200 });
  }

  const registro: Record<string, unknown> = {
    email,
    nome: primeiro(cliente.full_name, cliente.first_name, cliente.name),
    telefone: primeiro(cliente.mobile, cliente.phone),
    kiwify_order_id: primeiro(payload.order_id, payload.id),
    kiwify_subscription_id: primeiro(assinaturaKiwify.id, payload.subscription_id),
    status: novoStatus,
    ultimo_evento: evento,
    atualizado_em: new Date().toISOString(),
  };

  if (novoStatus === "ativa") {
    const { data: planos } = await supabase
      .from("planos")
      .select("id,nome,meses,kiwify_product_id,kiwify_product_name")
      .order("meses");

    const produtoId = primeiro(produto.product_id, produto.id, payload.product_id);
    const produtoNome = primeiro(
      produto.product_name,
      produto.name,
      assinaturaKiwify.plan?.name,
      payload.product_name,
    );

    const plano = acharPlano(planos ?? [], produtoId, produtoNome);
    const meses = plano?.meses ?? 1;

    // Renovando antes de vencer, soma ao tempo que ainda restava
    const { data: atual } = await supabase
      .from("assinaturas")
      .select("expira_em")
      .eq("email", email)
      .maybeSingle();

    const restante = dataValida(atual?.expira_em);
    const agora = new Date();
    const base = restante && restante > agora ? restante : agora;

    // Se a Kiwify informar a próxima cobrança, ela manda
    const proximoPagamento =
      dataValida(assinaturaKiwify.next_payment) ??
      dataValida(assinaturaKiwify.next_payment_date) ??
      dataValida(payload.next_payment);

    registro.plano_id = plano?.id ?? null;
    registro.plano = plano?.nome ?? produtoNome ?? "Plano Empresa";
    registro.inicio = agora.toISOString();
    registro.expira_em = (proximoPagamento ?? somarMeses(base, meses)).toISOString();
  }

  // Remove campos nulos para não apagar dados já gravados numa renovação
  for (const chave of Object.keys(registro)) {
    if (registro[chave] === null) delete registro[chave];
  }

  const { error } = await supabase
    .from("assinaturas")
    .upsert(registro, { onConflict: "email" });

  if (error) {
    console.error("Falha ao gravar assinatura:", error);
    return new Response(`Erro ao gravar assinatura: ${error.message}`, { status: 500 });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      email,
      evento,
      status: novoStatus,
      plano: registro.plano ?? null,
      expira_em: registro.expira_em ?? null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

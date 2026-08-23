// Webhook da Kiwify para o Paranoá News
//
// A Kiwify chama esta URL a cada evento de compra ou assinatura.
// A função valida a origem, registra o evento cru em kiwify_eventos
// e atualiza a tabela assinaturas, que é o que libera ou bloqueia
// a publicação de vagas pela empresa.
//
// Na Kiwify existe UM produto com TRÊS planos de assinatura. O product_id
// é igual nos três, então quem identifica o plano comprado é o id do plano
// de assinatura (planos.kiwify_plan_id), com a periodicidade e o valor pago
// como reserva. Veja acharPlano() mais abaixo.
//
// A validade é calculada pela coluna `meses` da tabela planos:
// mensal soma 1 mês, trimestral 3, semestral 6. Renovando antes do
// vencimento, o tempo novo é somado ao que ainda restava.
//
// Segredo OBRIGATÓRIO: KIWIFY_WEBHOOK_TOKEN (o token que a Kiwify mostra
// junto da URL do webhook). Sem ele cadastrado, a função recusa TODOS os
// eventos — inclusive os legítimos. É de propósito: aceitar sem conferir
// assinatura deixaria qualquer pessoa se dar acesso pago de graça.

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

// Na Kiwify existe UM produto com TRES planos de assinatura (ofertas).
// Por isso o product_id e igual nos tres casos e nao serve para distinguir:
// quem separa mensal/trimestral/semestral e o plano da assinatura.
//
// A busca vai do sinal mais confiavel para o mais frouxo:
//   1. id do plano da Kiwify, se cadastrado em planos.kiwify_plan_id
//   2. periodicidade informada pela Kiwify (frequency / interval)
//   3. valor pago, que aqui e unico por plano (67, 97 e 177)
//   4. texto do nome do plano ou do produto
//   5. mensal, como ultimo recurso
function mesesDaFrequencia(valor: string | null, intervalo: number | null) {
  const f = (valor ?? "").toLowerCase();
  if (!f && !intervalo) return null;

  if (/semestr|semi.?annual|biannual|6.?month/.test(f)) return 6;
  if (/trimestr|quarter|3.?month/.test(f)) return 3;
  if (/bimestr|2.?month/.test(f)) return 2;
  if (/mensal|monthly|month/.test(f)) return intervalo && intervalo > 1 ? intervalo : 1;
  if (/anual|annual|yearly|year/.test(f)) return 12;

  if (intervalo && intervalo > 0 && intervalo <= 12) return intervalo;
  return null;
}

// A Kiwify manda valores em centavos na maioria dos campos, mas nem sempre.
function acharPorValor(planos: any[], valores: (number | null)[]) {
  for (const bruto of valores) {
    if (!bruto || bruto <= 0) continue;
    for (const reais of [bruto, bruto / 100]) {
      const p = planos.find((p) => Math.abs(Number(p.preco) - reais) < 0.01);
      if (p) return p;
    }
  }
  return null;
}

function acharPlano(
  planos: any[],
  dados: {
    planoId: string | null;
    produtoId: string | null;
    frequencia: string | null;
    intervalo: number | null;
    valores: (number | null)[];
    textos: (string | null)[];
  },
) {
  // 1. id do plano de assinatura
  if (dados.planoId) {
    const porPlano = planos.find((p) => p.kiwify_plan_id && p.kiwify_plan_id === dados.planoId);
    if (porPlano) return porPlano;
  }

  // 2. periodicidade
  const meses = mesesDaFrequencia(dados.frequencia, dados.intervalo);
  if (meses) {
    const porMeses = planos.find((p) => p.meses === meses);
    if (porMeses) return porMeses;
  }

  // 3. valor pago
  const porValor = acharPorValor(planos, dados.valores);
  if (porValor) return porValor;

  // 4. texto
  const texto = dados.textos.filter(Boolean).join(" ").toLowerCase();
  if (texto) {
    const porNomeCadastrado = planos.find(
      (p) => p.kiwify_product_name && texto.includes(String(p.kiwify_product_name).toLowerCase()),
    );
    if (porNomeCadastrado) return porNomeCadastrado;

    if (/semestr|6 meses/.test(texto)) return planos.find((p) => p.meses === 6) ?? null;
    if (/trimestr|3 meses/.test(texto)) return planos.find((p) => p.meses === 3) ?? null;
    if (/mensal|1 mes|1 mês/.test(texto)) return planos.find((p) => p.meses === 1) ?? null;
  }

  // 5. ultimo recurso: o mais curto, para nunca dar tempo a mais de graca
  return planos.find((p) => p.meses === 1) ?? null;
}

function numero(...valores: unknown[]) {
  const saida: (number | null)[] = [];
  for (const v of valores) {
    if (typeof v === "number" && isFinite(v)) saida.push(v);
    else if (typeof v === "string" && v.trim() && !isNaN(Number(v))) saida.push(Number(v));
  }
  return saida;
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

  // FECHA QUANDO NAO HA SEGREDO.
  //
  // Antes, sem o KIWIFY_WEBHOOK_TOKEN cadastrado, esta linha liberava
  // qualquer chamada. Quem descobrisse o endereco podia mandar um JSON com
  // o proprio e-mail e ganhar assinatura ativa de graca, sem pagar nada.
  //
  // Agora, sem segredo, nada e aceito. Se as assinaturas pararem de liberar
  // depois de um pagamento, e sinal de que o segredo nao esta cadastrado em
  // Supabase > Edge Functions > Secrets.
  const valida = token ? await assinaturaConfere(url, corpo, token) : false;

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
    const motivo = token
      ? "Assinatura do webhook inválida."
      : "KIWIFY_WEBHOOK_TOKEN não está cadastrado nos segredos da função. " +
        "Enquanto isso, nenhum evento é aceito — por segurança.";
    console.error("Webhook recusado:", motivo);
    return new Response(motivo, { status: 401 });
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
      .select("id,nome,preco,meses,kiwify_plan_id,kiwify_product_id,kiwify_product_name")
      .order("meses");

    const planoKiwify = assinaturaKiwify.plan ?? payload.plan ?? {};
    const comissoes = payload.Commissions ?? payload.commissions ?? {};

    const produtoNome = primeiro(
      produto.product_name,
      produto.name,
      payload.product_name,
    );

    const plano = acharPlano(planos ?? [], {
      planoId: primeiro(planoKiwify.id, assinaturaKiwify.plan_id, payload.plan_id),
      produtoId: primeiro(produto.product_id, produto.id, payload.product_id),
      frequencia: primeiro(
        planoKiwify.frequency,
        planoKiwify.name,
        assinaturaKiwify.charge_frequency,
        assinaturaKiwify.frequency,
      ),
      intervalo: numero(planoKiwify.interval, planoKiwify.qty_charges)[0] ?? null,
      valores: numero(
        comissoes.charge_amount,
        comissoes.product_base_price,
        assinaturaKiwify.charge_amount,
        payload.charge_amount,
      ),
      textos: [planoKiwify.name, produtoNome, payload.product_name as string],
    });

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

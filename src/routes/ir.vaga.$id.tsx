import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";
import { marcarEvento } from "@/lib/pixel";
import { linkWhatsApp, mensagemDaVaga, normalizarWhatsApp } from "@/lib/whatsapp";

/**
 * Página de redirecionamento para o WhatsApp da vaga.
 *
 * É o endereço que vai no anúncio da Meta. Ela existe para três coisas:
 *
 * 1. Esconder o número. O WhatsApp do cliente fica no banco, não no link —
 *    a Meta recebe só "/ir/vaga/123" e nunca vê o telefone de ninguém.
 * 2. Contar o clique. É aqui que o pixel dispara o evento Contact; se o
 *    botão fosse direto para o wa.me, a campanha não teria conversão nenhuma.
 * 3. Dar uma tela decente entre o anúncio e o WhatsApp, em vez do salto seco.
 *
 * Com ?teste=1 no fim ela mostra tudo mas não redireciona — serve para
 * conferir o link antes de gastar dinheiro com ele.
 */

/** Quanto a tela fica no ar antes de mandar para o WhatsApp.
 *  Não é enfeite: é o tempo que o pixel precisa para entregar o evento
 *  antes de o navegador sair da página. Abaixo de ~1,2s começa a perder
 *  conversão em celular ruim; acima de ~2,5s começa a perder gente. */
const TEMPO_ESPERA = 1800;

/**
 * Depois disso a tela desiste de esperar o banco e mostra a saída manual.
 *
 * Sem esse limite, internet ruim ou Supabase fora do ar deixavam a roda
 * girando para sempre — e quem está aqui veio de um anúncio pago. Ficar
 * preso numa tela de carregamento é o pior desfecho possível.
 */
const LIMITE_ESPERA = 6000;

export const Route = createFileRoute("/ir/vaga/$id")({
  component: RedirecionaVaga,
  head: () => ({
    meta: [
      // Página de passagem: não é conteúdo, não entra em buscador
      { name: "robots", content: "noindex, nofollow" },
      { title: `Vagas de emprego · ${SITE.nome}` },
    ],
  }),
});

function RedirecionaVaga() {
  const { id } = Route.useParams();
  const teste =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("teste") === "1";

  const { data: vaga, isLoading, isError } = useQuery({
    queryKey: ["vaga", "redirect", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("id,cargo,empresa,contato,status")
        .eq("id", Number(id))
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    retry: 0,
  });

  const numero = normalizarWhatsApp(vaga?.contato);
  const destino =
    vaga && numero ? linkWhatsApp(numero, mensagemDaVaga(vaga.cargo)) : null;

  const [progresso, setProgresso] = useState(0);
  const [quaseLa, setQuaseLa] = useState(false);
  const [mostrarBotao, setMostrarBotao] = useState(false);
  const [desistiu, setDesistiu] = useState(false);
  const jaDisparou = useRef(false);

  useEffect(() => {
    const relogio = window.setTimeout(() => setDesistiu(true), LIMITE_ESPERA);
    return () => window.clearTimeout(relogio);
  }, []);

  useEffect(() => {
    if (!destino || jaDisparou.current) return;
    jaDisparou.current = true;

    // O evento vai primeiro. Se o navegador sair antes disso, a campanha
    // perde a conversão e ninguém descobre.
    marcarEvento("Contact", {
      content_name: vaga?.cargo ?? "Vaga",
      content_category: vaga?.empresa ?? "",
      content_ids: [String(vaga?.id ?? id)],
    });

    const inicio = Date.now();
    const barra = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - inicio) / TEMPO_ESPERA) * 100);
      setProgresso(pct);
      if (pct >= 100) window.clearInterval(barra);
    }, 40);

    const meio = window.setTimeout(() => setQuaseLa(true), TEMPO_ESPERA * 0.5);

    // location.replace e não href: assim esta página não fica no histórico.
    // Com href, quem voltasse do WhatsApp cairia aqui de novo e seria
    // reenviado — um laço sem saída.
    const saida = window.setTimeout(() => {
      if (!teste) window.location.replace(destino);
      setMostrarBotao(true);
    }, TEMPO_ESPERA);

    // Se o aplicativo do WhatsApp não abrir, o botão manual aparece
    const socorro = window.setTimeout(() => setMostrarBotao(true), TEMPO_ESPERA + 1200);

    return () => {
      window.clearInterval(barra);
      window.clearTimeout(meio);
      window.clearTimeout(saida);
      window.clearTimeout(socorro);
    };
  }, [destino, teste, vaga, id]);

  const vagaSumiu = !isLoading && (isError || !vaga || vaga.status !== "aberta");
  const semNumero = !isLoading && !!vaga && vaga.status === "aberta" && !numero;
  const travou = desistiu && !destino;

  if (vagaSumiu || semNumero || travou) {
    const titulo = semNumero
      ? "Esta vaga não recebe contato por WhatsApp"
      : travou && isLoading
        ? "Não conseguimos abrir esta vaga agora"
        : "Esta vaga não está mais aberta";

    const texto = semNumero
      ? "Abra a vaga no painel para ver como se candidatar."
      : travou && isLoading
        ? "Pode ser a sua conexão. Tente de novo ou veja as outras vagas abertas."
        : "Ela pode ter sido preenchida. Veja as oportunidades abertas agora.";

    return (
      <TelaRedirect>
        <h1 className="redirect-titulo">{titulo}</h1>
        <p className="redirect-texto">{texto}</p>
        <Link to="/vagas" className="redirect-botao">
          Ver vagas abertas
        </Link>
      </TelaRedirect>
    );
  }

  return (
    <TelaRedirect>
      <p className="redirect-vaga">{vaga?.cargo ?? "Vagas de emprego"}</p>
      {vaga?.empresa && <p className="redirect-empresa">{vaga.empresa}</p>}

      <div className={`redirect-roda ${quaseLa ? "redirect-roda-zap" : ""}`} aria-hidden="true" />

      <p className="redirect-status" role="status" aria-live="polite">
        {quaseLa ? "Abrindo o WhatsApp…" : "Localizando a vaga…"}
      </p>

      <div className="redirect-barra">
        <div className="redirect-barra-cheia" style={{ width: `${progresso}%` }} />
      </div>

      {mostrarBotao && destino && (
        <a href={destino} className="redirect-zap">
          {teste ? "Modo teste · abrir o WhatsApp" : "Toque para abrir o WhatsApp"}
        </a>
      )}

      <p className="redirect-rodape">Você está sendo direcionado com segurança</p>
    </TelaRedirect>
  );
}

function TelaRedirect({ children }: { children: React.ReactNode }) {
  return (
    <div className="redirect-tela">
      <div className="redirect-cartao">
        <img src="/logo.png" alt={SITE.nome} className="redirect-logo" />
        {children}
      </div>
    </div>
  );
}

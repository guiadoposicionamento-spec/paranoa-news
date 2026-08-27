import { SITE } from "@/lib/site";

/**
 * Contato de WhatsApp e link de campanha.
 *
 * O botão da vaga não aponta mais direto para o wa.me. Ele passa por uma
 * página nossa (/ir/vaga/123) por dois motivos:
 *
 * 1. O número do cliente nunca entra no endereço. A Meta vê só o id da vaga,
 *    então dá para anunciar sem entregar o WhatsApp de ninguém para ela.
 * 2. É a página que dispara o evento de contato no pixel. Sem ela, o clique
 *    sai do site e a campanha não tem como saber que deu certo.
 */

/**
 * Deixa o telefone no formato que o WhatsApp aceita: 55 + DDD + número.
 * Devolve null quando o campo tem texto, e-mail ou telefone incompleto —
 * aí a vaga mostra o contato escrito, como já fazia.
 */
export function normalizarWhatsApp(bruto?: string | null): string | null {
  const n = (bruto ?? "").replace(/\D/g, "");
  if (!n) return null;
  // 10 = DDD + fixo, 11 = DDD + celular com o 9
  if (n.length === 10 || n.length === 11) return "55" + n;
  // Já veio com o código do país
  if ((n.length === 12 || n.length === 13) && n.startsWith("55")) return n;
  return null;
}

/** Endereço final do WhatsApp, com a mensagem já escrita para o candidato. */
export function linkWhatsApp(numero: string, mensagem: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Mensagem que já aparece digitada quando o WhatsApp abre.
 * Citar o cargo poupa a primeira pergunta do dono do comércio, que muitas
 * vezes tem mais de uma vaga aberta.
 */
export function mensagemDaVaga(cargo?: string | null) {
  return cargo
    ? `Olá! Vi a vaga de ${cargo} no ${SITE.nome} e tenho interesse.`
    : `Olá! Vi a vaga no ${SITE.nome} e tenho interesse.`;
}

/** Caminho interno da página de redirecionamento. */
export function caminhoDeCampanha(idVaga: number | string) {
  return `/ir/vaga/${idVaga}`;
}

/**
 * Endereço completo, para colar no anúncio da Meta.
 * Precisa ser absoluto: o gerenciador de anúncios não aceita caminho solto.
 */
export function linkDeCampanha(idVaga: number | string) {
  return `${SITE.url}${caminhoDeCampanha(idVaga)}`;
}

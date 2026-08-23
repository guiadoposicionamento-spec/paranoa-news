// Arruma o endereço que a redação digita no cadastro do banner.
//
// O comerciante manda o link do jeito que fala: "www.padaria.com.br",
// "instagram.com/padaria", "61 99999-9999". Se isso for direto para o
// atributo href, o navegador entende como um caminho DENTRO do portal e o
// clique no anúncio leva para uma página que não existe — o anunciante paga
// e ninguém chega na loja dele.
//
// Aqui cada caso vira um endereço completo antes de ser guardado.

/** Só estes esquemas podem sair daqui. */
const ESQUEMAS = /^(https?:|mailto:|tel:)/i;

export function normalizarLink(valor?: string | null): string | null {
  const bruto = (valor ?? "").trim();
  if (!bruto) return null;

  // Já veio completo
  if (ESQUEMAS.test(bruto)) return bruto;

  // Veio com outro protocolo qualquer (javascript:, data:, file:...).
  // Não tem endereço legítimo de anunciante nesse formato, então some.
  if (/^[a-z][a-z0-9+.-]*:/i.test(bruto)) return null;

  // "//site.com" — protocolo omitido
  if (bruto.startsWith("//")) return `https:${bruto}`;

  // E-mail
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bruto)) return `mailto:${bruto}`;

  // Telefone ou WhatsApp digitado só com números
  const soDigitos = bruto.replace(/[\s()\-.+]/g, "");
  if (/^\d{8,15}$/.test(soDigitos)) {
    const comPais = soDigitos.length <= 11 ? `55${soDigitos}` : soDigitos;
    return `https://wa.me/${comPais}`;
  }

  // Qualquer outra coisa que pareça um site
  return `https://${bruto.replace(/^\/+/, "")}`;
}

/** O que pode virar href numa página pública. */
export function linkSeguro(valor?: string | null): string | null {
  const pronto = normalizarLink(valor);
  if (!pronto) return null;
  return ESQUEMAS.test(pronto) ? pronto : null;
}

/** Versão curta para mostrar na lista do painel. */
export function linkLegivel(valor?: string | null, limite = 42) {
  const pronto = normalizarLink(valor);
  if (!pronto) return "";
  const curto = pronto.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return curto.length > limite ? curto.slice(0, limite) + "…" : curto;
}

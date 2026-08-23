export const CATEGORIAS: Record<string, { nome: string; cor: string }> = {
  "noticias":       { nome: "Notícias",       cor: "#E10600" },
  "denuncias":      { nome: "Denúncias",      cor: "#B91C1C" },
  "comercio-local": { nome: "Comércio Local", cor: "#059669" },
  "vagas":          { nome: "Vagas",          cor: "#2563EB" },
  "politica":       { nome: "Política",       cor: "#7C3AED" },
  "seguranca":      { nome: "Segurança",      cor: "#EA580C" },
  "cultura":        { nome: "Cultura",        cor: "#DB2777" },
  "esportes":       { nome: "Esportes",       cor: "#0891B2" },
};

// A editoria "vagas" fica fora do menu: quem procura emprego já tem o botão
// azul VAGAS no topo, que leva ao painel de vagas abertas. Ter os dois
// levando a lugares diferentes com o mesmo nome só confundia.
// A editoria continua existindo para matérias sobre emprego.
export const NAV_CATEGORIAS = Object.keys(CATEGORIAS).filter((slug) => slug !== "vagas");

export function corCategoria(slug: string) {
  return CATEGORIAS[slug]?.cor ?? "#E10600";
}

export function nomeCategoria(slug: string) {
  return CATEGORIAS[slug]?.nome ?? slug;
}

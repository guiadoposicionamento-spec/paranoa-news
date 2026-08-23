export const FOTO_VAGAS = "/vagas-capa.jpg";

export const SITE = {
  /** Endereço público. Usado nos links de compartilhamento e nas etiquetas de SEO. */
  url: "https://paranoanews.com.br",
  nome: "Paranoá News",
  descricao: "Informação local, todos os dias.",
  slogan:
    "Notícias, denúncias, comércio local e vagas de emprego no Paranoá, Itapoã, Paranoá Parque e Itapoã Parque.",
  email: "contato@paranoanews.com.br",
  whatsapp: "",
  instagram: "https://instagram.com/",
};

/**
 * As regiões que o portal cobre.
 *
 * Aparecem no texto da página inicial e nas etiquetas de busca. O Google só
 * associa o site a um lugar se o nome do lugar estiver escrito na página —
 * não basta a gente saber que cobre.
 */
export const REGIOES = [
  "Paranoá",
  "Itapoã",
  "Paranoá Parque",
  "Itapoã Parque",
  "Distrito Federal",
];

/** Frase de cobertura usada em títulos e descrições. */
export const COBERTURA = "Paranoá, Itapoã, Paranoá Parque e Itapoã Parque";

export function formatarData(valor?: string | null) {
  if (!valor) return "";
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatarDataCurta(valor?: string | null) {
  if (!valor) return "";
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

export function gerarSlug(titulo: string) {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

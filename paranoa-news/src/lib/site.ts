export const SITE = {
  nome: "Paranoá News",
  descricao: "Informação local, todos os dias.",
  slogan: "Notícias, denúncias, comércio local e vagas de emprego no Paranoá.",
  email: "contato@paranoanews.com.br",
  whatsapp: "",
  instagram: "https://instagram.com/",
};

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

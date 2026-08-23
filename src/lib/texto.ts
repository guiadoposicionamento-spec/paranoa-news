// Tratamento do texto das matérias.
//
// O conteúdo é guardado como HTML simples. Duas coisas acontecem aqui:
//
// 1. Matéria antiga (ou texto colado direto) que veio sem marcação nenhuma
//    é transformada em parágrafos, para não sair tudo grudado na tela.
// 2. Todo HTML passa por uma peneira antes de ir para a página. Só sobrevive
//    a marcação que o editor da redação sabe produzir. Isso evita que um
//    texto colado de outro site traga script, iframe ou estilo estranho.

/** Só estas etiquetas sobrevivem à peneira. */
const PERMITIDAS = new Set([
  "P", "BR", "STRONG", "B", "EM", "I", "U", "H2", "H3",
  "BLOCKQUOTE", "UL", "OL", "LI", "A", "FIGURE", "FIGCAPTION", "IMG",
]);

/**
 * Estas saem inteiras, com o conteúdo junto. Desenrolar um <script> deixaria
 * o código dele virar texto visível na matéria — e um <style> colado de outro
 * site despejaria regras de CSS no meio do texto.
 */
const REMOVER_COM_CONTEUDO = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "NOSCRIPT",
  "TEMPLATE", "LINK", "META", "SVG", "FORM", "INPUT", "BUTTON", "SELECT", "TEXTAREA",
]);

/** Atributos aceitos, por etiqueta. */
const ATRIBUTOS: Record<string, string[]> = {
  A: ["href"],
  IMG: ["src", "alt"],
};

const ESQUEMAS_SEGUROS = /^(https?:|mailto:|tel:|\/|#)/i;

function escapar(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** O texto já tem marcação de bloco? */
export function temMarcacao(html: string) {
  return /<(p|h2|h3|ul|ol|blockquote|figure|div)\b/i.test(html);
}

/**
 * Texto puro vira parágrafos: linha em branco separa parágrafo,
 * quebra simples vira quebra de linha dentro do mesmo parágrafo.
 */
export function textoParaHtml(texto: string) {
  return texto
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .map((bloco) => `<p>${escapar(bloco).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Remove tudo que não estiver na lista de permitidas. */
export function limparHtml(html: string): string {
  if (!html) return "";

  // Sem navegador (build/prerender) devolve o texto sem nenhuma etiqueta,
  // para nunca deixar passar marcação não conferida.
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return escapar(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  }

  const doc = new DOMParser().parseFromString(`<div id="raiz">${html}</div>`, "text/html");
  const raiz = doc.getElementById("raiz");
  if (!raiz) return "";

  const percorrer = (no: Element) => {
    for (const filho of Array.from(no.children)) {
      if (REMOVER_COM_CONTEUDO.has(filho.tagName)) {
        filho.remove();
        continue;
      }

      percorrer(filho);

      if (!PERMITIDAS.has(filho.tagName)) {
        // Mantém o texto de dentro, joga fora só a etiqueta
        filho.replaceWith(...Array.from(filho.childNodes));
        continue;
      }

      // O navegador produz <b> e <i>; o padrão da web hoje é <strong> e <em>,
      // que o leitor de tela e o Google entendem como ênfase de verdade.
      if (filho.tagName === "B" || filho.tagName === "I") {
        const novo = doc.createElement(filho.tagName === "B" ? "strong" : "em");
        novo.append(...Array.from(filho.childNodes));
        filho.replaceWith(novo);
        continue;
      }

      const aceitos = ATRIBUTOS[filho.tagName] ?? [];
      for (const attr of Array.from(filho.attributes)) {
        if (!aceitos.includes(attr.name.toLowerCase())) {
          filho.removeAttribute(attr.name);
        }
      }

      if (filho.tagName === "A") {
        const href = filho.getAttribute("href") ?? "";
        if (!ESQUEMAS_SEGUROS.test(href)) {
          filho.removeAttribute("href");
        } else {
          filho.setAttribute("target", "_blank");
          filho.setAttribute("rel", "noreferrer noopener");
        }
      }

      if (filho.tagName === "IMG") {
        const src = filho.getAttribute("src") ?? "";
        if (!ESQUEMAS_SEGUROS.test(src)) filho.remove();
      }
    }
  };

  percorrer(raiz);
  return raiz.innerHTML;
}

/** O que vai para a tela da matéria: parágrafos garantidos e HTML peneirado. */
export function prepararCorpo(conteudo?: string | null) {
  const bruto = (conteudo ?? "").trim();
  if (!bruto) return "";
  return limparHtml(temMarcacao(bruto) ? bruto : textoParaHtml(bruto));
}

/** Texto sem marcação, para resumo automático e para as etiquetas de compartilhamento. */
export function apenasTexto(html: string, limite = 200) {
  const texto = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (texto.length <= limite) return texto;
  return texto.slice(0, limite).replace(/\s+\S*$/, "") + "…";
}

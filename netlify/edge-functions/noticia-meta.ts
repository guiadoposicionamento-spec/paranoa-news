// Etiquetas de compartilhamento das matérias.
//
// O portal é um site que se monta no navegador. O robô do WhatsApp, do
// Facebook e do X não executa JavaScript: ele baixa o HTML cru e lê só o que
// estiver lá dentro. Sem esta função, todo link compartilhado sairia com o
// título e a imagem genéricos do portal, iguais para qualquer matéria.
//
// O que ela faz: intercepta /noticia/qualquer-coisa, busca a matéria no
// Supabase e escreve título, resumo e foto no <head> antes de entregar a
// página. Para o leitor de carne e osso nada muda — o site continua o mesmo.
//
// Se qualquer coisa der errado (Supabase fora do ar, matéria inexistente),
// a página original é entregue sem alteração. Nunca derruba o site.

import type { Config, Context } from "https://edge.netlify.com";

const TEMPO_LIMITE = 2500;

function escapar(texto: string) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function semEtiquetas(html: string, limite = 200) {
  const texto = String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite).replace(/\s+\S*$/, "") + "…";
}

export default async function (request: Request, context: Context) {
  const resposta = await context.next();

  const tipo = resposta.headers.get("content-type") ?? "";
  if (!tipo.includes("text/html")) return resposta;

  const url = new URL(request.url);
  const slug = decodeURIComponent(url.pathname.replace(/^\/noticia\//, "").replace(/\/$/, ""));
  if (!slug) return resposta;

  const base = Deno.env.get("VITE_SUPABASE_URL");
  const chave = Deno.env.get("VITE_SUPABASE_ANON_KEY");
  if (!base || !chave) return resposta;

  let noticia: any = null;
  try {
    const consulta =
      `${base}/rest/v1/noticias` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&status=eq.publicado` +
      `&select=titulo,resumo,conteudo,foto_capa,categoria,autor,data_publicacao` +
      `&limit=1`;

    const r = await fetch(consulta, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });
    if (!r.ok) return resposta;
    noticia = (await r.json())?.[0] ?? null;
  } catch {
    return resposta;
  }

  if (!noticia) return resposta;

  const titulo = noticia.titulo ?? "Paranoá News";
  const descricao = noticia.resumo?.trim() || semEtiquetas(noticia.conteudo ?? "");
  const imagem = noticia.foto_capa || `${url.origin}/og-image.jpg`;
  const endereco = `${url.origin}${url.pathname}`;

  const etiquetas = [
    `<title>${escapar(titulo)} | Paranoá News</title>`,
    `<meta name="description" content="${escapar(descricao)}">`,
    `<link rel="canonical" href="${escapar(endereco)}">`,
    `<meta property="og:site_name" content="Paranoá News">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${escapar(titulo)}">`,
    `<meta property="og:description" content="${escapar(descricao)}">`,
    `<meta property="og:url" content="${escapar(endereco)}">`,
    `<meta property="og:image" content="${escapar(imagem)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="675">`,
    `<meta property="og:image:alt" content="${escapar(titulo)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapar(titulo)}">`,
    `<meta name="twitter:description" content="${escapar(descricao)}">`,
    `<meta name="twitter:image" content="${escapar(imagem)}">`,
    noticia.autor ? `<meta property="article:author" content="${escapar(noticia.autor)}">` : "",
    noticia.categoria ? `<meta property="article:section" content="${escapar(noticia.categoria)}">` : "",
    noticia.data_publicacao
      ? `<meta property="article:published_time" content="${escapar(noticia.data_publicacao)}">`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  let html = await resposta.text();

  // Tira as etiquetas genéricas do portal para não ficarem duas de cada:
  // algumas redes leem a primeira que encontram.
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+[^>]*(property|name)=["'](og:[^"']+|twitter:[^"']+|description)["'][^>]*>/gi, "")
    .replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi, "");

  html = html.replace(/<head([^>]*)>/i, `<head$1>\n    ${etiquetas}`);

  return new Response(html, {
    status: resposta.status,
    headers: {
      ...Object.fromEntries(resposta.headers),
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

export const config: Config = {
  path: "/noticia/*",
};

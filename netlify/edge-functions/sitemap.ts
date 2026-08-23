// Mapa do site para o Google.
//
// Duas saídas na mesma função:
//   /sitemap.xml          — todas as páginas e todas as matérias publicadas
//   /sitemap-noticias.xml — só o que saiu nas últimas 48 horas, no formato
//                           que o Google Notícias lê
//
// É gerado na hora, a partir do banco. Um arquivo fixo ficaria velho no dia
// seguinte à primeira matéria nova.

import type { Config, Context } from "https://edge.netlify.com";

const CATEGORIAS = [
  "noticias",
  "denuncias",
  "comercio-local",
  "vagas",
  "politica",
  "seguranca",
  "cultura",
  "esportes",
];

const PAGINAS = [
  { caminho: "/", prioridade: "1.0", frequencia: "hourly" },
  { caminho: "/vagas", prioridade: "0.9", frequencia: "daily" },
  { caminho: "/denuncie", prioridade: "0.7", frequencia: "monthly" },
  { caminho: "/anuncie", prioridade: "0.7", frequencia: "monthly" },
];

function escapar(t: string) {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function buscarNoticias(base: string, chave: string, desde?: string) {
  const filtro = desde ? `&data_publicacao=gte.${desde}` : "";
  const url =
    `${base}/rest/v1/noticias?status=eq.publicado${filtro}` +
    `&select=slug,titulo,data_publicacao,foto_capa` +
    `&order=data_publicacao.desc&limit=1000`;

  const r = await fetch(url, {
    headers: { apikey: chave, Authorization: `Bearer ${chave}` },
    signal: AbortSignal.timeout(4000),
  });
  if (!r.ok) return [];
  return (await r.json()) as any[];
}

export default async function (request: Request, context: Context) {
  const url = new URL(request.url);
  const origem = url.origin;
  const base = Deno.env.get("VITE_SUPABASE_URL");
  const chave = Deno.env.get("VITE_SUPABASE_ANON_KEY");

  if (!base || !chave) return context.next();

  const soNoticias = url.pathname.includes("noticias");

  try {
    if (soNoticias) {
      const doisDias = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const noticias = await buscarNoticias(base, chave, doisDias);

      const itens = noticias
        .map(
          (n) => `  <url>
    <loc>${origem}/noticia/${escapar(n.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>Paranoá News</news:name>
        <news:language>pt</news:language>
      </news:publication>
      <news:publication_date>${escapar(n.data_publicacao)}</news:publication_date>
      <news:title>${escapar(n.titulo)}</news:title>
    </news:news>
  </url>`,
        )
        .join("\n");

      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${itens}
</urlset>`);
    }

    const noticias = await buscarNoticias(base, chave);
    const maisRecente = noticias[0]?.data_publicacao ?? new Date().toISOString();

    const fixas = PAGINAS.map(
      (p) => `  <url>
    <loc>${origem}${p.caminho}</loc>
    <lastmod>${escapar(maisRecente)}</lastmod>
    <changefreq>${p.frequencia}</changefreq>
    <priority>${p.prioridade}</priority>
  </url>`,
    ).join("\n");

    const editorias = CATEGORIAS.map(
      (c) => `  <url>
    <loc>${origem}/categoria/${c}</loc>
    <lastmod>${escapar(maisRecente)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
    ).join("\n");

    const materias = noticias
      .map((n) => {
        const imagem = n.foto_capa
          ? `
    <image:image>
      <image:loc>${escapar(n.foto_capa)}</image:loc>
      <image:title>${escapar(n.titulo)}</image:title>
    </image:image>`
          : "";
        return `  <url>
    <loc>${origem}/noticia/${escapar(n.slug)}</loc>
    <lastmod>${escapar(n.data_publicacao)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${imagem}
  </url>`;
      })
      .join("\n");

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${fixas}
${editorias}
${materias}
</urlset>`);
  } catch {
    return context.next();
  }
}

function xml(corpo: string) {
  return new Response(corpo, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}

export const config: Config = {
  path: ["/sitemap.xml", "/sitemap-noticias.xml"],
};

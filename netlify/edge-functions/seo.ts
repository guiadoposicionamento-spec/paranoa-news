// SEO do Paranoá News.
//
// O portal se monta no navegador. Quem chega pelo Google recebe primeiro o
// HTML cru — e até agora esse HTML vinha vazio: sem título próprio da página,
// sem descrição, sem um único link para as matérias. Para um site novo, sem
// histórico, isso é o pior cenário possível.
//
// Esta função roda no servidor do Netlify, antes de a página sair, e escreve
// no HTML:
//
//   1. título e descrição próprios de cada página, com os nomes das regiões
//   2. endereço oficial (canonical), para o Google não achar que /noticia/x
//      e /noticia/x/ são duas páginas diferentes
//   3. os dados estruturados que o Google usa para montar o resultado rico
//      (nome do veículo, autor, data, foto)
//   4. dentro de <noscript>, as manchetes com link — assim o buscador tem
//      caminho para chegar em toda matéria mesmo sem executar JavaScript
//
// Nada disso muda o que o leitor vê. Se o banco falhar, a página sai como
// estava; a função nunca derruba o site.

import type { Config, Context } from "https://edge.netlify.com";

const NOME = "Paranoá News";
const COBERTURA = "Paranoá, Itapoã, Paranoá Parque e Itapoã Parque";
const TEMPO_LIMITE = 3000;

const CATEGORIAS: Record<string, string> = {
  noticias: "Notícias",
  denuncias: "Denúncias",
  "comercio-local": "Comércio Local",
  vagas: "Vagas",
  politica: "Política",
  seguranca: "Segurança",
  cultura: "Cultura",
  esportes: "Esportes",
};

function escapar(t: unknown) {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function semEtiquetas(html: unknown, limite = 200) {
  const texto = String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite).replace(/\s+\S*$/, "") + "…";
}

async function doBanco(caminho: string) {
  const base = Deno.env.get("VITE_SUPABASE_URL");
  const chave = Deno.env.get("VITE_SUPABASE_ANON_KEY");
  if (!base || !chave) return null;

  const r = await fetch(`${base}/rest/v1/${caminho}`, {
    headers: { apikey: chave, Authorization: `Bearer ${chave}` },
    signal: AbortSignal.timeout(TEMPO_LIMITE),
  });
  if (!r.ok) return null;
  return await r.json();
}

interface Pagina {
  titulo: string;
  descricao: string;
  imagem?: string;
  tipo: "website" | "article";
  jsonLd: unknown[];
  listaHtml?: string;
  publicado?: string;
  autor?: string;
  secao?: string;
  /** Página sem conteúdo próprio: fica fora do índice do Google. */
  naoIndexar?: boolean;
}

/** Manchetes com link, para o buscador ter por onde andar. */
function listaDeLinks(titulo: string, itens: { href: string; texto: string }[]) {
  if (!itens.length) return "";
  const li = itens
    .map((i) => `<li><a href="${escapar(i.href)}">${escapar(i.texto)}</a></li>`)
    .join("");
  return `<noscript><nav aria-label="${escapar(titulo)}"><h2>${escapar(titulo)}</h2><ul>${li}</ul></nav></noscript>`;
}

function organizacao(origem: string) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: NOME,
    url: origem,
    logo: { "@type": "ImageObject", url: `${origem}/logo.png` },
    description: `Portal de notícias do ${COBERTURA}, no Distrito Federal.`,
    areaServed: [
      "Paranoá",
      "Itapoã",
      "Paranoá Parque",
      "Itapoã Parque",
      "Distrito Federal",
      "Brasília",
    ].map((n) => ({ "@type": "Place", name: n })),
  };
}

async function montarPagina(url: URL): Promise<Pagina | null> {
  const origem = url.origin;
  const caminho = url.pathname.replace(/\/+$/, "") || "/";

  // ---------- Matéria ----------
  if (caminho.startsWith("/noticia/")) {
    const slug = decodeURIComponent(caminho.replace("/noticia/", ""));
    if (!slug) return null;

    const dados = await doBanco(
      `noticias?slug=eq.${encodeURIComponent(slug)}&status=eq.publicado` +
        `&select=titulo,resumo,conteudo,foto_capa,foto_credito,categoria,autor,data_publicacao&limit=1`,
    );
    const n = dados?.[0];

    // Endereço de matéria que não existe (ou virou rascunho) não pode entrar
    // no índice do Google como página vazia.
    if (!n) {
      return {
        titulo: "Matéria não encontrada",
        descricao: "Esta matéria não existe ou foi removida do portal.",
        tipo: "website",
        jsonLd: [],
        naoIndexar: true,
      };
    }

    const descricao = n.resumo?.trim() || semEtiquetas(n.conteudo);
    const imagem = n.foto_capa || `${origem}/og-image.jpg`;
    const endereco = `${origem}${caminho}`;

    return {
      titulo: n.titulo,
      descricao,
      imagem,
      tipo: "article",
      publicado: n.data_publicacao,
      autor: n.autor,
      secao: CATEGORIAS[n.categoria] ?? n.categoria,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: n.titulo,
          description: descricao,
          image: [imagem],
          datePublished: n.data_publicacao,
          dateModified: n.data_publicacao,
          articleSection: CATEGORIAS[n.categoria] ?? n.categoria,
          inLanguage: "pt-BR",
          mainEntityOfPage: { "@type": "WebPage", "@id": endereco },
          author: { "@type": "Person", name: n.autor || "Redação" },
          publisher: organizacao(origem),
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: origem },
            {
              "@type": "ListItem",
              position: 2,
              name: CATEGORIAS[n.categoria] ?? n.categoria,
              item: `${origem}/categoria/${n.categoria}`,
            },
            { "@type": "ListItem", position: 3, name: n.titulo, item: endereco },
          ],
        },
      ],
    };
  }

  // ---------- Editoria ----------
  if (caminho.startsWith("/categoria/")) {
    const slug = decodeURIComponent(caminho.replace("/categoria/", ""));
    const nome = CATEGORIAS[slug];
    if (!nome) return null;

    const lista = await doBanco(
      `noticias?status=eq.publicado&categoria=eq.${encodeURIComponent(slug)}` +
        `&select=slug,titulo&order=data_publicacao.desc&limit=30`,
    );

    return {
      titulo: `${nome} do Paranoá e Itapoã`,
      descricao: `${nome} do ${COBERTURA}. Acompanhe no ${NOME}, o portal de quem mora na região.`,
      tipo: "website",
      jsonLd: [organizacao(origem)],
      listaHtml: listaDeLinks(
        `${nome} — últimas`,
        (lista ?? []).map((n: any) => ({ href: `/noticia/${n.slug}`, texto: n.titulo })),
      ),
    };
  }

  // ---------- Vagas ----------
  if (caminho === "/vagas") {
    const vagas = await doBanco(
      `vagas?status=eq.aberta&select=id,cargo,empresa,local&order=created_at.desc&limit=50`,
    );
    const quantas = (vagas ?? []).length;

    return {
      titulo:
        `Vagas de emprego no Paranoá e Itapoã` +
        (quantas ? ` — ${quantas} ${quantas === 1 ? "aberta" : "abertas"}` : ""),
      descricao:
        `Vagas de emprego abertas no ${COBERTURA}. Oportunidades publicadas por empresas ` +
        `e comércios da região, com contato direto para o candidato.`,
      tipo: "website",
      jsonLd: [organizacao(origem)],
      listaHtml: listaDeLinks(
        "Vagas abertas",
        (vagas ?? [])
          .slice(0, 30)
          .map((v: any) => ({
            href: "/vagas",
            texto: `${v.cargo} — ${v.empresa}${v.local ? ` (${v.local})` : ""}`,
          })),
      ),
    };
  }

  // ---------- Denúncias ----------
  if (caminho === "/denuncie") {
    return {
      titulo: "Faça sua denúncia — buraco, lixo, falta de água e luz",
      descricao:
        `Registre um problema do seu bairro no ${COBERTURA}: buraco na via, lixo acumulado, ` +
        `falta de água, iluminação queimada. A redação apura e cobra resposta.`,
      tipo: "website",
      jsonLd: [organizacao(origem)],
    };
  }

  // ---------- Anuncie ----------
  if (caminho === "/anuncie") {
    return {
      titulo: "Anuncie sua vaga e sua marca no Paranoá",
      descricao:
        `Divulgue vagas de emprego e anuncie seu comércio para quem mora no ${COBERTURA}. ` +
        `Planos mensal, trimestral e semestral.`,
      tipo: "website",
      jsonLd: [organizacao(origem)],
    };
  }

  // ---------- Página inicial ----------
  if (caminho === "/") {
    const noticias = await doBanco(
      `noticias?status=eq.publicado&select=slug,titulo,resumo,data_publicacao,foto_capa` +
        `&order=data_publicacao.desc&limit=20`,
    );

    const itens = (noticias ?? []).map((n: any, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${origem}/noticia/${n.slug}`,
      name: n.titulo,
    }));

    return {
      titulo: `${NOME} — Notícias do ${COBERTURA}`,
      descricao:
        `Portal de notícias do Paranoá e do Itapoã, no Distrito Federal. Denúncias da ` +
        `população, comércio local e vagas de emprego, atualizados todos os dias.`,
      imagem: `${origem}/og-image.jpg`,
      tipo: "website",
      jsonLd: [
        organizacao(origem),
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: NOME,
          url: origem,
          inLanguage: "pt-BR",
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${origem}/vagas?busca={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        },
        ...(itens.length
          ? [{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: itens }]
          : []),
      ],
      listaHtml: listaDeLinks(
        "Últimas notícias",
        (noticias ?? []).map((n: any) => ({ href: `/noticia/${n.slug}`, texto: n.titulo })),
      ),
    };
  }

  return null;
}

export default async function (request: Request, context: Context) {
  const resposta = await context.next();

  const tipo = resposta.headers.get("content-type") ?? "";
  if (!tipo.includes("text/html")) return resposta;

  const url = new URL(request.url);

  let pagina: Pagina | null = null;
  try {
    pagina = await montarPagina(url);
  } catch {
    return resposta;
  }
  if (!pagina) return resposta;

  const endereco = `${url.origin}${url.pathname.replace(/\/+$/, "") || "/"}`;
  const tituloCompleto =
    pagina.titulo.includes(NOME) ? pagina.titulo : `${pagina.titulo} | ${NOME}`;
  const imagem = pagina.imagem || `${url.origin}/og-image.jpg`;

  const etiquetas = [
    `<title>${escapar(tituloCompleto)}</title>`,
    `<meta name="description" content="${escapar(pagina.descricao)}">`,
    `<link rel="canonical" href="${escapar(endereco)}">`,
    pagina.naoIndexar
      ? `<meta name="robots" content="noindex, follow">`
      : `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
    `<meta property="og:site_name" content="${NOME}">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:type" content="${pagina.tipo}">`,
    `<meta property="og:title" content="${escapar(tituloCompleto)}">`,
    `<meta property="og:description" content="${escapar(pagina.descricao)}">`,
    `<meta property="og:url" content="${escapar(endereco)}">`,
    `<meta property="og:image" content="${escapar(imagem)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="675">`,
    `<meta property="og:image:alt" content="${escapar(pagina.titulo)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapar(tituloCompleto)}">`,
    `<meta name="twitter:description" content="${escapar(pagina.descricao)}">`,
    `<meta name="twitter:image" content="${escapar(imagem)}">`,
    `<meta name="geo.region" content="BR-DF">`,
    `<meta name="geo.placename" content="Paranoá, Brasília, Distrito Federal">`,
    pagina.publicado
      ? `<meta property="article:published_time" content="${escapar(pagina.publicado)}">`
      : "",
    pagina.autor ? `<meta property="article:author" content="${escapar(pagina.autor)}">` : "",
    pagina.secao ? `<meta property="article:section" content="${escapar(pagina.secao)}">` : "",
    ...pagina.jsonLd.map(
      (j) =>
        `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`,
    ),
  ]
    .filter(Boolean)
    .join("\n    ");

  let html = await resposta.text();

  // Tira as etiquetas genéricas para não ficarem duas de cada — algumas
  // redes e buscadores leem a primeira que encontram.
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(
      /<meta\s+[^>]*(property|name)=["'](og:[^"']+|twitter:[^"']+|description|robots)["'][^>]*>/gi,
      "",
    )
    .replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi, "");

  html = html.replace(/<head([^>]*)>/i, `<head$1>\n    ${etiquetas}`);

  if (pagina.listaHtml) {
    html = html.replace(/<body([^>]*)>/i, `<body$1>\n${pagina.listaHtml}`);
  }

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
  path: ["/", "/vagas", "/denuncie", "/anuncie", "/noticia/*", "/categoria/*"],
};

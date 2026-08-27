import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { SITE } from "@/lib/site";
import { SCRIPT_PIXEL, IMAGEM_SEM_SCRIPT } from "@/lib/pixel";
import { PixelDeRota } from "@/components/PixelDeRota";
import css from "../index.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${SITE.nome} | ${SITE.descricao}` },
      { name: "description", content: SITE.slogan },
      { property: "og:title", content: SITE.nome },
      { property: "og:description", content: SITE.slogan },
      { property: "og:url", content: SITE.url },
      { property: "og:image", content: `${SITE.url}/og-image.jpg` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#E10600" },
    ],
    links: [
      { rel: "stylesheet", href: css },
      { rel: "icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
  component: () => (
    <>
      <PixelDeRota />
      <Outlet />
    </>
  ),
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />

        {/* Pixel da Meta.
            Fica no <head> e antes do React de propósito: assim ele já está
            carregando enquanto o site monta, e nenhuma visita se perde com
            quem abre e fecha rápido. O PageView em si não sai daqui — quem
            conta é o PixelDeRota, porque aqui a página nunca recarrega. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PIXEL }} />
      </head>
      <body>
        {/* Para quem navega com JavaScript desligado */}
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={IMAGEM_SEM_SCRIPT} alt="" />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-brand-dark text-white px-6 text-center">
      <img src="/logo.png" alt={SITE.nome} className="h-16 w-auto" />
      <h1 className="text-4xl font-black">Página não encontrada</h1>
      <p className="text-white/70">O endereço que você acessou não existe ou foi removido.</p>
      <a href="/" className="bg-brand-primary text-white font-bold px-5 py-2.5 rounded">
        Voltar para a home
      </a>
    </div>
  );
}

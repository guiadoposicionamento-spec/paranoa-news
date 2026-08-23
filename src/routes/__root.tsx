import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { SITE } from "@/lib/site";
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
      { property: "og:image", content: "/og-image.jpg" },
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
  component: () => <Outlet />,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
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

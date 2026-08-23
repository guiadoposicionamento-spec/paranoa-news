import { Link } from "@tanstack/react-router";
import { CATEGORIAS, NAV_CATEGORIAS } from "@/lib/categorias";
import { SITE } from "@/lib/site";
import { Faixa } from "@/components/Faixa";

// O rodapé entrega a segunda aparição da faixa, depois do conteúdo da página.
export function Footer() {
  return (
    <>
    <Faixa posicao="rodape" />

    <footer className="bg-brand-ink text-white mt-20">
      <div className="h-[3px] bg-brand-primary" />

      <div className="container-portal py-12">
        <div className="grid md:grid-cols-[1.3fr_1fr_1fr] gap-10">
          <div>
            <img src="/logo.png" alt={SITE.nome} className="h-12 w-auto" />
            <p className="text-sm text-white/50 mt-4 max-w-xs leading-relaxed">{SITE.slogan}</p>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/40 mb-4">
              Editorias
            </p>
            <nav className="flex flex-col gap-2.5">
              {NAV_CATEGORIAS.map((slug) => (
                <Link
                  key={slug}
                  to="/categoria/$categoria"
                  params={{ categoria: slug }}
                  className="text-sm text-white/70 hover:text-white transition"
                >
                  {CATEGORIAS[slug].nome}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/40 mb-4">
              Serviços
            </p>
            <nav className="flex flex-col gap-2.5">
              <Link to="/denuncie" className="text-sm text-white/70 hover:text-white transition">
                Canal de denúncias
              </Link>
              <Link to="/vagas" className="text-sm text-white/70 hover:text-white transition">
                Painel de vagas
              </Link>
              <Link to="/anuncie" className="text-sm text-white/70 hover:text-white transition">
                Anuncie sua vaga
              </Link>
              <Link to="/auth" className="text-sm text-white/40 hover:text-white/70 transition">
                Área da redação
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} {SITE.nome}. Todos os direitos reservados.
          </p>
          <p className="text-xs text-white/40">{SITE.email}</p>
        </div>
      </div>
    </footer>
    </>
  );
}

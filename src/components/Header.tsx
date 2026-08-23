import { Link } from "@tanstack/react-router";
import { Menu, X, Megaphone, Briefcase, Store } from "lucide-react";
import { useState } from "react";
import { CATEGORIAS, NAV_CATEGORIAS } from "@/lib/categorias";
import { SITE } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);

  const navItem =
    "relative px-3 py-3 text-[13px] font-bold uppercase tracking-wide text-white/70 hover:text-white transition whitespace-nowrap";
  const navAtivo = "text-white after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[3px] after:bg-brand-primary";

  return (
    <header className="sticky top-0 z-50 bg-brand-ink">
      <div className="h-[3px] bg-brand-primary" />

      <div className="container-portal">
        <div className="flex items-center justify-between gap-4 py-4">
          <button
            className="md:hidden p-1 text-white shrink-0"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt={SITE.nome} className="h-11 md:h-14 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/denuncie"
              className="flex items-center gap-1.5 text-white/80 hover:text-white px-3 py-2 text-xs font-bold uppercase tracking-wide transition"
            >
              <Megaphone size={15} /> Denuncie
            </Link>
            <Link
              to="/vagas"
              className="flex items-center gap-1.5 text-white/80 hover:text-white px-3 py-2 text-xs font-bold uppercase tracking-wide transition"
            >
              <Briefcase size={15} /> Vagas
            </Link>
            <Link
              to="/anuncie"
              className="botao-vermelho flex items-center gap-1.5 px-4 py-2.5 text-xs uppercase tracking-wide"
            >
              <Store size={15} /> Anuncie
            </Link>
          </div>

          <div className="w-8 md:hidden" />
        </div>
      </div>

      <div className="hidden md:block border-t border-white/10">
        <div className="container-portal">
          <nav className="flex items-center gap-0 overflow-x-auto -mx-3">
            <Link to="/" className={navItem} activeOptions={{ exact: true }} activeProps={{ className: navAtivo }}>
              Início
            </Link>
            {NAV_CATEGORIAS.map((slug) => (
              <Link
                key={slug}
                to="/categoria/$categoria"
                params={{ categoria: slug }}
                className={navItem}
                activeProps={{ className: navAtivo }}
              >
                {CATEGORIAS[slug].nome}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10">
          <nav className="container-portal flex flex-col py-3">
            <Link to="/" onClick={() => setOpen(false)} className="py-2.5 text-sm font-bold uppercase text-white/80">
              Início
            </Link>
            {NAV_CATEGORIAS.map((slug) => (
              <Link
                key={slug}
                to="/categoria/$categoria"
                params={{ categoria: slug }}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm font-bold uppercase text-white/80"
              >
                {CATEGORIAS[slug].nome}
              </Link>
            ))}

            <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/10">
              <div className="flex gap-2">
                <Link
                  to="/denuncie"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center border border-white/20 text-white py-2.5 rounded-lg text-xs font-bold uppercase"
                >
                  Denuncie
                </Link>
                <Link
                  to="/vagas"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center border border-white/20 text-white py-2.5 rounded-lg text-xs font-bold uppercase"
                >
                  Vagas
                </Link>
              </div>
              <Link
                to="/anuncie"
                onClick={() => setOpen(false)}
                className="botao-vermelho text-center py-2.5 text-xs uppercase"
              >
                Anuncie sua vaga
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

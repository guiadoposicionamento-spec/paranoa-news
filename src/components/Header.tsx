import { Link } from "@tanstack/react-router";
import { Menu, X, Megaphone, Briefcase, Store, ChevronDown, Search } from "lucide-react";
import { useRef, useState } from "react";
import { CATEGORIAS, NAV_CATEGORIAS } from "@/lib/categorias";
import { SITE } from "@/lib/site";
import { Faixa } from "@/components/Faixa";
import { FaixaCidades } from "@/components/FaixaCidades";

/**
 * O cabeçalho também entrega a faixa de publicidade do topo. Como todas as
 * páginas públicas usam Header e Footer, a faixa passa a aparecer no site
 * inteiro sem precisar ser repetida rota por rota — e continua fora do painel
 * administrativo, que não usa nenhum dos dois.
 *
 * A faixa fica FORA do <header>, senão herdaria o sticky e ocuparia tela o
 * tempo todo. Assim ela rola junto com a página e só o menu gruda no topo.
 */
export function Header() {
  const [open, setOpen] = useState(false);

  const navItem =
    "relative px-3 py-3 text-[13px] font-bold uppercase tracking-wide text-white/70 hover:text-white transition whitespace-nowrap";
  const navAtivo = "text-white after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[3px] after:bg-brand-primary";

  return (
    <>
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
            <Link to="/denuncie" className="botao-topo botao-topo-vermelho">
              <Megaphone size={15} /> Denuncie
            </Link>
            <MenuVagas />
          </div>

          <div className="w-8 md:hidden" />
        </div>
      </div>

      {/* Entre o logo e as editorias, no computador e no celular */}
      <FaixaCidades />

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

            {/* No celular não existe passar o mouse, então as duas opções de
                vaga aparecem abertas, sem menu. */}
            <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/10">
              <Link
                to="/denuncie"
                onClick={() => setOpen(false)}
                className="botao-topo botao-topo-vermelho w-full py-3"
              >
                <Megaphone size={15} /> Denuncie
              </Link>
              <Link
                to="/vagas"
                onClick={() => setOpen(false)}
                className="botao-topo botao-topo-azul w-full py-3"
              >
                <Search size={15} /> Ver vagas
              </Link>
              <Link
                to="/anuncie"
                onClick={() => setOpen(false)}
                className="botao-topo botao-topo-verde w-full py-3"
              >
                <Store size={15} /> Anuncie sua vaga
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>

    <Faixa posicao="topo" />
    </>
  );
}

/**
 * Botão Vagas com menu de duas opções.
 *
 * As duas ações de vaga viviam em botões separados no topo, e ninguém
 * entendia direito a diferença entre "Vagas" e "Anuncie". Agora quem procura
 * emprego e quem quer contratar entram pelo mesmo lugar e escolhem lá dentro.
 *
 * Abre ao passar o mouse, mas também ao clicar — no notebook com tela de
 * toque e no tablet não existe "passar o mouse". E fecha com Esc ou quando
 * o foco sai, para quem navega pelo teclado.
 */
function MenuVagas() {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={caixa}
      className="relative"
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
      onFocus={() => setAberto(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setAberto(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setAberto(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => {
          // No computador o mouse já abriu o menu antes do clique chegar.
          // Se o clique alternasse, ele fecharia na hora — e no celular,
          // onde o toque dispara "entrou o mouse" e "clicou" em sequência,
          // o menu abriria e fecharia sozinho. Então: onde existe mouse o
          // clique só abre; onde não existe, ele alterna.
          const temMouse = window.matchMedia("(hover: hover)").matches;
          setAberto((v) => (temMouse ? true : !v));
        }}
        className="botao-topo botao-topo-azul"
      >
        <Briefcase size={15} /> Vagas
        <ChevronDown size={14} className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {/* O painel fica sempre montado e só troca de estado. Com transição em
          vez de montar/desmontar, o menu pode ser interrompido no meio: abrir,
          fechar e abrir de novo não reinicia a animação do zero. */}
      <div className={`menu-vagas ${aberto ? "menu-vagas-aberto" : ""}`} role="menu" aria-hidden={!aberto}>
          <Link to="/vagas" role="menuitem" className="menu-vagas-item" tabIndex={aberto ? 0 : -1} onClick={() => setAberto(false)}>
            <Search size={15} className="text-white/50" />
            <span>
              Ver vagas
              <small>Oportunidades abertas na região</small>
            </span>
          </Link>

          <Link
            to="/anuncie"
            role="menuitem"
            className="menu-vagas-item menu-vagas-item-destaque"
            tabIndex={aberto ? 0 : -1}
            onClick={() => setAberto(false)}
          >
            <Store size={15} />
            <span>
              Anuncie sua vaga
              <small>Para empresas e comércios</small>
            </span>
          </Link>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Briefcase, Store, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticiaCard, NoticiaDestaque, NoticiaLinha, type Noticia } from "@/components/NoticiaCard";
import { Banners } from "@/components/Banners";
import { supabase } from "@/integrations/supabase/client";
import { formatarDataCurta, TITULO_HOME } from "@/lib/site";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const { data: noticias = [], isLoading } = useQuery({
    queryKey: ["noticias", "home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noticias")
        .select("*")
        .eq("status", "publicado")
        .order("data_publicacao", { ascending: false })
        .limit(21);
      if (error) throw error;
      return (data ?? []) as Noticia[];
    },
  });

  const { data: vagas = [] } = useQuery({
    queryKey: ["vagas", "home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vagas")
        .select("id,cargo,empresa,local,created_at")
        .eq("status", "aberta")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const destaque = noticias[0];
  const secundarias = noticias.slice(1, 4);
  const restante = noticias.slice(4);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container-portal py-8 md:py-10">
        {/* Título principal da página inicial.
            O texto curto é o que o leitor vê. A lista completa das regiões
            continua sendo dita ao Google — na faixa vermelha do topo e nas
            etiquetas montadas pela função de borda (netlify/edge-functions),
            que é de onde o buscador tira o título do resultado. */}
        <header className="mb-8 md:mb-10">
          <h1 className="titulo-secao text-xl md:text-2xl text-gray-900">
            {TITULO_HOME}
          </h1>
          <p className="text-sm md:text-[15px] text-gray-500 mt-1.5 max-w-2xl leading-relaxed">
            O que acontece na sua região todos os dias: reportagens, denúncias da população,
            comércio local e vagas de emprego abertas.
          </p>
        </header>

        {isLoading ? (
          <SkeletonHome />
        ) : noticias.length === 0 ? (
          <EstadoVazio />
        ) : (
          <>
            <section className="grid lg:grid-cols-[2fr_1fr] gap-6 mb-14">
              <div>{destaque && <NoticiaDestaque noticia={destaque} />}</div>
              <div>
                <p className="cartola mb-4">Últimas notícias</p>
                <div className="cartao p-5">
                  {secundarias.map((n) => <NoticiaLinha key={n.id} noticia={n} />)}
                  {secundarias.length === 0 && (
                    <p className="text-sm text-gray-400 py-4">Sem outras publicações ainda.</p>
                  )}
                </div>
              </div>
            </section>

            {restante.length > 0 && (
              <section className="mb-14">
                <p className="cartola mb-5">Mais do Paranoá</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {restante.map((n) => <NoticiaCard key={n.id} noticia={n} />)}
                </div>
              </section>
            )}
          </>
        )}

        <div className="mt-14 mb-14">
          <Banners />
        </div>

        <AtalhosServicos />

        {vagas.length > 0 && (
          <section className="mt-14 cartao p-7">
            <div className="flex items-center justify-between mb-2 gap-4">
              <p className="cartola">Vagas abertas</p>
              <Link to="/vagas" className="text-xs font-bold text-brand-primary flex items-center gap-1 shrink-0">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {(vagas as any[]).map((v) => (
                <li key={v.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900 text-sm tracking-tight">{v.cargo}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {v.empresa}{v.local ? ` · ${v.local}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] uppercase font-semibold text-gray-400 shrink-0">
                    {formatarDataCurta(v.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

function AtalhosServicos() {
  const itens = [
    {
      to: "/denuncie" as const,
      icone: <Megaphone size={20} />,
      titulo: "Faça sua denúncia",
      texto: "Buraco na rua, falta de água, iluminação. A população fala, o portal cobra.",
    },
    {
      to: "/vagas" as const,
      icone: <Briefcase size={20} />,
      titulo: "Vagas de emprego",
      texto: "Oportunidades do Paranoá e região atualizadas pela redação.",
    },
    {
      to: "/categoria/$categoria" as const,
      params: { categoria: "comercio-local" },
      icone: <Store size={20} />,
      titulo: "Comércio local",
      texto: "Conheça e prestigie quem gera renda aqui na nossa cidade.",
    },
  ];

  return (
    <section className="grid sm:grid-cols-3 gap-4">
      {itens.map((item) => (
        <Link
          key={item.titulo}
          to={item.to}
          params={item.params as never}
          className="group cartao p-6 flex flex-col gap-2.5 hover:border-gray-300 transition"
        >
          <span className="w-10 h-10 rounded-lg bg-brand-ink text-white flex items-center justify-center group-hover:bg-brand-primary transition">
            {item.icone}
          </span>
          <h3 className="font-bold text-gray-900 tracking-tight mt-1">{item.titulo}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{item.texto}</p>
          <span className="text-xs font-bold text-brand-primary flex items-center gap-1 mt-auto pt-2">
            Acessar <ArrowRight size={13} className="group-hover:translate-x-1 transition" />
          </span>
        </Link>
      ))}
    </section>
  );
}

function SkeletonHome() {
  return (
    <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
      <div className="h-[460px] bg-gray-200 animate-pulse rounded-xl" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function EstadoVazio() {
  return (
    <div className="surface-ink text-white rounded-xl py-20 px-6 text-center">
      <h2 className="titulo-secao text-3xl">Nenhuma matéria publicada ainda</h2>
      <p className="text-white/60 mt-3">
        Entre na área da redação e publique a primeira notícia do portal.
      </p>
      <Link to="/auth" className="botao-vermelho inline-block mt-6 px-6 py-3 text-sm">
        Área da redação
      </Link>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticiaCard, type Noticia } from "@/components/NoticiaCard";
import { supabase } from "@/integrations/supabase/client";
import { corCategoria, nomeCategoria } from "@/lib/categorias";
import { formatarData, SITE } from "@/lib/site";

export const Route = createFileRoute("/noticia/$slug")({ component: NoticiaPage });

function NoticiaPage() {
  const { slug } = Route.useParams();

  const { data: noticia, isLoading } = useQuery({
    queryKey: ["noticia", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noticias")
        .select("*")
        .eq("slug", slug)
        .eq("status", "publicado")
        .maybeSingle();
      if (error) throw error;
      return data as (Noticia & { conteudo?: string; conteudo_html?: string }) | null;
    },
  });

  const { data: relacionadas = [] } = useQuery({
    queryKey: ["noticias", "relacionadas", noticia?.categoria, slug],
    enabled: !!noticia?.categoria,
    queryFn: async () => {
      const { data } = await supabase
        .from("noticias")
        .select("*")
        .eq("status", "publicado")
        .eq("categoria", noticia!.categoria)
        .neq("slug", slug)
        .order("data_publicacao", { ascending: false })
        .limit(3);
      return (data ?? []) as Noticia[];
    },
  });

  useEffect(() => {
    if (noticia?.titulo) document.title = `${noticia.titulo} | ${SITE.nome}`;
  }, [noticia?.titulo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 container-portal py-12 max-w-3xl">
          <div className="h-10 w-2/3 bg-gray-200 animate-pulse rounded mb-5" />
          <div className="h-72 bg-gray-200 animate-pulse rounded-xl mb-7" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!noticia) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 container-portal py-24 text-center">
          <h1 className="titulo-secao text-3xl">Notícia não encontrada</h1>
          <p className="text-gray-500 mt-3">Ela pode ter sido removida ou ainda não foi publicada.</p>
          <Link to="/" className="botao-vermelho inline-block mt-6 px-6 py-3 text-sm">
            Voltar para a home
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const corpo = noticia.conteudo_html || noticia.conteudo || "";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <article className="flex-1 container-portal py-10 md:py-14 max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-brand-primary mb-6"
        >
          <ArrowLeft size={14} /> Voltar
        </Link>

        <Link
          to="/categoria/$categoria"
          params={{ categoria: noticia.categoria }}
          className="tarja"
          style={{ backgroundColor: corCategoria(noticia.categoria) }}
        >
          {nomeCategoria(noticia.categoria)}
        </Link>

        <h1 className="titulo-hero text-[2rem] md:text-[2.75rem] mt-4 mb-4">{noticia.titulo}</h1>

        {noticia.resumo && (
          <p className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed">{noticia.resumo}</p>
        )}

        <p className="text-sm text-gray-500 border-y border-gray-100 py-3.5 mb-8">
          Por <strong className="text-gray-800">{noticia.autor}</strong> · {formatarData(noticia.data_publicacao)}
        </p>

        {noticia.foto_capa && (
          <figure className="mb-8 rounded-xl overflow-hidden bg-gray-100">
            {/* Moldura fixa em 16/9: foto em pé ou deitada ocupa o mesmo espaço
                e nunca empurra o texto da matéria para fora da tela. */}
            <img
              src={noticia.foto_capa}
              alt={noticia.titulo}
              className="w-full object-cover block aspect-[16/9]"
            />
          </figure>
        )}

        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: corpo }} />

        <div className="surface-ink text-white rounded-xl mt-14 p-8 text-center">
          <p className="titulo-secao text-2xl">Viu algo errado no bairro?</p>
          <p className="text-white/60 mt-2 text-sm">Sua denúncia pode virar reportagem no {SITE.nome}.</p>
          <Link to="/denuncie" className="botao-vermelho inline-block mt-5 px-6 py-3 text-sm">
            Enviar denúncia
          </Link>
        </div>
      </article>

      {relacionadas.length > 0 && (
        <section className="container-portal pb-14">
          <p className="cartola mb-5">Leia também</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {relacionadas.map((n) => <NoticiaCard key={n.id} noticia={n} />)}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

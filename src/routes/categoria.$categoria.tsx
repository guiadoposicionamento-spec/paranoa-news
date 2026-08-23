import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticiaCard, type Noticia } from "@/components/NoticiaCard";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS, corCategoria } from "@/lib/categorias";

export const Route = createFileRoute("/categoria/$categoria")({ component: CategoriaPage });

function CategoriaPage() {
  const { categoria } = Route.useParams();
  const cat = CATEGORIAS[categoria];

  const { data: noticias = [], isLoading } = useQuery({
    queryKey: ["noticias", categoria],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noticias")
        .select("*")
        .eq("status", "publicado")
        .eq("categoria", categoria)
        .order("data_publicacao", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Noticia[];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container-portal py-10">
        <div className="mb-7">
          <span className="tarja" style={{ backgroundColor: corCategoria(categoria) }}>
            Editoria
          </span>
          {/* O nome da editoria sozinho ("Segurança") não diz ao Google de
              onde é a notícia. Com a região no H1, a página passa a competir
              por "segurança no Paranoá", "cultura no Itapoã" e afins. */}
          <h1 className="titulo-secao text-3xl md:text-4xl mt-3">
            {cat?.nome ?? categoria}{" "}
            <span className="text-gray-400 font-bold">no Paranoá e Itapoã</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {isLoading ? "Carregando publicações" : `${noticias.length} publicação(ões) nesta editoria`}
          </p>
          <div className="h-[3px] w-16 mt-4 rounded-sm" style={{ backgroundColor: corCategoria(categoria) }} />
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : noticias.length === 0 ? (
          <p className="text-gray-500 py-16 text-center">Nenhuma publicação nesta editoria por enquanto.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {noticias.map((n) => <NoticiaCard key={n.id} noticia={n} />)}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NoticiaFormFields, formVazio, type NoticiaForm } from "@/components/NoticiaForm";
import { limparCacheDeNoticias } from "@/lib/cacheNoticias";

export const Route = createFileRoute("/_authenticated/admin/noticias/$id/editar")({ component: EditarNoticia });

function EditarNoticia() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<NoticiaForm>(formVazio());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "noticia", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("noticias").select("*").eq("id", Number(id)).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      titulo: data.titulo ?? "",
      slug: data.slug ?? "",
      resumo: data.resumo ?? "",
      conteudo: data.conteudo ?? data.conteudo_html ?? "",
      categoria: data.categoria ?? "noticias",
      autor: data.autor ?? "Redação",
      status: data.status ?? "rascunho",
      foto_capa: data.foto_capa ?? "",
      foto_capa_path: data.foto_capa_path ?? null,
      foto_credito: data.foto_credito ?? "",
      data_publicacao: data.data_publicacao
        ? new Date(data.data_publicacao).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    });
  }, [data]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const payload = {
      ...form,
      data_publicacao: new Date(form.data_publicacao).toISOString(),
    };

    const { error } = await supabase.from("noticias").update(payload).eq("id", Number(id));
    setSalvando(false);

    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe uma matéria com esse slug. Altere o endereço da matéria."
          : `Erro ao salvar: ${error.message}`,
      );
      return;
    }

    limparCacheDeNoticias(qc, id);
    navigate({ to: "/admin/noticias" });
  }

  if (isLoading) return <p className="text-gray-400">Carregando matéria...</p>;
  if (!data) return <p className="text-gray-500">Matéria não encontrada.</p>;

  return (
    <div className="max-w-3xl">
      <Link to="/admin/noticias" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-brand-primary mb-4">
        <ArrowLeft size={14} /> Voltar para a lista
      </Link>
      <h1 className="titulo-secao text-2xl mb-6">Editar matéria</h1>
      <NoticiaFormFields
        valores={form}
        onChange={setForm}
        onSubmit={salvar}
        salvando={salvando}
        erro={erro}
        textoBotao="Atualizar matéria"
      />
    </div>
  );
}

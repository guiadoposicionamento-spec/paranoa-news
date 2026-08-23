import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NoticiaFormFields, formVazio, type NoticiaForm } from "@/components/NoticiaForm";

export const Route = createFileRoute("/_authenticated/admin/noticias/nova")({ component: NovaNoticia });

function NovaNoticia() {
  const navigate = useNavigate();
  const [form, setForm] = useState<NoticiaForm>(formVazio());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const payload = {
      ...form,
      data_publicacao: new Date(form.data_publicacao).toISOString(),
    };

    const { error } = await supabase.from("noticias").insert([payload]);
    setSalvando(false);

    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe uma matéria com esse slug. Altere o endereço da matéria."
          : `Erro ao salvar: ${error.message}`,
      );
      return;
    }
    navigate({ to: "/admin/noticias" });
  }

  return (
    <div className="max-w-3xl">
      <Link to="/admin/noticias" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-brand-primary mb-4">
        <ArrowLeft size={14} /> Voltar para a lista
      </Link>
      <h1 className="titulo-secao text-2xl mb-6">Nova matéria</h1>
      <NoticiaFormFields
        valores={form}
        onChange={setForm}
        onSubmit={salvar}
        salvando={salvando}
        erro={erro}
        textoBotao="Salvar matéria"
      />
    </div>
  );
}

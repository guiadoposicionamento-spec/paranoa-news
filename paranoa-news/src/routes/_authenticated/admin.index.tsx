import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Briefcase, Megaphone, FileEdit, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminIndex });

function AdminIndex() {
  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const agora = new Date().toISOString();
      const [pub, rasc, vagas, den, assin] = await Promise.all([
        supabase.from("noticias").select("id", { count: "exact", head: true }).eq("status", "publicado"),
        supabase.from("noticias").select("id", { count: "exact", head: true }).eq("status", "rascunho"),
        supabase.from("vagas").select("id", { count: "exact", head: true }).eq("status", "aberta"),
        supabase.from("denuncias").select("id", { count: "exact", head: true }).eq("status", "nova"),
        supabase.from("assinaturas").select("id", { count: "exact", head: true })
          .eq("status", "ativa").gt("expira_em", agora),
      ]);
      return {
        publicadas: pub.count ?? 0,
        rascunhos: rasc.count ?? 0,
        vagasAbertas: vagas.count ?? 0,
        denunciasNovas: den.count ?? 0,
        assinantes: assin.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Matérias publicadas", valor: stats?.publicadas, icone: <Newspaper size={20} />, cor: "bg-brand-primary" },
    { label: "Rascunhos", valor: stats?.rascunhos, icone: <FileEdit size={20} />, cor: "bg-gray-700" },
    { label: "Vagas abertas", valor: stats?.vagasAbertas, icone: <Briefcase size={20} />, cor: "bg-blue-600" },
    { label: "Denúncias novas", valor: stats?.denunciasNovas, icone: <Megaphone size={20} />, cor: "bg-orange-600" },
    { label: "Assinantes ativos", valor: stats?.assinantes, icone: <CreditCard size={20} />, cor: "bg-green-600" },
  ];

  return (
    <div>
      <h1 className="titulo-secao text-2xl mb-6">Painel da redação</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="cartao p-5 flex items-center gap-4">
            <span className={`w-11 h-11 rounded ${c.cor} text-white flex items-center justify-center shrink-0`}>
              {c.icone}
            </span>
            <div>
              <p className="titulo-secao text-2xl">{c.valor ?? "-"}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/noticias/nova" className="botao-vermelho px-4 py-2.5 text-sm inline-block">
          + Nova matéria
        </Link>
        <Link to="/admin/vagas" className="bg-brand-ink text-white font-bold px-4 py-2.5 rounded-lg text-sm inline-block">
          + Publicar vaga
        </Link>
        <Link to="/admin/denuncias" className="botao-contorno px-4 py-2.5 text-sm inline-block">
          Ver denúncias recebidas
        </Link>
        <Link to="/admin/banners" className="botao-contorno px-4 py-2.5 text-sm inline-block">
          Gerenciar banners
        </Link>
        <Link to="/admin/assinantes" className="botao-contorno px-4 py-2.5 text-sm inline-block">
          Ver assinantes
        </Link>
      </div>
    </div>
  );
}

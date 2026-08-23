import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatarDataCurta } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin/denuncias")({ component: DenunciasAdmin });

const STATUS = [
  { valor: "nova", nome: "Nova", cor: "bg-orange-100 text-orange-700" },
  { valor: "apurando", nome: "Em apuração", cor: "bg-blue-100 text-blue-700" },
  { valor: "publicada", nome: "Virou matéria", cor: "bg-green-100 text-green-700" },
  { valor: "arquivada", nome: "Arquivada", cor: "bg-gray-200 text-gray-600" },
];

function DenunciasAdmin() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("todas");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "denuncias"],
    queryFn: async () => {
      const { data } = await supabase.from("denuncias").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const mudarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await supabase.from("denuncias").update({ status }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "denuncias"] }),
  });

  const excluir = useMutation({
    mutationFn: async (id: number) => { await supabase.from("denuncias").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "denuncias"] }),
  });

  const lista = filtro === "todas" ? (data as any[]) : (data as any[]).filter((d) => d.status === filtro);

  return (
    <div>
      <h1 className="titulo-secao text-2xl mb-2">Denúncias recebidas</h1>
      <p className="text-sm text-gray-500 mb-5">Relatos enviados pelos moradores pelo canal público do portal.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <BotaoFiltro ativo={filtro === "todas"} onClick={() => setFiltro("todas")}>
          Todas ({data.length})
        </BotaoFiltro>
        {STATUS.map((s) => (
          <BotaoFiltro key={s.valor} ativo={filtro === s.valor} onClick={() => setFiltro(s.valor)}>
            {s.nome} ({(data as any[]).filter((d) => d.status === s.valor).length})
          </BotaoFiltro>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-400">Carregando denúncias...</p>
      ) : lista.length === 0 ? (
        <div className="cartao p-12 text-center text-gray-400">
          Nenhuma denúncia neste filtro.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {lista.map((d) => {
            const info = STATUS.find((s) => s.valor === d.status) ?? STATUS[0];
            return (
              <article key={d.id} className="cartao p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{d.assunto}</h3>
                    <p className="text-xs text-gray-400">Recebida em {formatarDataCurta(d.created_at)}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded ${info.cor}`}>{info.nome}</span>
                </div>

                {d.local && (
                  <p className="text-sm text-gray-600 flex items-start gap-1.5">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" /> {d.local}
                  </p>
                )}

                <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded p-3">{d.descricao}</p>

                <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1">
                    <User size={13} /> {d.anonima ? "Denúncia anônima" : d.nome || "Sem nome informado"}
                  </span>
                  {!d.anonima && d.contato && (
                    <span className="flex items-center gap-1"><Phone size={13} /> {d.contato}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                  <select
                    value={d.status}
                    onChange={(e) => mudarStatus.mutate({ id: d.id, status: e.target.value })}
                    className="border border-[color:var(--border)] rounded-md px-2 py-1.5 text-xs"
                  >
                    {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.nome}</option>)}
                  </select>
                  <button
                    onClick={() => { if (confirm("Excluir esta denúncia?")) excluir.mutate(d.id); }}
                    className="text-red-600 text-xs font-semibold ml-auto"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BotaoFiltro({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-bold ${
        ativo ? "bg-brand-primary text-white" : "bg-white border border-[color:var(--border)] text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

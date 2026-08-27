import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, X, Link2, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VagaFormFields, vagaVazia, type VagaForm } from "@/components/VagaForm";
import { formatarDataCurta } from "@/lib/site";
import { caminhoDeCampanha, linkDeCampanha, normalizarWhatsApp } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin/vagas")({ component: VagasAdmin });

function VagasAdmin() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<VagaForm>(vagaVazia());
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "redacao" | "empresa">("todas");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "vagas"],
    queryFn: async () => {
      const { data } = await supabase.from("vagas").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (editandoId) {
        const { error } = await supabase.from("vagas").update(form).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vagas").insert([form]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "vagas"] });
      fechar();
    },
    onError: (e: any) => setErro(e.message ?? "Erro ao salvar a vaga."),
  });

  const excluir = useMutation({
    mutationFn: async (id: number) => { await supabase.from("vagas").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "vagas"] }),
  });

  const alternar = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await supabase.from("vagas").update({ status: status === "aberta" ? "encerrada" : "aberta" }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "vagas"] }),
  });

  function fechar() {
    setAberto(false);
    setEditandoId(null);
    setForm(vagaVazia());
    setErro("");
  }

  function editar(v: any) {
    setForm({
      cargo: v.cargo ?? "", empresa: v.empresa ?? "", local: v.local ?? "", tipo: v.tipo ?? "CLT",
      salario: v.salario ?? "", descricao: v.descricao ?? "", requisitos: v.requisitos ?? "",
      contato: v.contato ?? "", status: v.status ?? "aberta",
    });
    setEditandoId(v.id);
    setAberto(true);
  }

  const lista = (data as any[]).filter((v) =>
    filtro === "todas" ? true : filtro === "empresa" ? !!v.user_id : !v.user_id,
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-2 gap-3">
        <h1 className="titulo-secao text-2xl">Vagas de emprego</h1>
        <button
          onClick={() => (aberto ? fechar() : setAberto(true))}
          className="botao-vermelho px-4 py-2 text-sm flex items-center gap-1.5"
        >
          {aberto ? <><X size={15} /> Cancelar</> : <><Plus size={15} /> Nova vaga</>}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Vagas publicadas pela redação e pelas empresas assinantes. A redação pode encerrar ou excluir qualquer uma.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        <Filtro ativo={filtro === "todas"} onClick={() => setFiltro("todas")}>
          Todas ({data.length})
        </Filtro>
        <Filtro ativo={filtro === "empresa"} onClick={() => setFiltro("empresa")}>
          De empresas ({(data as any[]).filter((v) => v.user_id).length})
        </Filtro>
        <Filtro ativo={filtro === "redacao"} onClick={() => setFiltro("redacao")}>
          Da redação ({(data as any[]).filter((v) => !v.user_id).length})
        </Filtro>
      </div>

      {aberto && (
        <div className="mb-6">
          <VagaFormFields
            valores={form}
            onChange={setForm}
            onSubmit={(e) => { e.preventDefault(); setErro(""); salvar.mutate(); }}
            salvando={salvar.isPending}
            erro={erro}
            textoBotao={editandoId ? "Atualizar vaga" : "Publicar vaga"}
          />
        </div>
      )}

      <div className="cartao overflow-x-auto">
        <table className="w-full text-sm min-w-[780px]">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Publicada</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>}
            {!isLoading && lista.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma vaga neste filtro.</td></tr>
            )}
            {lista.map((v) => (
              <tr key={v.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{v.cargo}</td>
                <td className="px-4 py-3 text-gray-600">{v.empresa}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                    v.user_id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {v.user_id ? "assinante" : "redação"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => alternar.mutate({ id: v.id, status: v.status })}
                    className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      v.status === "aberta" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {v.status}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatarDataCurta(v.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end items-center">
                    <LinkDeCampanha vaga={v} />
                    <button onClick={() => editar(v)} className="text-blue-600 font-semibold">Editar</button>
                    <button
                      onClick={() => { if (confirm("Excluir esta vaga?")) excluir.mutate(v.id); }}
                      className="text-red-600 font-semibold"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Copia o endereço que vai no anúncio da Meta.
 *
 * Substitui o gerador de links que existia à parte: a vaga já está no banco
 * com cargo, empresa e telefone, então não há o que preencher de novo — o
 * link é sempre o site + o id da vaga.
 */
function LinkDeCampanha({ vaga }: { vaga: any }) {
  const [copiado, setCopiado] = useState(false);

  if (!normalizarWhatsApp(vaga.contato)) {
    return <span className="text-xs text-gray-400" title="Esta vaga não tem WhatsApp válido">sem zap</span>;
  }

  async function copiar() {
    const link = linkDeCampanha(vaga.id);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Navegador antigo ou página sem HTTPS: cai no jeito velho
      const campo = document.createElement("textarea");
      campo.value = link;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      document.body.removeChild(campo);
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <span className="flex items-center gap-2">
      <button
        onClick={copiar}
        title="Copiar o link para usar no anúncio da Meta"
        className={`font-semibold flex items-center gap-1 ${copiado ? "text-green-600" : "text-gray-600"}`}
      >
        {copiado ? <Check size={14} /> : <Link2 size={14} />}
        {copiado ? "copiado" : "link"}
      </button>
      <a
        href={`${caminhoDeCampanha(vaga.id)}?teste=1`}
        target="_blank"
        rel="noreferrer"
        title="Ver a tela sem ser redirecionado"
        className="text-gray-400"
      >
        <ExternalLink size={14} />
      </a>
    </span>
  );
}

function Filtro({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
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

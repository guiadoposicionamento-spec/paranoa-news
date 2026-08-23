import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatarDataCurta } from "@/lib/site";
import { infoStatus } from "@/lib/planos";

export const Route = createFileRoute("/_authenticated/admin/assinantes")({ component: Assinantes });

function Assinantes() {
  const [aba, setAba] = useState<"assinantes" | "eventos">("assinantes");

  const { data: assinaturas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "assinaturas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("assinaturas")
        .select("*")
        .order("atualizado_em", { ascending: false });
      return data ?? [];
    },
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ["admin", "kiwify-eventos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("kiwify_eventos")
        .select("id,evento,email,assinatura_valida,recebido_em")
        .order("recebido_em", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const ativas = (assinaturas as any[]).filter(
    (a) => a.status === "ativa" && new Date(a.expira_em) > new Date(),
  ).length;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
        <h1 className="titulo-secao text-2xl">Assinantes</h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 bg-white ring-1 ring-gray-200 px-3 py-2 rounded"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Empresas que assinam o plano de vagas. Os status chegam sozinhos pelo webhook da Kiwify.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Cartao titulo="Assinaturas ativas" valor={String(ativas)} destaque />
        <Cartao titulo="Cadastros no total" valor={String(assinaturas.length)} />
        <Cartao titulo="Receita mensal estimada" valor={`R$ ${ativas * 67}`} />
      </div>

      <div className="flex gap-2 mb-4">
        <Aba ativo={aba === "assinantes"} onClick={() => setAba("assinantes")}>Assinantes</Aba>
        <Aba ativo={aba === "eventos"} onClick={() => setAba("eventos")}>Eventos da Kiwify</Aba>
      </div>

      {aba === "assinantes" ? (
        <div className="cartao overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Válida até</th>
                <th className="px-4 py-3">Último evento</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>}
              {!isLoading && assinaturas.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Nenhuma assinatura registrada ainda.
                </td></tr>
              )}
              {(assinaturas as any[]).map((a) => {
                const vencida = a.expira_em && new Date(a.expira_em) < new Date();
                const info = infoStatus(a.status);
                return (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.nome || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{a.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        vencida && a.status === "ativa" ? "bg-orange-100 text-orange-700" : info.cor
                      }`}>
                        {vencida && a.status === "ativa" ? "vencida" : a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatarDataCurta(a.expira_em)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{a.ultimo_evento || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cartao overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Recebido</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Origem</th>
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                  Nenhum evento recebido. Use o botão "Testar webhook" no painel da Kiwify para conferir a ligação.
                </td></tr>
              )}
              {(eventos as any[]).map((e) => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(e.recebido_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{e.evento}</td>
                  <td className="px-4 py-3 text-gray-600">{e.email || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      e.assinatura_valida ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {e.assinatura_valida ? "verificado" : "não verificado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Cartao({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-lg p-5 ring-1 ${destaque ? "bg-brand-dark text-white ring-transparent" : "bg-white ring-gray-100"}`}>
      <p className={`text-xs uppercase font-bold ${destaque ? "text-white/50" : "text-gray-400"}`}>{titulo}</p>
      <p className="text-2xl font-black mt-1">{valor}</p>
    </div>
  );
}

function Aba({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded text-sm font-bold ${
        ativo ? "bg-brand-primary text-white" : "bg-white border border-[color:var(--border)] text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

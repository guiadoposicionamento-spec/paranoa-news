import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nomeCategoria } from "@/lib/categorias";
import { formatarDataCurta } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin/noticias/")({ component: NoticiasAdmin });

function NoticiasAdmin() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "noticias"],
    queryFn: async () => {
      const { data } = await supabase
        .from("noticias")
        .select("id,titulo,status,data_publicacao,categoria,slug")
        .order("data_publicacao", { ascending: false });
      return data ?? [];
    },
  });

  const deletar = useMutation({
    mutationFn: async (id: number) => {
      await supabase.from("noticias").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "noticias"] }),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await supabase
        .from("noticias")
        .update({ status: status === "publicado" ? "rascunho" : "publicado" })
        .eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "noticias"] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-3">
        <h1 className="titulo-secao text-2xl">Notícias</h1>
        <Link to="/admin/noticias/nova" className="botao-vermelho px-4 py-2 text-sm">
          + Nova
        </Link>
      </div>

      <div className="cartao overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhuma matéria cadastrada.</td></tr>
            )}
            {(data as any[]).map((n) => (
              <tr key={n.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{n.titulo}</td>
                <td className="px-4 py-3 text-gray-600">{nomeCategoria(n.categoria)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => alternarStatus.mutate({ id: n.id, status: n.status })}
                    className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      n.status === "publicado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}
                    title="Clique para alternar"
                  >
                    {n.status}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatarDataCurta(n.data_publicacao)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => navigate({ to: "/admin/noticias/$id/editar", params: { id: String(n.id) } })}
                      className="text-blue-600 font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { if (confirm("Excluir esta matéria?")) deletar.mutate(n.id); }}
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

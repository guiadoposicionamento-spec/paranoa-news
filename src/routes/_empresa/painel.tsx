import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Plus, X, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VagaFormFields, vagaVazia, type VagaForm } from "@/components/VagaForm";
import { PlanosCards } from "@/components/PlanosCards";
import { LIMITE_VAGAS, infoStatus } from "@/lib/planos";
import { formatarDataCurta, SITE } from "@/lib/site";

export const Route = createFileRoute("/_empresa/painel")({ component: PainelEmpresa });

function PainelEmpresa() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<VagaForm>(vagaVazia());
  const [erro, setErro] = useState("");

  const { data: perfil } = useQuery({
    queryKey: ["empresa", "perfil"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("perfis").select("*").eq("id", user.id).maybeSingle();
      return { ...data, email: user.email, id: user.id };
    },
  });

  const { data: assinatura, isLoading: carregandoAssinatura } = useQuery({
    queryKey: ["empresa", "assinatura"],
    queryFn: async () => {
      const { data } = await supabase.rpc("minha_assinatura");
      return (data as any[])?.[0] ?? null;
    },
  });

  const { data: vagas = [] } = useQuery({
    queryKey: ["empresa", "vagas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vagas")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (perfil?.nome && !form.empresa) setForm((f) => ({ ...f, empresa: perfil.nome }));
  }, [perfil?.nome]);

  const abertas = (vagas as any[]).filter((v) => v.status === "aberta").length;
  const info = infoStatus(assinatura?.status);
  const vencida = assinatura?.expira_em ? new Date(assinatura.expira_em) < new Date() : false;
  const podePublicar = info.publica && !vencida;
  const limiteCheio = abertas >= LIMITE_VAGAS;

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = { ...form, user_id: perfil!.id };
      if (editandoId) {
        const { error } = await supabase.from("vagas").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vagas").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empresa", "vagas"] });
      fechar();
    },
    onError: (e: any) => setErro(traduzErro(e?.message)),
  });

  const excluir = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("vagas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresa", "vagas"] }),
  });

  const alternar = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { error } = await supabase
        .from("vagas")
        .update({ status: status === "aberta" ? "encerrada" : "aberta" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresa", "vagas"] }),
    onError: (e: any) => setErro(traduzErro(e?.message)),
  });

  function fechar() {
    setAberto(false);
    setEditandoId(null);
    setForm(vagaVazia(perfil?.nome ?? ""));
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
    setErro("");
  }

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/anuncie" });
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-brand-dark text-white">
        <div className="container-portal flex flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt={SITE.nome} className="h-8 w-auto" />
            <span className="text-xs font-bold uppercase text-white/50 border-l border-white/20 pl-3">
              Área da empresa
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/vagas" className="flex items-center gap-1.5 font-semibold">
              <ExternalLink size={15} /> Ver painel de vagas
            </Link>
            <button onClick={sair} className="flex items-center gap-1.5 font-semibold text-red-300">
              <LogOut size={15} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container-portal py-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="titulo-secao text-2xl">{perfil?.nome || "Sua empresa"}</h1>
            <p className="text-sm text-gray-500">{perfil?.email}</p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${info.cor}`}>
              {carregandoAssinatura ? "Verificando..." : vencida ? "Assinatura vencida" : info.rotulo}
            </span>
            {assinatura?.expira_em && (
              <p className="text-xs text-gray-400 mt-1">
                {vencida ? "Venceu em " : "Válida até "}
                {formatarDataCurta(assinatura.expira_em)}
              </p>
            )}
          </div>
        </div>

        {!podePublicar && !carregandoAssinatura && (
          <div className="cartao p-6 border-orange-200 mb-6">
            <div className="flex items-start gap-4 mb-5">
              <AlertTriangle size={24} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">
                  {vencida ? "Sua assinatura venceu" : info.rotulo}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {vencida
                    ? "Escolha um plano abaixo para voltar a publicar e editar suas vagas."
                    : info.recado}
                </p>
              </div>
            </div>
            <PlanosCards compacto />
            <p className="text-xs text-gray-400 mt-3">
              Pague com o mesmo e-mail desta conta ({perfil?.email}) para a liberação ser automática.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Cartao titulo="Vagas abertas" valor={`${abertas} de ${LIMITE_VAGAS}`} />
          <Cartao titulo="Total cadastrado" valor={String(vagas.length)} />
          <Cartao titulo="Plano" valor={assinatura?.plano || "Nenhum"} />
        </div>

        <div className="flex justify-between items-center mb-4 gap-3">
          <h2 className="titulo-secao text-lg">Minhas vagas</h2>
          <button
            onClick={() => (aberto ? fechar() : setAberto(true))}
            disabled={!podePublicar || (!aberto && limiteCheio && !editandoId)}
            className="botao-vermelho px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-50"
            title={limiteCheio ? `Limite de ${LIMITE_VAGAS} vagas abertas atingido` : undefined}
          >
            {aberto ? <><X size={15} /> Cancelar</> : <><Plus size={15} /> Nova vaga</>}
          </button>
        </div>

        {limiteCheio && podePublicar && !aberto && (
          <p className="bg-yellow-50 text-yellow-800 text-sm px-4 py-3 rounded mb-4">
            Você atingiu o limite de {LIMITE_VAGAS} vagas abertas. Encerre uma vaga da lista para liberar espaço.
          </p>
        )}

        {aberto && (
          <div className="mb-6">
            <VagaFormFields
              valores={form}
              onChange={setForm}
              onSubmit={(e) => { e.preventDefault(); setErro(""); salvar.mutate(); }}
              salvando={salvar.isPending}
              erro={erro}
              travarEmpresa={false}
              textoBotao={editandoId ? "Atualizar vaga" : "Publicar vaga"}
            />
          </div>
        )}

        {!aberto && erro && (
          <p className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded mb-4">{erro}</p>
        )}

        <div className="cartao overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Publicada</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vagas.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                  Você ainda não publicou nenhuma vaga.
                </td></tr>
              )}
              {(vagas as any[]).map((v) => (
                <tr key={v.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.cargo}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setErro(""); alternar.mutate({ id: v.id, status: v.status }); }}
                      disabled={!podePublicar}
                      className={`px-2 py-0.5 rounded-md text-xs font-bold disabled:opacity-50 ${
                        v.status === "aberta" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {v.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatarDataCurta(v.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => editar(v)}
                        disabled={!podePublicar}
                        className="text-blue-600 font-semibold disabled:opacity-50"
                      >
                        Editar
                      </button>
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
      </main>
    </div>
  );
}

function Cartao({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="cartao p-5">
      <p className="rotulo">{titulo}</p>
      <p className="titulo-secao text-2xl mt-1">{valor}</p>
    </div>
  );
}

// As mensagens vêm do banco em formato técnico; aqui viram texto de gente
function traduzErro(msg?: string) {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("limite de 5")) return `Limite de ${LIMITE_VAGAS} vagas abertas atingido. Encerre uma vaga para publicar outra.`;
  if (m.includes("assinatura inativa")) return "Sua assinatura não está ativa. Renove na Kiwify para publicar.";
  if (m.includes("row-level security") || m.includes("violates row"))
    return "Sua assinatura não está ativa no momento, por isso a publicação foi bloqueada.";
  if (m.includes("propria empresa")) return "Você só pode gerenciar as vagas da sua própria empresa.";
  return msg || "Não foi possível salvar. Tente novamente.";
}

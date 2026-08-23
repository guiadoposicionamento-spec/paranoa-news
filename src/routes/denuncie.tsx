import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Megaphone, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/denuncie")({ component: DenunciePage });

const ASSUNTOS = [
  "Buraco na via / asfalto",
  "Iluminação pública",
  "Água ou esgoto",
  "Lixo e limpeza urbana",
  "Segurança pública",
  "Saúde / posto de saúde",
  "Educação / escola",
  "Transporte público",
  "Outro assunto",
];

function DenunciePage() {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    assunto: ASSUNTOS[0],
    local: "",
    descricao: "",
    nome: "",
    contato: "",
    anonima: true,
  });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (form.descricao.trim().length < 20) {
      setErro("Descreva a situação com pelo menos 20 caracteres para a redação conseguir apurar.");
      return;
    }

    setEnviando(true);
    const { error } = await supabase.from("denuncias").insert([
      {
        assunto: form.assunto,
        local: form.local,
        descricao: form.descricao,
        nome: form.anonima ? null : form.nome || null,
        contato: form.anonima ? null : form.contato || null,
        anonima: form.anonima,
        status: "nova",
      },
    ]);
    setEnviando(false);

    if (error) {
      setErro("Não foi possível enviar agora. Tente novamente em alguns minutos.");
      return;
    }
    setEnviado(true);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <PageHero
        eyebrow="Canal do morador"
        icone={<Megaphone size={13} />}
        titulo="Denuncie e a gente cobra"
        subtitulo={`Buraco na rua, poste apagado, falta de água, descaso no posto de saúde. Conte o que está acontecendo e a redação do ${SITE.nome} apura.`}
      />

      <main className="flex-1 container-portal py-10">
        {enviado ? (
          <div className="max-w-xl mx-auto cartao p-10 text-center">
            <CheckCircle2 size={44} className="text-green-600 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-gray-900">Denúncia recebida</h2>
            <p className="text-gray-500 mt-2">
              A redação vai analisar o relato e, se necessário, entrar em contato para apurar. Obrigado por
              ajudar a melhorar o Paranoá.
            </p>
            <button
              onClick={() => {
                setEnviado(false);
                setForm({ assunto: ASSUNTOS[0], local: "", descricao: "", nome: "", contato: "", anonima: true });
              }}
              className="botao-vermelho mt-6 px-6 py-3 text-sm"
            >
              Enviar outra denúncia
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <form onSubmit={enviar} className="lg:col-span-2 cartao p-7 flex flex-col gap-5">
              {erro && <p className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg">{erro}</p>}

              <label className="flex flex-col gap-1">
                <span className="rotulo">Assunto</span>
                <select
                  value={form.assunto}
                  onChange={(e) => setForm((f) => ({ ...f, assunto: e.target.value }))}
                  className="campo"
                >
                  {ASSUNTOS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="rotulo">Local (quadra, rua, ponto de referência)</span>
                <input
                  value={form.local}
                  onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                  placeholder="Ex: Quadra 32, próximo à escola classe"
                  className="campo"
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="rotulo">O que está acontecendo</span>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descreva a situação, há quanto tempo o problema existe e quem é afetado."
                  className="campo h-40"
                  required
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.anonima}
                  onChange={(e) => setForm((f) => ({ ...f, anonima: e.target.checked }))}
                />
                Quero enviar de forma anônima
              </label>

              {!form.anonima && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">Seu nome</span>
                    <input
                      value={form.nome}
                      onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                      className="campo"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">Telefone ou e-mail</span>
                    <input
                      value={form.contato}
                      onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))}
                      className="campo"
                    />
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="botao-vermelho py-3.5 text-sm disabled:opacity-60"
              >
                {enviando ? "Enviando..." : "Enviar denúncia"}
              </button>
            </form>

            <aside className="cartao p-7 flex flex-col gap-5">
              <div className="flex items-start gap-3">
                <ShieldCheck size={22} className="text-brand-primary shrink-0" />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Sua identidade é protegida</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Se marcar a opção anônima, nenhum dado pessoal é gravado junto com o relato.
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-bold text-gray-900 text-sm">Como funciona</h3>
                <ol className="text-sm text-gray-500 mt-2 space-y-2 list-decimal list-inside">
                  <li>Você envia o relato pelo formulário.</li>
                  <li>A redação analisa e apura os fatos.</li>
                  <li>Se confirmado, vira matéria na editoria Denúncias.</li>
                </ol>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-bold text-gray-900 text-sm">Emergência</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Em caso de risco imediato, acione primeiro os órgãos oficiais: 190 (Polícia), 193 (Bombeiros),
                  192 (Samu).
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

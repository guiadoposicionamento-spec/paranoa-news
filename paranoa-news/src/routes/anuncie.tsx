import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { PlanosCards } from "@/components/PlanosCards";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/anuncie")({ component: AnunciePage });

function AnunciePage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("cadastrar");
  const [form, setForm] = useState({ empresa: "", telefone: "", email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setCarregando(true);

    if (modo === "cadastrar") {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.senha,
        options: {
          data: { papel: "empresa", nome: form.empresa.trim(), telefone: form.telefone.trim() },
        },
      });
      setCarregando(false);

      if (error) {
        const m = (error.message || "").toLowerCase();
        if (m.includes("already registered") || m.includes("already been registered")) {
          setErro("Este e-mail já tem conta. Use a opção Entrar.");
        } else if (m.includes("password")) {
          setErro("A senha precisa ter pelo menos 6 caracteres.");
        } else {
          setErro(`Não foi possível cadastrar: ${error.message}`);
        }
        return;
      }

      if (!data.session) {
        setAviso("Conta criada. Confirme o e-mail que enviamos e depois entre por aqui.");
        setModo("entrar");
        return;
      }
      navigate({ to: "/painel" });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.senha,
    });
    setCarregando(false);

    if (error) {
      const m = (error.message || "").toLowerCase();
      if (m.includes("invalid login")) setErro("E-mail ou senha incorretos.");
      else if (m.includes("email not confirmed")) setErro("Confirme seu e-mail antes de entrar.");
      else setErro(`Não foi possível entrar: ${error.message}`);
      return;
    }
    navigate({ to: "/painel" });
  }

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <PageHero
        eyebrow="Para empresas"
        icone={<Briefcase size={13} />}
        titulo="Anuncie suas vagas no Paranoá News"
        subtitulo="Sua oportunidade na frente de quem mora e procura trabalho aqui, sem depender de grupo de WhatsApp lotado."
      />

      <main className="flex-1 container-portal py-12 md:py-16">
        <div className="grid lg:grid-cols-[1.7fr_1fr] gap-8 items-start">
          <div>
            <p className="cartola mb-5">Escolha o seu plano</p>
            <PlanosCards />
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              Pagamento pela Kiwify. Use o mesmo e-mail no pagamento e no cadastro ao lado: é ele que
              libera a publicação das suas vagas.
            </p>
          </div>

          <div className="cartao p-6 lg:sticky lg:top-32">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
              <Aba ativo={modo === "cadastrar"} onClick={() => setModo("cadastrar")}>Criar conta</Aba>
              <Aba ativo={modo === "entrar"} onClick={() => setModo("entrar")}>Entrar</Aba>
            </div>

            {erro && <p className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-4">{erro}</p>}
            {aviso && <p className="bg-green-50 text-green-700 text-sm px-3 py-2.5 rounded-lg mb-4">{aviso}</p>}

            <form onSubmit={enviar} className="flex flex-col gap-4">
              {modo === "cadastrar" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="rotulo">Nome da empresa</span>
                    <input value={form.empresa} onChange={(e) => set({ empresa: e.target.value })} className="campo" required />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="rotulo">WhatsApp</span>
                    <input value={form.telefone} onChange={(e) => set({ telefone: e.target.value })} className="campo" />
                  </label>
                </>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="rotulo">E-mail</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  className="campo"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="rotulo">Senha</span>
                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) => set({ senha: e.target.value })}
                  className="campo"
                  minLength={6}
                  required
                />
              </label>

              <button type="submit" disabled={carregando} className="botao-vermelho py-3 text-sm disabled:opacity-60">
                {carregando ? "Aguarde..." : modo === "cadastrar" ? "Criar minha conta" : "Entrar no painel"}
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-5 leading-relaxed">
              Já é assinante? Entre com o mesmo e-mail usado na compra.{" "}
              <Link to="/vagas" className="text-brand-primary font-semibold">Ver vagas publicadas</Link>
            </p>
          </div>
        </div>

        <section className="mt-16">
          <p className="cartola mb-5">Como funciona</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              ["1", "Assine o plano", "Escolha mensal, trimestral ou semestral e pague pela Kiwify."],
              ["2", "Crie sua conta", `Use o mesmo e-mail da compra para o ${SITE.nome} liberar seu acesso na hora.`],
              ["3", "Publique suas vagas", "Até 5 vagas abertas ao mesmo tempo, com edição livre a qualquer momento."],
            ].map(([n, titulo, texto]) => (
              <div key={n} className="cartao p-6">
                <span className="w-9 h-9 rounded-lg bg-brand-primary text-white font-black flex items-center justify-center">
                  {n}
                </span>
                <h3 className="font-bold text-gray-900 mt-4 tracking-tight">{titulo}</h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{texto}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Aba({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 rounded-md text-sm font-bold transition ${
        ativo ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

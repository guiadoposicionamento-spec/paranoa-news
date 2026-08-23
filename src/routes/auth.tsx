import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("invalid login")) setErro("E-mail ou senha incorretos.");
      else if (msg.includes("email not confirmed")) setErro("Este e-mail ainda não foi confirmado no Supabase.");
      else if (msg.includes("failed to fetch")) setErro("Sem conexão com o servidor. Confira o arquivo .env.");
      else setErro(`Não foi possível entrar: ${error.message}`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase
      .from("perfis")
      .select("papel")
      .eq("id", user!.id)
      .maybeSingle();

    navigate({ to: perfil?.papel === "redacao" ? "/admin" : "/painel" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center surface-ink px-4">
      <form onSubmit={login} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm flex flex-col gap-4">
        <div className="bg-brand-ink rounded-lg py-5 flex justify-center">
          <img src="/logo.png" alt={SITE.nome} className="h-12 w-auto" />
        </div>
        <h1 className="text-lg font-black text-gray-900 text-center">Área da redação</h1>

        {erro && <p className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg">{erro}</p>}

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="campo"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="campo"
          required
        />
        <button
          type="submit"
          disabled={carregando}
          className="botao-vermelho py-3 text-sm disabled:opacity-60"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <Link to="/" className="text-xs text-gray-400 text-center hover:text-brand-primary">
          Voltar para o portal
        </Link>
      </form>
    </div>
  );
}

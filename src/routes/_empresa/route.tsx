import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_empresa")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/anuncie" });

    const { data: perfil } = await supabase
      .from("perfis")
      .select("papel")
      .eq("id", session.user.id)
      .maybeSingle();

    // A redação usa o painel próprio, não o das empresas
    if (perfil?.papel === "redacao") throw redirect({ to: "/admin" });
  },
  component: () => <Outlet />,
});

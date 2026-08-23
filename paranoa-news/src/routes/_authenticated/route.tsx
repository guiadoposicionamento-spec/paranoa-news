import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });

    const { data: perfil } = await supabase
      .from("perfis")
      .select("papel")
      .eq("id", session.user.id)
      .maybeSingle();

    // Conta de empresa não entra no painel da redação
    if (perfil?.papel !== "redacao") throw redirect({ to: "/painel" });
  },
  component: () => <Outlet />,
});

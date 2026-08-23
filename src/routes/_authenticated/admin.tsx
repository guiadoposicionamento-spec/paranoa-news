import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut, Newspaper, Briefcase, Megaphone, LayoutDashboard, ExternalLink, CreditCard, GalleryHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminLayout });

function AdminLayout() {
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const linkClass = "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold hover:bg-white/15 transition";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-brand-dark text-white">
        <div className="container-portal flex flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/admin" className="flex items-center gap-3">
            <img src="/logo.png" alt={SITE.nome} className="h-8 w-auto" />
            <span className="text-xs font-bold uppercase text-white/50 border-l border-white/20 pl-3">
              Redação
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            <Link to="/admin" activeOptions={{ exact: true }} activeProps={{ className: "bg-white/20" }} className={linkClass}>
              <LayoutDashboard size={15} /> Painel
            </Link>
            <Link to="/admin/noticias" activeProps={{ className: "bg-white/20" }} className={linkClass}>
              <Newspaper size={15} /> Notícias
            </Link>
            <Link to="/admin/vagas" activeProps={{ className: "bg-white/20" }} className={linkClass}>
              <Briefcase size={15} /> Vagas
            </Link>
            <Link to="/admin/denuncias" activeProps={{ className: "bg-white/20" }} className={linkClass}>
              <Megaphone size={15} /> Denúncias
            </Link>
            <Link to="/admin/banners" activeProps={{ className: "bg-white/20" }} className={linkClass}>
              <GalleryHorizontal size={15} /> Banners
            </Link>
            <Link to="/admin/assinantes" activeProps={{ className: "bg-white/20" }} className={linkClass}>
              <CreditCard size={15} /> Assinantes
            </Link>
            <Link to="/" className={linkClass}>
              <ExternalLink size={15} /> Ver site
            </Link>
            <button onClick={logout} className={`${linkClass} text-red-300`}>
              <LogOut size={15} /> Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container-portal py-6">
        <Outlet />
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Briefcase, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { VagaCard, type Vaga } from "@/components/VagaCard";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/vagas")({ component: VagasPage });

function VagasPage() {
  const [busca, setBusca] = useState("");

  const { data: vagas = [], isLoading } = useQuery({
    queryKey: ["vagas", "publicas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .eq("status", "aberta")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Vaga[];
    },
  });

  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? vagas.filter((v) =>
        `${v.cargo} ${v.empresa} ${v.local ?? ""} ${v.tipo ?? ""}`.toLowerCase().includes(termo),
      )
    : vagas;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <PageHero
        eyebrow="Painel de vagas"
        icone={<Briefcase size={13} />}
        titulo="Vagas de emprego no Paranoá"
        subtitulo={`Oportunidades divulgadas por empresas e comércios da região, publicadas no ${SITE.nome}.`}
      >
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cargo, empresa ou local"
            className="w-full bg-white text-gray-900 rounded-lg pl-11 pr-3 py-3 text-sm outline-none"
          />
        </div>
      </PageHero>

      <main className="flex-1 container-portal py-10">
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-xl font-black text-gray-900">
              {vagas.length === 0 ? "Nenhuma vaga aberta no momento" : "Nenhuma vaga encontrada para essa busca"}
            </h2>
            <p className="text-gray-500 mt-2">
              Volte em breve, o painel é atualizado sempre que uma nova oportunidade chega à redação.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">
              {filtradas.length} vaga(s) aberta(s)
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              {filtradas.map((v) => <VagaCard key={v.id} vaga={v} />)}
            </div>
          </>
        )}

        <div className="surface-ink text-white rounded-xl mt-12 p-8 md:p-10 text-center">
          <p className="titulo-secao text-2xl md:text-3xl">É empresa e quer divulgar uma vaga?</p>
          <p className="text-white/60 mt-3 max-w-lg mx-auto leading-relaxed">
            Publique até 5 vagas ao mesmo tempo, com edição livre e botão de WhatsApp direto para os
            candidatos.
          </p>
          <Link to="/anuncie" className="botao-vermelho inline-flex items-center gap-2 mt-6 px-6 py-3 text-sm">
            Ver planos <ArrowRight size={16} />
          </Link>
        </div>

      </main>

      <Footer />
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface Banner {
  id: number;
  espaco: number;
  cliente: string;
  imagem_url: string;
  link?: string | null;
  ordem: number;
}

interface Espaco {
  id: number;
  nome: string;
  intervalo_segundos: number;
  ativo: boolean;
  formato?: string;
}

// Proporção de cartão de visita: 9 x 5 cm
export const PROPORCAO_BANNER = "9 / 5";

export function Banners() {
  const { data } = useQuery({
    queryKey: ["banners", "home"],
    queryFn: async () => {
      const [{ data: banners }, { data: espacos }] = await Promise.all([
        supabase.from("banners").select("*").order("ordem"),
        supabase.from("banner_espacos").select("*").order("id"),
      ]);
      return {
        banners: (banners ?? []) as Banner[],
        espacos: (espacos ?? []) as Espaco[],
      };
    },
  });

  const espacos: Espaco[] = data?.espacos ?? [1, 2, 3].map((id) => ({
    id,
    nome: `Espaço ${id}`,
    intervalo_segundos: 6,
    ativo: true,
    formato: "cartao",
  }));

  // Só os espaços de cartão entram nesta grade. A faixa larga tem componente
  // próprio (Faixa.tsx) e aparece no topo e no rodapé de todas as páginas.
  const visiveis = espacos.filter((e) => e.ativo && (e.formato ?? "cartao") === "cartao");
  if (visiveis.length === 0) return null;

  return (
    <section className="grid sm:grid-cols-3 gap-4">
      {visiveis.map((espaco) => (
        <EspacoBanner
          key={espaco.id}
          banners={(data?.banners ?? []).filter((b) => b.espaco === espaco.id)}
          intervalo={espaco.intervalo_segundos}
        />
      ))}
    </section>
  );
}

function EspacoBanner({ banners, intervalo }: { banners: Banner[]; intervalo: number }) {
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(
      () => setAtual((i) => (i + 1) % banners.length),
      Math.max(2, intervalo) * 1000,
    );
    return () => clearInterval(t);
  }, [banners.length, intervalo]);

  useEffect(() => {
    if (atual >= banners.length) setAtual(0);
  }, [banners.length, atual]);

  if (banners.length === 0) return <EspacoLivre />;

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-brand-ink"
      style={{ aspectRatio: PROPORCAO_BANNER }}
    >
      {banners.map((b, i) => (
        <BannerImagem key={b.id} banner={b} visivel={i === atual} />
      ))}

      {banners.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setAtual(i)}
              aria-label={`Ver anúncio ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === atual ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}

      <span className="absolute top-2 right-2 z-10 text-[9px] font-bold uppercase tracking-wider text-white/70 bg-black/45 px-1.5 py-0.5 rounded">
        Publicidade
      </span>
    </div>
  );
}

function BannerImagem({ banner, visivel }: { banner: Banner; visivel: boolean }) {
  const conteudo = (
    <img
      src={banner.imagem_url}
      alt={`Anúncio de ${banner.cliente}`}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover"
    />
  );

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ${
        visivel ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!visivel}
    >
      {banner.link ? (
        <a href={banner.link} target="_blank" rel="noreferrer noopener sponsored" className="block w-full h-full">
          {conteudo}
        </a>
      ) : (
        conteudo
      )}
    </div>
  );
}

// Espaço sem anunciante vira uma vitrine para vender o espaço
function EspacoLivre() {
  return (
    <Link
      to="/anuncie"
      className="group flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-gray-300 bg-white hover:border-brand-primary transition p-5"
      style={{ aspectRatio: PROPORCAO_BANNER }}
    >
      <span className="w-10 h-10 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition">
        <Store size={19} />
      </span>
      <p className="font-bold text-gray-800 mt-3 tracking-tight">Anuncie aqui</p>
      <p className="text-xs text-gray-500 mt-1 max-w-[22ch] leading-relaxed">
        Sua marca na frente de quem mora no Paranoá.
      </p>
    </Link>
  );
}

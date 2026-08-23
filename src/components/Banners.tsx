import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { linkSeguro } from "@/lib/link";

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

// Retrato do Instagram, 4 x 5 — é o formato que o comerciante já tem pronto,
// porque é a mesma arte que ele publica no feed.
export const PROPORCAO_RETRATO = "4 / 5";

// Cartão de visita deitado, 9 x 5. Continua aqui para espaços antigos.
export const PROPORCAO_BANNER = "9 / 5";

export function proporcaoDoFormato(formato?: string | null) {
  if (formato === "faixa") return "6 / 1";
  if (formato === "cartao") return PROPORCAO_BANNER;
  return PROPORCAO_RETRATO;
}

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

  const espacos: Espaco[] = data?.espacos ?? [1, 2, 3, 5].map((id) => ({
    id,
    nome: `Espaço ${id}`,
    intervalo_segundos: 6,
    ativo: true,
    formato: "retrato",
  }));

  // Tudo que não é faixa entra nesta grade. A faixa larga tem componente
  // próprio (Faixa.tsx) e aparece no topo e no rodapé de todas as páginas.
  const visiveis = espacos.filter((e) => e.ativo && e.formato !== "faixa");
  if (visiveis.length === 0) return null;

  // Dois por linha no celular e quatro no computador. Um por linha no
  // celular empilharia quatro retratos e a home viraria um mural de anúncios.
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {visiveis.map((espaco) => (
        <EspacoBanner
          key={espaco.id}
          banners={(data?.banners ?? []).filter((b) => b.espaco === espaco.id)}
          intervalo={espaco.intervalo_segundos}
          proporcao={proporcaoDoFormato(espaco.formato)}
        />
      ))}
    </section>
  );
}

function EspacoBanner({
  banners,
  intervalo,
  proporcao,
}: {
  banners: Banner[];
  intervalo: number;
  proporcao: string;
}) {
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

  if (banners.length === 0) return <EspacoLivre proporcao={proporcao} />;

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-brand-ink"
      style={{ aspectRatio: proporcao }}
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
  // Rede de segurança: mesmo que um link antigo tenha sido salvo sem
  // "https://", ele sai daqui como endereço completo.
  const destino = linkSeguro(banner.link);

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
      {destino ? (
        <a
          href={destino}
          target="_blank"
          rel="noreferrer noopener sponsored"
          aria-label={`Anúncio de ${banner.cliente} — abre em nova aba`}
          className="block w-full h-full"
        >
          {conteudo}
        </a>
      ) : (
        conteudo
      )}
    </div>
  );
}

// Espaço sem anunciante vira uma vitrine para vender o espaço
function EspacoLivre({ proporcao }: { proporcao: string }) {
  return (
    <Link
      to="/anuncie"
      className="group flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-gray-300 bg-white hover:border-brand-primary transition p-3 sm:p-5"
      style={{ aspectRatio: proporcao }}
    >
      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition">
        <Store size={18} />
      </span>
      <p className="font-bold text-gray-800 mt-2.5 tracking-tight text-sm sm:text-base">
        Anuncie aqui
      </p>
      <p className="text-[11px] sm:text-xs text-gray-500 mt-1 max-w-[20ch] leading-snug">
        Sua marca na frente de quem mora no Paranoá.
      </p>
    </Link>
  );
}

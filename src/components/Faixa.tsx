import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Banner } from "@/components/Banners";
import { linkSeguro } from "@/lib/link";

// Faixa larga, no formato dos portais de notícia: 1200 x 200 px.
// Aparece no topo e no rodapé de todas as páginas públicas.
export const ESPACO_FAIXA = 4;
export const PROPORCAO_FAIXA = "6 / 1";
export const LIMITE_FAIXA = 3;

/** Sobe pouco a altura no celular, senão a faixa vira um risco fino ilegível. */
const PROPORCAO_FAIXA_MOBILE = "4 / 1";

export function Faixa({ posicao }: { posicao: "topo" | "rodape" }) {
  const { data } = useQuery({
    queryKey: ["banners", "faixa"],
    // A faixa está em todas as páginas: sem isso, cada troca de página
    // refaz a consulta e a imagem pisca.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: banners }, { data: espaco }] = await Promise.all([
        supabase.from("banners").select("*").eq("espaco", ESPACO_FAIXA).eq("ativo", true).order("ordem"),
        supabase.from("banner_espacos").select("*").eq("id", ESPACO_FAIXA).maybeSingle(),
      ]);
      return {
        banners: (banners ?? []) as Banner[],
        ativo: espaco?.ativo ?? true,
        intervalo: espaco?.intervalo_segundos ?? 7,
      };
    },
  });

  const [atual, setAtual] = useState(0);
  const banners = data?.banners ?? [];
  const intervalo = data?.intervalo ?? 7;

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

  if (data && !data.ativo) return null;

  // Enquanto carrega não reserva espaço: melhor não empurrar a página
  if (!data) return null;

  // No topo a faixa fica logo abaixo do menu; no rodapé ela encosta na
  // margem que o rodapé já reserva, por isso não leva espaço embaixo.
  const margem = posicao === "topo" ? "pt-5 pb-1" : "pt-14 pb-0";

  return (
    <div className={`container-portal ${margem}`}>
      {banners.length === 0 ? (
        <FaixaLivre />
      ) : (
        <div className="faixa-anuncio relative overflow-hidden rounded-xl bg-brand-ink">
          {banners.map((b, i) => (
            <FaixaImagem key={b.id} banner={b} visivel={i === atual} />
          ))}

          {banners.length > 1 && (
            <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setAtual(i)}
                  aria-label={`Ver anúncio ${i + 1}`}
                  className={`h-1 sm:h-1.5 rounded-full transition-all ${
                    i === atual ? "w-4 sm:w-5 bg-white" : "w-1 sm:w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}

          {/* No celular a faixa é baixa: o selo encolhe para não tapar a arte */}
          <span className="absolute top-0.5 right-1 sm:top-2 sm:right-2 z-10 text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-white/60 sm:text-white/70 bg-black/35 sm:bg-black/45 px-1 sm:px-1.5 py-px sm:py-0.5 rounded">
            Publicidade
          </span>
        </div>
      )}
    </div>
  );
}

function FaixaImagem({ banner, visivel }: { banner: Banner; visivel: boolean }) {
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

// Faixa sem anunciante vira vitrine do próprio espaço
function FaixaLivre() {
  return (
    <Link
      to="/anuncie"
      className="faixa-anuncio faixa-convite group flex items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white hover:border-brand-primary transition px-5 text-center"
    >
      <span className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition">
        <Megaphone size={17} />
      </span>
      <span className="text-left">
        <span className="block font-bold text-gray-800 tracking-tight text-sm sm:text-base">
          Anuncie no Paranoá News
        </span>
        <span className="block text-xs text-gray-500 leading-relaxed">
          Sua marca em todas as páginas do portal.
        </span>
      </span>
    </Link>
  );
}

export { PROPORCAO_FAIXA_MOBILE };

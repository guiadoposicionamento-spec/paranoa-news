import { Check, ArrowRight } from "lucide-react";
import { PLANOS, BENEFICIOS, economia, periodo, precoPorMes, reais } from "@/lib/planos";

export function PlanosCards({ compacto }: { compacto?: boolean }) {
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3.5">
        {PLANOS.map((p) => {
          const desconto = economia(p);
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-xl p-5 transition ${
                p.destaque
                  ? "bg-brand-ink text-white shadow-xl"
                  : "cartao hover:border-gray-300"
              }`}
            >
              {p.selo && (
                <span
                  className={`tarja absolute -top-2.5 left-6 ${
                    p.destaque ? "bg-brand-primary" : "bg-brand-ink"
                  }`}
                >
                  {p.selo}
                </span>
              )}

              <p
                className={`text-[11px] font-extrabold uppercase tracking-[0.12em] mt-1 ${
                  p.destaque ? "text-white/50" : "text-gray-400"
                }`}
              >
                {p.nome}
              </p>

              <div className="mt-3">
                <span className="block text-[2rem] leading-none font-black tracking-[-0.04em] tabular-nums whitespace-nowrap">
                  {reais(p.preco)}
                </span>
              </div>
              <p className={`text-xs mt-1.5 ${p.destaque ? "text-white/50" : "text-gray-500"}`}>
                {periodo(p)}
              </p>

              <div className="mt-4 pt-4 border-t" style={{ borderColor: p.destaque ? "rgba(255,255,255,.12)" : "var(--border)" }}>
                {desconto > 0 ? (
                  <>
                    <p className="text-base font-black tracking-tight tabular-nums">
                      {reais(precoPorMes(p))}
                      <span className={`text-xs font-semibold ml-1 ${p.destaque ? "text-white/50" : "text-gray-500"}`}>
                        /mês
                      </span>
                    </p>
                    <p className="text-xs font-bold text-brand-primary mt-1">
                      {desconto}% mais barato
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-black tracking-tight tabular-nums">
                      {reais(precoPorMes(p))}
                      <span className="text-xs font-semibold ml-1 text-gray-500">/mês</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Sem fidelidade</p>
                  </>
                )}
              </div>

              <a
                href={p.checkout}
                target="_blank"
                rel="noreferrer"
                className={`mt-6 flex items-center justify-center gap-2 py-3 text-sm ${
                  p.destaque ? "botao-vermelho" : "botao-contorno"
                }`}
              >
                Assinar <ArrowRight size={15} />
              </a>
            </div>
          );
        })}
      </div>

      {!compacto && (
        <div className="cartao mt-4 p-6">
          <p className="cartola mb-4">Todos os planos incluem</p>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-gray-700">
                <Check size={16} className="text-brand-primary shrink-0 mt-0.5" strokeWidth={3} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

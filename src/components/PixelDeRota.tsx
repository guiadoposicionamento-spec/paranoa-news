import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ehAreaInterna, marcarVisita } from "@/lib/pixel";

/**
 * Conta uma visita na Meta a cada troca de página.
 *
 * Num site comum o próprio script do pixel faz isso, porque cada clique
 * recarrega o navegador inteiro. Aqui a troca de matéria não recarrega nada,
 * então quem avisa a Meta é este componente.
 *
 * O `ultimo` guarda o endereço já contado: sem ele, qualquer re-render do
 * React (abrir um menu, carregar uma foto) mandaria outro PageView e o
 * relatório da Meta mostraria mais visitas do que existem.
 */
export function PixelDeRota() {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const ultimo = useRef<string | null>(null);

  useEffect(() => {
    if (ultimo.current === caminho) return;
    ultimo.current = caminho;
    if (ehAreaInterna(caminho)) return;
    marcarVisita();
  }, [caminho]);

  return null;
}

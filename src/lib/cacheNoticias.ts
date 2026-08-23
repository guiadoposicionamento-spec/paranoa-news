import type { QueryClient } from "@tanstack/react-query";

/**
 * Depois de criar ou editar uma matéria, joga fora o que estava guardado
 * na memória do navegador.
 *
 * Por que isso existe: a lista do painel guarda o resultado da consulta para
 * não bater no banco a cada visita. Sem esta limpeza, você mudava o status
 * para "Publicado", o banco gravava certo, mas a lista continuava mostrando
 * "Rascunho" — parecia que o salvamento não tinha funcionado.
 */
export function limparCacheDeNoticias(qc: QueryClient, id?: string | number) {
  // Painel
  qc.invalidateQueries({ queryKey: ["admin", "noticias"] });
  qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  if (id !== undefined) qc.invalidateQueries({ queryKey: ["admin", "noticia", String(id)] });

  // Site público: home, editorias, matéria e relacionadas
  qc.invalidateQueries({ queryKey: ["noticias"] });
  qc.invalidateQueries({ queryKey: ["noticia"] });
}

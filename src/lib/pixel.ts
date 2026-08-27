/**
 * Pixel da Meta (Facebook/Instagram).
 *
 * O site é uma página só que troca o conteúdo por dentro (SPA). O código que
 * a Meta entrega foi escrito para site tradicional, onde cada clique recarrega
 * tudo — ali o script roda de novo a cada página e o PageView sai sozinho.
 * Aqui ele rodaria UMA vez e a Meta contaria uma visita só, mesmo que a pessoa
 * leia dez matérias. Por isso o carregamento (`iniciarPixel`) está separado da
 * contagem de página (`marcarVisita`), e a contagem é disparada a cada troca
 * de rota pelo componente PixelDeRota.
 */

export const PIXEL_ID = "1371846984551365";

/** Áreas internas: a redação navegando no painel não é audiência. */
const AREAS_INTERNAS = ["/admin", "/auth", "/painel"];

export function ehAreaInterna(caminho: string) {
  return AREAS_INTERNAS.some((a) => caminho === a || caminho.startsWith(a + "/"));
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
    _fbq?: unknown;
  }
}

/**
 * O trecho que a Meta manda colar no <head>, tal como veio — só com o id do
 * pixel vindo da constante acima e sem o `fbq('track','PageView')` do final,
 * que aqui é responsabilidade do PixelDeRota.
 *
 * Vai como texto porque precisa estar dentro de uma tag <script> no HTML que
 * o navegador recebe, antes do React existir.
 */
export const SCRIPT_PIXEL = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');
`.trim();

/** Endereço da imagem de 1x1 usada por quem está com JavaScript desligado. */
export const IMAGEM_SEM_SCRIPT =
  `https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`;

/** Conta uma visualização de página. Não faz nada se o pixel não carregou. */
export function marcarVisita() {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", "PageView");
}

/**
 * Conta um evento de interesse (contato, envio de denúncia, clique em plano).
 * Existe para ser usado depois, quando quisermos medir conversão — hoje só o
 * PageView está ligado.
 */
export function marcarEvento(nome: string, dados?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", nome, dados);
}

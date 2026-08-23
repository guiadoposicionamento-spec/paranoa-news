import { useState } from "react";
import { Facebook, Link2, Check, Share2 } from "lucide-react";

/**
 * Botões de compartilhamento da matéria.
 *
 * O que aparece no WhatsApp e no Facebook (foto, título, resumo) não vem
 * daqui: vem das etiquetas og: da página, montadas pela função de borda do
 * Netlify em netlify/edge-functions/noticia-meta.ts. Estes botões só abrem
 * a caixa de compartilhar de cada rede com o endereço certo.
 */
export function Compartilhar({
  url,
  titulo,
  compacto = false,
}: {
  url: string;
  titulo: string;
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titulo);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      window.prompt("Copie o endereço da matéria:", url);
    }
  }

  async function compartilharNoAparelho() {
    // No celular isso abre a bandeja do próprio sistema, com todos os apps
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
        return;
      } catch {
        /* o usuário fechou a bandeja */
      }
    }
    copiar();
  }

  return (
    <div className={compacto ? "flex flex-wrap gap-2" : "grid grid-cols-2 sm:grid-cols-4 gap-2.5"}>
      <Botao
        rotulo="WhatsApp"
        cor="text-[#25D366]"
        href={`https://api.whatsapp.com/send?text=${t}%20${u}`}
      >
        <IconeWhatsApp />
      </Botao>

      <Botao
        rotulo="Facebook"
        cor="text-[#1877F2]"
        href={`https://www.facebook.com/sharer/sharer.php?u=${u}`}
      >
        <Facebook size={19} fill="currentColor" strokeWidth={0} />
      </Botao>

      <button type="button" onClick={copiar} className="botao-compartilhar">
        <span className={copiado ? "text-green-600" : "text-gray-500"}>
          {copiado ? <Check size={19} /> : <Link2 size={19} />}
        </span>
        <span>{copiado ? "Link copiado" : "Copiar link"}</span>
      </button>

      <button type="button" onClick={compartilharNoAparelho} className="botao-compartilhar">
        <span className="text-gray-500"><Share2 size={19} /></span>
        <span>Mais</span>
      </button>
    </div>
  );
}

function Botao({
  rotulo,
  href,
  cor,
  children,
}: {
  rotulo: string;
  href: string;
  cor: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="botao-compartilhar"
      aria-label={`Compartilhar no ${rotulo}`}
    >
      <span className={cor}>{children}</span>
      <span>{rotulo}</span>
    </a>
  );
}

function IconeWhatsApp() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.07 2.86 1.22 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.16 8.16 0 0 1-1.25-4.35c0-4.54 3.7-8.23 8.23-8.23 2.2 0 4.26.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23z" />
    </svg>
  );
}

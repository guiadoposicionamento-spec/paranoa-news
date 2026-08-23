import { Link } from "@tanstack/react-router";
import { corCategoria, nomeCategoria } from "@/lib/categorias";
import { formatarDataCurta } from "@/lib/site";

export interface Noticia {
  id: number;
  titulo: string;
  slug: string;
  resumo?: string | null;
  foto_capa?: string | null;
  categoria: string;
  data_publicacao: string;
  autor: string;
}

export function NoticiaCard({ noticia }: { noticia: Noticia }) {
  return (
    <Link
      to="/noticia/$slug"
      params={{ slug: noticia.slug }}
      className="group flex flex-col cartao overflow-hidden hover:border-gray-300 transition"
    >
      <div className="relative overflow-hidden bg-brand-ink">
        {noticia.foto_capa ? (
          <img
            src={noticia.foto_capa}
            alt={noticia.titulo}
            loading="lazy"
            className="w-full h-48 object-cover group-hover:scale-[1.04] transition duration-500"
          />
        ) : (
          <div className="w-full h-48 surface-ink" />
        )}
        <span
          className="tarja absolute top-3 left-3"
          style={{ backgroundColor: corCategoria(noticia.categoria) }}
        >
          {nomeCategoria(noticia.categoria)}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-2 flex-1">
        <h2 className="font-bold text-[17px] leading-snug tracking-tight text-gray-900 line-clamp-3 group-hover:text-brand-primary transition">
          {noticia.titulo}
        </h2>
        {noticia.resumo && <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{noticia.resumo}</p>}
        <p className="text-[11px] uppercase tracking-wide text-gray-400 mt-auto pt-3 font-semibold">
          {formatarDataCurta(noticia.data_publicacao)} · {noticia.autor}
        </p>
      </div>
    </Link>
  );
}

export function NoticiaDestaque({ noticia }: { noticia: Noticia }) {
  return (
    <Link
      to="/noticia/$slug"
      params={{ slug: noticia.slug }}
      className="group relative flex flex-col justify-end rounded-xl overflow-hidden min-h-[340px] md:min-h-[460px] bg-brand-ink"
    >
      {noticia.foto_capa && (
        <img
          src={noticia.foto_capa}
          alt={noticia.titulo}
          className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:opacity-75 group-hover:scale-[1.03] transition duration-700"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

      <div className="relative p-6 md:p-9 flex flex-col gap-3">
        <span
          className="tarja self-start"
          style={{ backgroundColor: corCategoria(noticia.categoria) }}
        >
          {nomeCategoria(noticia.categoria)}
        </span>
        <h2 className="titulo-hero text-white text-[1.75rem] md:text-[2.75rem] max-w-2xl">
          {noticia.titulo}
        </h2>
        {noticia.resumo && (
          <p className="text-sm md:text-base text-white/70 line-clamp-2 max-w-2xl leading-relaxed">
            {noticia.resumo}
          </p>
        )}
        <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">
          {formatarDataCurta(noticia.data_publicacao)} · {noticia.autor}
        </p>
      </div>
    </Link>
  );
}

export function NoticiaLinha({ noticia }: { noticia: Noticia }) {
  return (
    <Link
      to="/noticia/$slug"
      params={{ slug: noticia.slug }}
      className="group flex gap-4 items-start py-4 border-b border-gray-100 last:border-0 last:pb-0 first:pt-0"
    >
      {noticia.foto_capa ? (
        <img src={noticia.foto_capa} alt="" loading="lazy" className="w-20 h-16 object-cover rounded shrink-0" />
      ) : (
        <div className="w-20 h-16 rounded surface-ink shrink-0" />
      )}
      <div className="flex flex-col gap-1">
        <span
          className="text-[10px] font-extrabold uppercase tracking-wide"
          style={{ color: corCategoria(noticia.categoria) }}
        >
          {nomeCategoria(noticia.categoria)}
        </span>
        <h3 className="text-sm font-bold leading-snug text-gray-900 line-clamp-2 group-hover:text-brand-primary transition">
          {noticia.titulo}
        </h3>
      </div>
    </Link>
  );
}

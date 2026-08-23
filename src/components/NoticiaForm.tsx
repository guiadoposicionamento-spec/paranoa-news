import { useState } from "react";
import { CATEGORIAS } from "@/lib/categorias";
import { gerarSlug } from "@/lib/site";
import { ImagemUpload } from "@/components/ImagemUpload";

export interface NoticiaForm {
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  categoria: string;
  autor: string;
  status: string;
  foto_capa: string;
  foto_capa_path: string | null;
  data_publicacao: string;
}

export function formVazio(): NoticiaForm {
  return {
    titulo: "",
    slug: "",
    resumo: "",
    conteudo: "",
    categoria: Object.keys(CATEGORIAS)[0],
    autor: "Redação",
    status: "rascunho",
    foto_capa: "",
    foto_capa_path: null,
    data_publicacao: new Date().toISOString().slice(0, 16),
  };
}

interface Props {
  valores: NoticiaForm;
  onChange: (f: NoticiaForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  salvando?: boolean;
  erro?: string;
  textoBotao?: string;
}

export function NoticiaFormFields({ valores, onChange, onSubmit, salvando, erro, textoBotao = "Salvar" }: Props) {
  const [slugManual, setSlugManual] = useState(false);
  const set = (patch: Partial<NoticiaForm>) => onChange({ ...valores, ...patch });

  return (
    <form onSubmit={onSubmit} className="cartao flex flex-col gap-5 p-7">
      {erro && <p className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg">{erro}</p>}

      <Campo label="Título">
        <input
          value={valores.titulo}
          onChange={(e) =>
            set({ titulo: e.target.value, ...(slugManual ? {} : { slug: gerarSlug(e.target.value) }) })
          }
          className="campo"
          required
        />
      </Campo>

      <Campo label="Slug (endereço da matéria)">
        <input
          value={valores.slug}
          onChange={(e) => { setSlugManual(true); set({ slug: gerarSlug(e.target.value) }); }}
          className="campo font-mono"
          required
        />
      </Campo>

      <Campo label="Resumo (aparece nos cards e na busca)">
        <textarea
          value={valores.resumo}
          onChange={(e) => set({ resumo: e.target.value })}
          className="campo h-20"
        />
      </Campo>

      <Campo label="Conteúdo (aceita HTML: <p>, <h2>, <img>, <a>)">
        <textarea
          value={valores.conteudo}
          onChange={(e) => set({ conteudo: e.target.value })}
          className="campo h-64 font-mono"
        />
      </Campo>

      <ImagemUpload
        url={valores.foto_capa}
        path={valores.foto_capa_path}
        bucket="noticias"
        pasta="capas"
        proporcao="16 / 9"
        onChange={({ url, path }) => set({ foto_capa: url, foto_capa_path: path })}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Campo label="Categoria">
          <select
            value={valores.categoria}
            onChange={(e) => set({ categoria: e.target.value })}
            className="campo"
          >
            {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
          </select>
        </Campo>

        <Campo label="Autor">
          <input
            value={valores.autor}
            onChange={(e) => set({ autor: e.target.value })}
            className="campo"
          />
        </Campo>

        <Campo label="Status">
          <select
            value={valores.status}
            onChange={(e) => set({ status: e.target.value })}
            className="campo"
          >
            <option value="rascunho">Rascunho</option>
            <option value="publicado">Publicado</option>
          </select>
        </Campo>

        <Campo label="Data de publicação">
          <input
            type="datetime-local"
            value={valores.data_publicacao}
            onChange={(e) => set({ data_publicacao: e.target.value })}
            className="campo"
          />
        </Campo>
      </div>

      <button
        type="submit"
        disabled={salvando}
        className="botao-vermelho py-3.5 text-sm disabled:opacity-60"
      >
        {salvando ? "Salvando..." : textoBotao}
      </button>
    </form>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="rotulo">{label}</span>
      {children}
    </label>
  );
}

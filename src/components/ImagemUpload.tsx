import { useRef, useState } from "react";
import { Upload, Trash2, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { prepararImagem, tamanhoLegivel } from "@/lib/imagem";

interface Props {
  /** URL pública da imagem atual, ou "" quando não há capa. */
  url: string;
  /** Caminho no bucket, quando a imagem foi enviada por aqui. */
  path?: string | null;
  /** Bucket do Supabase Storage. */
  bucket: string;
  /** Pasta dentro do bucket. */
  pasta?: string;
  /** Proporção da moldura de prévia. Ex: "16 / 9". */
  proporcao?: string;
  onChange: (v: { url: string; path: string | null }) => void;
  /** Texto de apoio abaixo do botão. */
  ajuda?: string;
}

export function ImagemUpload({
  url,
  path,
  bucket,
  pasta = "capas",
  proporcao = "16 / 9",
  onChange,
  ajuda,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [mostrarUrl, setMostrarUrl] = useState(false);

  async function enviar(arquivo: File) {
    setErro("");
    setAviso("");
    setEnviando(true);

    try {
      const pronta = await prepararImagem(arquivo);

      const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${pronta.extensao}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(caminho, pronta.arquivo, {
          cacheControl: "31536000",
          contentType: pronta.tipo,
          upsert: false,
        });

      if (error) throw new Error(error.message);

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(caminho);

      // A imagem anterior só sai depois que a nova subiu, para não ficar
      // matéria sem capa se o envio falhar no meio.
      if (path) await supabase.storage.from(bucket).remove([path]);

      onChange({ url: pub.publicUrl, path: caminho });

      if (pronta.tamanhoFinal < pronta.tamanhoOriginal) {
        setAviso(
          `Imagem ajustada para ${pronta.largura}px de largura — de ${tamanhoLegivel(
            pronta.tamanhoOriginal,
          )} para ${tamanhoLegivel(pronta.tamanhoFinal)}.`,
        );
      }
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remover() {
    setErro("");
    setAviso("");
    if (path) {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) {
        setErro(`Não consegui apagar a imagem: ${error.message}`);
        return;
      }
    }
    onChange({ url: "", path: null });
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="rotulo">Foto de capa</span>

      {url ? (
        <div className="relative rounded-lg overflow-hidden border border-[color:var(--border)] bg-gray-100">
          <img
            src={url}
            alt="Prévia da capa"
            className="w-full object-cover block"
            style={{ aspectRatio: proporcao }}
          />
          <button
            type="button"
            onClick={remover}
            className="absolute top-3 right-3 bg-white/95 hover:bg-white text-gray-700 hover:text-red-600 rounded-md px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Trash2 size={13} /> Remover
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            const f = e.dataTransfer.files?.[0];
            if (f) enviar(f);
          }}
          onClick={() => !enviando && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition py-12 px-6 text-center ${
            arrastando
              ? "border-brand-primary bg-red-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
          }`}
        >
          {enviando ? (
            <>
              <Loader2 size={22} className="text-brand-primary animate-spin" />
              <p className="text-sm font-bold text-gray-700">Enviando imagem...</p>
            </>
          ) : (
            <>
              <Upload size={22} className="text-gray-400" />
              <p className="text-sm font-bold text-gray-700">
                Arraste a foto aqui ou clique para escolher
              </p>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                {ajuda ??
                  "JPG, PNG ou WEBP. A imagem é reduzida sozinha para o tamanho certo do site — pode mandar a foto direto do celular."}
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) enviar(f);
        }}
      />

      {url && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="botao-contorno inline-flex items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-60"
        >
          {enviando ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <Upload size={15} /> Trocar imagem
            </>
          )}
        </button>
      )}

      {erro && <p className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg">{erro}</p>}
      {aviso && <p className="text-xs text-gray-500">{aviso}</p>}

      {!mostrarUrl ? (
        <button
          type="button"
          onClick={() => setMostrarUrl(true)}
          className="self-start text-xs font-bold text-gray-400 hover:text-brand-primary inline-flex items-center gap-1.5"
        >
          <Link2 size={13} /> ou usar o endereço de uma imagem da internet
        </button>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="rotulo">Endereço da imagem</span>
          <input
            value={path ? "" : url}
            onChange={(e) => onChange({ url: e.target.value, path: null })}
            placeholder="https://..."
            className="campo"
          />
          <span className="text-xs text-gray-400">
            Use só para fotos de agências ou órgãos públicos. Se o site de origem sair do ar, a
            capa some da matéria.
          </span>
        </label>
      )}
    </div>
  );
}

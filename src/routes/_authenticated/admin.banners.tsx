import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Upload, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROPORCAO_BANNER } from "@/components/Banners";

export const Route = createFileRoute("/_authenticated/admin/banners")({ component: BannersAdmin });

const TAMANHO_MAX = 5 * 1024 * 1024;

function BannersAdmin() {
  const qc = useQueryClient();
  const [erro, setErro] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: async () => {
      const [{ data: banners }, { data: espacos }] = await Promise.all([
        supabase.from("banners").select("*").order("espaco").order("ordem"),
        supabase.from("banner_espacos").select("*").order("id"),
      ]);
      return { banners: banners ?? [], espacos: espacos ?? [] };
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["admin", "banners"] });
    qc.invalidateQueries({ queryKey: ["banners", "home"] });
  };

  const salvarEspaco = useMutation({
    mutationFn: async ({ id, campos }: { id: number; campos: Record<string, unknown> }) => {
      const { error } = await supabase.from("banner_espacos").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: any) => setErro(e.message),
  });

  const salvarBanner = useMutation({
    mutationFn: async ({ id, campos }: { id: number; campos: Record<string, unknown> }) => {
      const { error } = await supabase.from("banners").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: any) => setErro(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (b: any) => {
      if (b.imagem_path) await supabase.storage.from("banners").remove([b.imagem_path]);
      const { error } = await supabase.from("banners").delete().eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: any) => setErro(e.message),
  });

  if (isLoading) return <p className="text-gray-400">Carregando banners...</p>;

  const espacos = (data?.espacos ?? []) as any[];
  const banners = (data?.banners ?? []) as any[];

  return (
    <div>
      <h1 className="titulo-secao text-2xl mb-2">Banners</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Três espaços de publicidade aparecem na home, logo depois das notícias. Cada espaço aceita
        vários banners, que giram em rodízio. Espaço sem banner mostra um convite "Anuncie aqui".
      </p>

      {erro && (
        <p className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
          {erro}{" "}
          <button onClick={() => setErro("")} className="underline font-semibold ml-1">fechar</button>
        </p>
      )}

      <div className="cartao p-5 mb-8 flex items-start gap-3">
        <ImageIcon size={20} className="text-brand-primary shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600 leading-relaxed">
          <strong className="text-gray-900">Tamanho da imagem:</strong> use a proporção de cartão de
          visita, 9 por 5. O ideal é <strong>900 x 500 pixels</strong> (ou 1080 x 600), em JPG, PNG ou
          WEBP, até 5 MB. Imagem fora dessa proporção é cortada nas bordas para não quebrar o layout.
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {espacos.map((espaco) => (
          <EspacoBloco
            key={espaco.id}
            espaco={espaco}
            banners={banners.filter((b) => b.espaco === espaco.id)}
            onErro={setErro}
            onMudou={invalidar}
            salvarEspaco={salvarEspaco}
            salvarBanner={salvarBanner}
            excluir={excluir}
          />
        ))}
      </div>
    </div>
  );
}

function EspacoBloco({ espaco, banners, onErro, onMudou, salvarEspaco, salvarBanner, excluir }: any) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [cliente, setCliente] = useState("");
  const [link, setLink] = useState("");

  async function enviarArquivo(arquivo: File) {
    onErro("");

    if (!cliente.trim()) {
      onErro("Informe o nome do cliente antes de enviar a imagem.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      onErro("A imagem passa de 5 MB. Reduza o arquivo e tente de novo.");
      return;
    }

    setEnviando(true);
    const ext = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
    const caminho = `espaco-${espaco.id}/${Date.now()}.${ext}`;

    const { error: erroUpload } = await supabase.storage
      .from("banners")
      .upload(caminho, arquivo, { cacheControl: "3600", upsert: false });

    if (erroUpload) {
      setEnviando(false);
      onErro(`Não foi possível enviar a imagem: ${erroUpload.message}`);
      return;
    }

    const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);

    const proximaOrdem = banners.length
      ? Math.max(...banners.map((b: any) => b.ordem)) + 1
      : 0;

    const { error } = await supabase.from("banners").insert([{
      espaco: espaco.id,
      cliente: cliente.trim(),
      imagem_url: pub.publicUrl,
      imagem_path: caminho,
      link: link.trim() || null,
      ordem: proximaOrdem,
      ativo: true,
    }]);

    setEnviando(false);

    if (error) {
      onErro(`Imagem enviada, mas não foi possível salvar o banner: ${error.message}`);
      return;
    }

    setCliente("");
    setLink("");
    if (inputRef.current) inputRef.current.value = "";
    onMudou();
  }

  function mover(b: any, direcao: -1 | 1) {
    const ordenados = [...banners].sort((x, y) => x.ordem - y.ordem);
    const i = ordenados.findIndex((x) => x.id === b.id);
    const j = i + direcao;
    if (j < 0 || j >= ordenados.length) return;
    salvarBanner.mutate({ id: ordenados[i].id, campos: { ordem: ordenados[j].ordem } });
    salvarBanner.mutate({ id: ordenados[j].id, campos: { ordem: ordenados[i].ordem } });
  }

  const ativos = banners.filter((b: any) => b.ativo).length;

  return (
    <section className="cartao p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[color:var(--border)]">
        <div>
          <h2 className="titulo-secao text-lg">{espaco.nome}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {banners.length === 0
              ? "Nenhum banner. O espaço mostra o convite Anuncie aqui."
              : `${banners.length} banner(s), ${ativos} no ar${ativos > 1 ? ", girando em rodízio" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="rotulo">Troca a cada</span>
            <input
              type="number"
              min={2}
              max={60}
              defaultValue={espaco.intervalo_segundos}
              onBlur={(e) =>
                salvarEspaco.mutate({
                  id: espaco.id,
                  campos: { intervalo_segundos: Math.min(60, Math.max(2, Number(e.target.value) || 6)) },
                })
              }
              className="campo w-20 text-center"
            />
            <span className="text-xs text-gray-500">seg</span>
          </label>

          <button
            onClick={() => salvarEspaco.mutate({ id: espaco.id, campos: { ativo: !espaco.ativo } })}
            className={`px-3 py-1.5 rounded-md text-xs font-bold ${
              espaco.ativo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
            }`}
          >
            {espaco.ativo ? "espaço no ar" : "espaço oculto"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_1.2fr] gap-6 pt-5">
        <div>
          <p className="rotulo mb-3">Adicionar banner</p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Cliente</span>
              <input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ex: Padaria do Lago"
                className="campo"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Link ao clicar (opcional)</span>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://wa.me/5561999999999"
                className="campo"
              />
            </label>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) enviarArquivo(f);
              }}
            />

            <button
              onClick={() => inputRef.current?.click()}
              disabled={enviando}
              className="botao-vermelho flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-60"
            >
              <Upload size={16} />
              {enviando ? "Enviando..." : "Escolher imagem e publicar"}
            </button>
          </div>
        </div>

        <div>
          <p className="rotulo mb-3">Banners deste espaço</p>

          {banners.length === 0 ? (
            <div
              className="rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-400"
              style={{ aspectRatio: PROPORCAO_BANNER }}
            >
              Espaço livre
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...banners].sort((a: any, b: any) => a.ordem - b.ordem).map((b: any, i: number) => (
                <div key={b.id} className="flex gap-3 items-center">
                  <img
                    src={b.imagem_url}
                    alt={b.cliente}
                    className={`w-32 rounded-lg object-cover border border-[color:var(--border)] ${
                      b.ativo ? "" : "opacity-40 grayscale"
                    }`}
                    style={{ aspectRatio: PROPORCAO_BANNER }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{b.cliente}</p>
                    {b.link && (
                      <a
                        href={b.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-primary truncate block"
                      >
                        {b.link}
                      </a>
                    )}
                    <p className="text-[11px] text-gray-400 mt-0.5">Posição {i + 1}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <BotaoIcone titulo="Subir" onClick={() => mover(b, -1)} desativado={i === 0}>
                      <ArrowUp size={15} />
                    </BotaoIcone>
                    <BotaoIcone
                      titulo="Descer"
                      onClick={() => mover(b, 1)}
                      desativado={i === banners.length - 1}
                    >
                      <ArrowDown size={15} />
                    </BotaoIcone>
                    <BotaoIcone
                      titulo={b.ativo ? "Tirar do ar" : "Colocar no ar"}
                      onClick={() => salvarBanner.mutate({ id: b.id, campos: { ativo: !b.ativo } })}
                    >
                      {b.ativo ? <Eye size={15} /> : <EyeOff size={15} />}
                    </BotaoIcone>
                    <BotaoIcone
                      titulo="Excluir"
                      vermelho
                      onClick={() => {
                        if (confirm(`Excluir o banner de ${b.cliente}?`)) excluir.mutate(b);
                      }}
                    >
                      <Trash2 size={15} />
                    </BotaoIcone>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function BotaoIcone({
  children,
  titulo,
  onClick,
  desativado,
  vermelho,
}: {
  children: React.ReactNode;
  titulo: string;
  onClick: () => void;
  desativado?: boolean;
  vermelho?: boolean;
}) {
  return (
    <button
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      disabled={desativado}
      className={`w-8 h-8 rounded-md flex items-center justify-center border border-[color:var(--border)] transition disabled:opacity-30 ${
        vermelho ? "text-red-600 hover:bg-red-50" : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

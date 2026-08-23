import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Upload, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, ImageIcon, Link as LinkIcon, ExternalLink, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROPORCAO_BANNER, PROPORCAO_RETRATO } from "@/components/Banners";
import { PROPORCAO_FAIXA } from "@/components/Faixa";
import { prepararImagem } from "@/lib/imagem";
import { normalizarLink, linkLegivel } from "@/lib/link";

export const Route = createFileRoute("/_authenticated/admin/banners")({ component: BannersAdmin });

// Cada formato tem sua moldura, sua largura ideal e seu recado na tela.
const FORMATOS: Record<string, { proporcao: string; largura: number; medida: string; onde: string }> = {
  retrato: {
    proporcao: PROPORCAO_RETRATO,
    largura: 1080,
    medida: "1080 x 1350 pixels (o mesmo do post de Instagram, 4 por 5)",
    onde: "na página inicial, logo depois das notícias",
  },
  cartao: {
    proporcao: PROPORCAO_BANNER,
    largura: 1080,
    medida: "900 x 500 pixels (proporção de cartão de visita, 9 por 5)",
    onde: "na página inicial, logo depois das notícias",
  },
  faixa: {
    proporcao: PROPORCAO_FAIXA,
    largura: 1600,
    medida: "1200 x 200 pixels (faixa larga, 6 por 1)",
    onde: "no topo e no rodapé de todas as páginas do site",
  },
};

const formatoDe = (espaco: any) => FORMATOS[espaco?.formato ?? "retrato"] ?? FORMATOS.retrato;

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
    qc.invalidateQueries({ queryKey: ["banners", "faixa"] });
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

  // Os quatro da home primeiro, a faixa por último — na mesma ordem em que
  // aparecem no site, para não confundir quem está cadastrando.
  const espacos = [...((data?.espacos ?? []) as any[])].sort(
    (a, b) =>
      Number(a.formato === "faixa") - Number(b.formato === "faixa") || a.id - b.id,
  );
  const banners = (data?.banners ?? []) as any[];

  return (
    <div>
      <h1 className="titulo-secao text-2xl mb-2">Banners</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        A <strong className="text-gray-700">faixa</strong> aparece no topo e no rodapé de todas as
        páginas e aceita até 3 clientes. Os <strong className="text-gray-700">quatro espaços da
        home</strong> ficam na página inicial, depois das notícias, no formato de post de
        Instagram. Onde houver mais de um cliente, eles giram em rodízio. Espaço vazio vira um
        convite "Anuncie aqui".
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
          <strong className="text-gray-900">Tamanho da arte:</strong> os quatro espaços da home
          pedem <strong>1080 x 1350 pixels</strong> — a mesma arte do post de Instagram. A faixa
          pede <strong>1200 x 200</strong>. Mande em
          JPG, PNG ou WEBP — o arquivo é reduzido sozinho antes de subir, então pode enviar a arte em
          alta. Imagem fora da proporção é cortada nas bordas para não quebrar o layout, por isso
          evite deixar texto ou logo colado na beirada.
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

  const formato = formatoDe(espaco);
  const teto = espaco.limite ?? 99;
  const cheio = banners.length >= teto;

  async function enviarArquivo(arquivo: File) {
    onErro("");

    if (!cliente.trim()) {
      onErro("Informe o nome do cliente antes de enviar a imagem.");
      return;
    }
    if (cheio) {
      onErro(`Este espaço já está com ${espaco.limite} anunciante(s). Remova um antes de adicionar outro.`);
      return;
    }

    setEnviando(true);

    // Reduz no navegador para a largura do formato antes de subir
    let pronta;
    try {
      pronta = await prepararImagem(arquivo, formato.largura);
    } catch (e: any) {
      setEnviando(false);
      onErro(e?.message ?? "Não foi possível preparar a imagem.");
      return;
    }

    const caminho = `espaco-${espaco.id}/${Date.now()}.${pronta.extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from("banners")
      .upload(caminho, pronta.arquivo, {
        cacheControl: "31536000",
        contentType: pronta.tipo,
        upsert: false,
      });

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
      link: normalizarLink(link),
      ordem: proximaOrdem,
      ativo: true,
    }]);

    setEnviando(false);

    if (error) {
      // O banco também cobra o teto de anunciantes, então a imagem pode subir
      // e o registro ser recusado. Nesse caso o arquivo órfão sai daqui.
      await supabase.storage.from("banners").remove([caminho]);
      onErro(`Não foi possível salvar o banner: ${error.message}`);
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
          <p className="text-xs text-gray-400 mt-0.5">
            Aparece {formato.onde} · arte {formato.medida}
            {teto < 99 && ` · até ${teto} clientes`}
          </p>
          <p className="text-sm text-gray-500 mt-1">
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
                placeholder="site, Instagram ou WhatsApp do cliente"
                className="campo"
              />
              <span className="text-[11px] text-gray-400 leading-relaxed">
                Pode escrever do jeito simples: <strong>padaria.com.br</strong>,{" "}
                <strong>instagram.com/padaria</strong> ou só o número do WhatsApp. O anúncio
                sempre abre numa aba nova.
              </span>
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
              disabled={enviando || cheio}
              className="botao-vermelho flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-60"
            >
              <Upload size={16} />
              {enviando
                ? "Enviando..."
                : cheio
                  ? `Espaço lotado (${teto} clientes)`
                  : "Escolher imagem e publicar"}
            </button>

            {cheio && (
              <p className="text-xs text-gray-500 leading-relaxed">
                Para entrar um cliente novo, exclua ou tire do ar um dos que já estão aqui.
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="rotulo mb-3">Banners deste espaço</p>

          {banners.length === 0 ? (
            <div
              className="rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-400"
              style={{ aspectRatio: formato.proporcao }}
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
                    className={`${espaco.formato === "faixa" ? "w-44" : espaco.formato === "retrato" ? "w-24" : "w-32"} rounded-lg object-cover border border-[color:var(--border)] ${
                      b.ativo ? "" : "opacity-40 grayscale"
                    }`}
                    style={{ aspectRatio: formato.proporcao }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{b.cliente}</p>
                    <CampoLink banner={b} salvarBanner={salvarBanner} />
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

/**
 * Link de destino do banner, editável direto na lista.
 *
 * Antes o link só podia ser definido no cadastro. Se o cliente mandasse o
 * endereço depois — ou trocasse de site — era preciso excluir o banner e
 * subir a arte de novo.
 */
function CampoLink({ banner, salvarBanner }: any) {
  const [valor, setValor] = useState(banner.link ?? "");
  const [salvo, setSalvo] = useState(false);

  function guardar() {
    const pronto = normalizarLink(valor);
    if (pronto === (banner.link ?? null)) return;
    salvarBanner.mutate({ id: banner.id, campos: { link: pronto } });
    setValor(pronto ?? "");
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <LinkIcon size={12} className="text-gray-400 shrink-0" />
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        placeholder="sem link — clique aqui para adicionar"
        aria-label={`Link de destino do banner de ${banner.cliente}`}
        className="w-full min-w-0 text-xs bg-transparent border-b border-dashed border-gray-300 focus:border-brand-primary outline-none py-0.5 text-gray-600 placeholder:text-gray-300"
      />
      {salvo ? (
        <Check size={13} className="text-green-600 shrink-0" />
      ) : banner.link ? (
        <a
          href={banner.link}
          target="_blank"
          rel="noreferrer noopener"
          title={`Abrir ${linkLegivel(banner.link)}`}
          className="text-gray-400 hover:text-brand-primary shrink-0"
        >
          <ExternalLink size={13} />
        </a>
      ) : null}
    </div>
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

// Prepara a imagem no próprio navegador antes de subir para o Supabase.
//
// Por que existe: a redação tira foto no celular e o arquivo sai com 4000px
// e 6 MB. Subir isso do jeito que veio deixa o portal lento para o leitor e
// enche o armazenamento à toa. Aqui a foto é reduzida para uma largura
// máxima e reconvertida, então o que sobe já é do tamanho certo para a tela.
//
// A proporção original é sempre mantida. O recorte para caber no card ou no
// topo da matéria é feito no CSS (object-cover), não aqui, para nunca perder
// pedaço da foto de forma permanente.

export const LARGURA_MAXIMA = 1600;
export const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB antes de reduzir

export interface ImagemPronta {
  arquivo: Blob;
  extensao: string;
  tipo: string;
  largura: number;
  altura: number;
  tamanhoOriginal: number;
  tamanhoFinal: number;
}

function carregar(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não consegui abrir esse arquivo como imagem."));
    };
    img.src = url;
  });
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao converter a imagem."))),
      tipo,
      qualidade,
    );
  });
}

function suportaWebp() {
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/**
 * Reduz a imagem para caber em `larguraMaxima` mantendo a proporção.
 * GIF passa direto, porque redesenhar no canvas mataria a animação.
 */
export async function prepararImagem(
  arquivo: File,
  larguraMaxima = LARGURA_MAXIMA,
): Promise<ImagemPronta> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem (JPG, PNG ou WEBP).");
  }

  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new Error("A imagem passa de 10 MB. Reduza o arquivo e tente de novo.");
  }

  if (arquivo.type === "image/gif") {
    return {
      arquivo,
      extensao: "gif",
      tipo: "image/gif",
      largura: 0,
      altura: 0,
      tamanhoOriginal: arquivo.size,
      tamanhoFinal: arquivo.size,
    };
  }

  const img = await carregar(arquivo);
  const escala = Math.min(1, larguraMaxima / img.naturalWidth);
  const largura = Math.round(img.naturalWidth * escala);
  const altura = Math.round(img.naturalHeight * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador não conseguiu processar a imagem.");

  // Fundo branco para PNG transparente não virar fundo preto no JPG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, largura, altura);

  const usaWebp = suportaWebp();
  const tipo = usaWebp ? "image/webp" : "image/jpeg";
  const blob = await paraBlob(canvas, tipo, 0.85);

  // Se a conversão saiu maior que o original e nada foi redimensionado,
  // não vale a pena: manda o arquivo como veio.
  if (escala === 1 && blob.size >= arquivo.size) {
    return {
      arquivo,
      extensao: arquivo.name.split(".").pop()?.toLowerCase() || "jpg",
      tipo: arquivo.type,
      largura,
      altura,
      tamanhoOriginal: arquivo.size,
      tamanhoFinal: arquivo.size,
    };
  }

  return {
    arquivo: blob,
    extensao: usaWebp ? "webp" : "jpg",
    tipo,
    largura,
    altura,
    tamanhoOriginal: arquivo.size,
    tamanhoFinal: blob.size,
  };
}

export function tamanhoLegivel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Planos de anúncio de vagas vendidos pela Kiwify.
// Troque cada `checkout` pela URL do produto correspondente no painel da Kiwify.

export interface Plano {
  id: string;
  nome: string;
  preco: number;
  meses: number;
  checkout: string;
  destaque?: boolean;
  selo?: string;
}

export const PLANOS: Plano[] = [
  {
    id: "mensal",
    nome: "Mensal",
    preco: 67,
    meses: 1,
    checkout: "https://pay.kiwify.com.br/TrocM9n",
  },
  {
    id: "trimestral",
    nome: "Trimestral",
    preco: 97,
    meses: 3,
    checkout: "https://pay.kiwify.com.br/Lv3zivo",
    destaque: true,
    selo: "Mais escolhido",
  },
  {
    id: "semestral",
    nome: "Semestral",
    preco: 177,
    meses: 6,
    checkout: "https://pay.kiwify.com.br/fsIe2rK",
    selo: "Melhor custo por mês",
  },
];

export const LIMITE_VAGAS = 5;

export const BENEFICIOS = [
  `Até ${LIMITE_VAGAS} vagas abertas ao mesmo tempo`,
  "Publicação imediata, sem espera",
  "Edite ou encerre suas vagas quando quiser",
  "Sua marca aparece no painel de vagas do portal",
  "Botão de WhatsApp direto para os candidatos",
];

const mensal = PLANOS[0].preco;

export function precoPorMes(p: Plano) {
  return p.preco / p.meses;
}

export function economia(p: Plano) {
  if (p.meses === 1) return 0;
  return Math.round((1 - precoPorMes(p) / mensal) * 100);
}

export function reais(valor: number) {
  const cheio = Number.isInteger(valor);
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cheio ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function periodo(p: Plano) {
  return p.meses === 1 ? "por mês" : `a cada ${p.meses} meses`;
}

export const STATUS_ASSINATURA: Record<
  string,
  { rotulo: string; cor: string; publica: boolean; recado: string }
> = {
  ativa: {
    rotulo: "Assinatura ativa",
    cor: "bg-green-100 text-green-700",
    publica: true,
    recado: "Tudo certo. Você pode publicar e editar suas vagas.",
  },
  pendente: {
    rotulo: "Aguardando pagamento",
    cor: "bg-yellow-100 text-yellow-700",
    publica: false,
    recado: "Assim que a Kiwify confirmar o pagamento, a publicação libera automaticamente.",
  },
  atrasada: {
    rotulo: "Pagamento atrasado",
    cor: "bg-orange-100 text-orange-700",
    publica: false,
    recado: "A mensalidade está em atraso. Regularize na Kiwify para voltar a publicar.",
  },
  cancelada: {
    rotulo: "Assinatura cancelada",
    cor: "bg-gray-200 text-gray-600",
    publica: false,
    recado: "Sua assinatura foi cancelada. Escolha um plano para voltar a publicar.",
  },
  reembolsada: {
    rotulo: "Assinatura reembolsada",
    cor: "bg-gray-200 text-gray-600",
    publica: false,
    recado: "A compra foi reembolsada. Escolha um plano para voltar a publicar.",
  },
  sem_assinatura: {
    rotulo: "Sem assinatura",
    cor: "bg-gray-200 text-gray-600",
    publica: false,
    recado: "Escolha um plano para publicar suas vagas no portal.",
  },
};

export function infoStatus(status?: string | null) {
  return STATUS_ASSINATURA[status ?? "sem_assinatura"] ?? STATUS_ASSINATURA.sem_assinatura;
}

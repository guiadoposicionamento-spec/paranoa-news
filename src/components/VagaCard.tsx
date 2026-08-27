import { Briefcase, MapPin, Clock } from "lucide-react";
import { formatarDataCurta } from "@/lib/site";
import { caminhoDeCampanha, normalizarWhatsApp } from "@/lib/whatsapp";

export interface Vaga {
  id: number;
  cargo: string;
  empresa: string;
  local?: string | null;
  tipo?: string | null;
  salario?: string | null;
  descricao?: string | null;
  requisitos?: string | null;
  contato?: string | null;
  status: string;
  created_at: string;
}

export function VagaCard({ vaga }: { vaga: Vaga }) {
  // O botão vai para a nossa página de passagem, não para o wa.me.
  // É ela que dispara o evento de contato no pixel e mantém o número do
  // cliente fora do endereço — veja src/lib/whatsapp.ts.
  const temWhats = normalizarWhatsApp(vaga.contato) !== null;

  return (
    <article className="cartao p-6 flex flex-col gap-3.5 hover:border-gray-300 transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-lg text-gray-900 leading-snug tracking-tight">{vaga.cargo}</h3>
          <p className="text-sm text-gray-500">{vaga.empresa}</p>
        </div>
        {vaga.salario && (
          <span className="shrink-0 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-md">
            {vaga.salario}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {vaga.local && (
          <span className="flex items-center gap-1"><MapPin size={13} /> {vaga.local}</span>
        )}
        {vaga.tipo && (
          <span className="flex items-center gap-1"><Briefcase size={13} /> {vaga.tipo}</span>
        )}
        <span className="flex items-center gap-1"><Clock size={13} /> {formatarDataCurta(vaga.created_at)}</span>
      </div>

      {vaga.descricao && <p className="text-sm text-gray-600 whitespace-pre-line">{vaga.descricao}</p>}

      {vaga.requisitos && (
        <div>
          <p className="rotulo mb-1.5">Requisitos</p>
          <p className="text-sm text-gray-600 whitespace-pre-line">{vaga.requisitos}</p>
        </div>
      )}

      {vaga.contato && (
        <div className="pt-2 border-t border-gray-100">
          <p className="rotulo mb-2">Como se candidatar</p>
          {temWhats ? (
            <a
              href={caminhoDeCampanha(vaga.id)}
              target="_blank"
              rel="noreferrer"
              className="botao-vermelho inline-block px-5 py-2.5 text-sm"
            >
              Chamar no WhatsApp
            </a>
          ) : (
            <p className="text-sm text-gray-700 break-words">{vaga.contato}</p>
          )}
        </div>
      )}
    </article>
  );
}

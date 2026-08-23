export interface VagaForm {
  cargo: string;
  empresa: string;
  local: string;
  tipo: string;
  salario: string;
  descricao: string;
  requisitos: string;
  contato: string;
  status: string;
}

export function vagaVazia(empresaPadrao = ""): VagaForm {
  return {
    cargo: "",
    empresa: empresaPadrao,
    local: "Paranoá, DF",
    tipo: "CLT",
    salario: "",
    descricao: "",
    requisitos: "",
    contato: "",
    status: "aberta",
  };
}

export const TIPOS_CONTRATO = [
  "CLT",
  "Meio período",
  "Temporário",
  "Freelancer",
  "Estágio",
  "Jovem aprendiz",
  "Autônomo",
];

const inputCls = "campo";

interface Props {
  valores: VagaForm;
  onChange: (v: VagaForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  salvando?: boolean;
  erro?: string;
  textoBotao?: string;
  travarEmpresa?: boolean;
}

export function VagaFormFields({
  valores,
  onChange,
  onSubmit,
  salvando,
  erro,
  textoBotao = "Publicar vaga",
  travarEmpresa,
}: Props) {
  const set = (patch: Partial<VagaForm>) => onChange({ ...valores, ...patch });

  return (
    <form onSubmit={onSubmit} className="cartao p-7 grid sm:grid-cols-2 gap-5">
      {erro && <p className="sm:col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg">{erro}</p>}

      <Campo label="Cargo">
        <input value={valores.cargo} onChange={(e) => set({ cargo: e.target.value })} className={inputCls} required />
      </Campo>

      <Campo label="Empresa">
        <input
          value={valores.empresa}
          onChange={(e) => set({ empresa: e.target.value })}
          className={`${inputCls} ${travarEmpresa ? "bg-gray-50 text-gray-500" : ""}`}
          readOnly={travarEmpresa}
          required
        />
      </Campo>

      <Campo label="Local">
        <input value={valores.local} onChange={(e) => set({ local: e.target.value })} className={inputCls} />
      </Campo>

      <Campo label="Tipo de contrato">
        <select value={valores.tipo} onChange={(e) => set({ tipo: e.target.value })} className={inputCls}>
          {TIPOS_CONTRATO.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Campo>

      <Campo label="Salário / remuneração">
        <input
          value={valores.salario}
          onChange={(e) => set({ salario: e.target.value })}
          placeholder="Ex: R$ 1.800 + benefícios"
          className={inputCls}
        />
      </Campo>

      <Campo label="Contato (WhatsApp só números, e-mail ou link)">
        <input
          value={valores.contato}
          onChange={(e) => set({ contato: e.target.value })}
          placeholder="Ex: 61999999999"
          className={inputCls}
        />
      </Campo>

      <div className="sm:col-span-2">
        <Campo label="Descrição da vaga">
          <textarea
            value={valores.descricao}
            onChange={(e) => set({ descricao: e.target.value })}
            className={`${inputCls} h-24`}
          />
        </Campo>
      </div>

      <div className="sm:col-span-2">
        <Campo label="Requisitos">
          <textarea
            value={valores.requisitos}
            onChange={(e) => set({ requisitos: e.target.value })}
            className={`${inputCls} h-24`}
          />
        </Campo>
      </div>

      <Campo label="Status">
        <select value={valores.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
          <option value="aberta">Aberta</option>
          <option value="encerrada">Encerrada</option>
        </select>
      </Campo>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={salvando}
          className="botao-vermelho py-3.5 text-sm w-full disabled:opacity-60"
        >
          {salvando ? "Salvando..." : textoBotao}
        </button>
      </div>
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

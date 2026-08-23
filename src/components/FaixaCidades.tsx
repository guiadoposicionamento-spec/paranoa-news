/**
 * Faixa vermelha com os nomes das regiões atendidas, rolando sem parar.
 *
 * Serve a dois donos ao mesmo tempo. Para o leitor que cai de paraquedas
 * numa matéria, deixa claro em dois segundos que este jornal fala do lugar
 * onde ele mora. Para o Google, põe os nomes das regiões em toda página do
 * site — e é assim que o buscador associa o portal a cada bairro.
 *
 * O truque do rolar infinito: a lista é escrita duas vezes, lado a lado, e
 * a tira anda até exatamente metade do próprio comprimento. Nesse ponto o
 * que está na tela é idêntico ao começo, então a volta ao zero não aparece.
 */

export const REGIOES_ATENDIDAS = [
  "Paranoá",
  "Itapoã",
  "Sobradinho dos Melos",
  "Mandala",
  "Itapoã Parque",
  "Cond. Novo Horizonte",
  "Paranoá Parque",
  "Cond. Entre Lagos",
  "Água de Coco",
  "Curral",
  "Euler Paranhos",
  "Cond. La Fonte",
  "Lago Norte",
  "Varjão",
  "Jardim Botânico",
];

function Lista({ oculta }: { oculta?: boolean }) {
  return (
    <ul className="faixa-cidades-lista" aria-hidden={oculta || undefined}>
      {REGIOES_ATENDIDAS.map((cidade) => (
        <li key={cidade}>
          {cidade}
          <span className="faixa-cidades-ponto" aria-hidden="true">
            •
          </span>
        </li>
      ))}
    </ul>
  );
}

export function FaixaCidades() {
  return (
    <div className="faixa-cidades" aria-label="Regiões atendidas pelo Paranoá News">
      <div className="faixa-cidades-tira">
        <Lista />
        {/* Cópia só para o efeito visual: o leitor de tela lê a lista uma vez */}
        <Lista oculta />
      </div>
    </div>
  );
}

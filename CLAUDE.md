# Paranoá News

Portal de notícias do Paranoá, Itapoã, Paranoá Parque e Itapoã Parque (DF).
TanStack Start + Supabase, publicado no Netlify.

## Skills instaladas neste projeto

Ficam em `.agents/skills/` (com atalhos em `.claude/skills/`). Consulte-as
antes de mexer em interface — não são leitura opcional.

| Skill | Quando usar |
|---|---|
| `detalhes-de-interface` | **Sempre** que criar ou revisar tela, componente, card, botão ou tipografia |
| `animate` | Ao adicionar qualquer movimento novo |
| `review-animations` | Ao revisar movimento que já existe |
| `improve-animations` | Auditoria de movimento no site inteiro |
| `find-animation-opportunities` | Procurar onde o movimento ajudaria de verdade |
| `animation-vocabulary` | Vocabulário e valores de curva/duração |
| `apple-design` | Referência de interface fluida |
| `prototype` | Comparar versões diferentes antes de decidir |
| `pick-ui-library` | Escolher biblioteca de componente |

Regra de ouro das skills de animação: **nem tudo precisa animar**. A decisão
de não animar é resultado válido.

## Convenções do projeto

- **Idioma:** tudo em português — nome de variável, função, comentário,
  commit. O portal é local e quem der manutenção fala português.
- **Comentário explica o porquê, não o quê.** Se a linha é óbvia, não
  comente. Se houve uma decisão ou uma armadilha, registre o motivo.
- **CSS de componente vive dentro de `@layer components`** no `index.css`.
  Fora da camada, o CSS ganha das utilidades do Tailwind e quebra
  espaçamento de forma difícil de achar.
- **Nada de `<label>` em volta de bloco que tenha botão dentro** — o clique
  no bloco é repassado ao primeiro botão. Já causou um defeito no editor.
- **Toda consulta que muda dado precisa limpar o cache** correspondente do
  TanStack Query, senão a tela mostra valor velho. Veja `src/lib/cacheNoticias.ts`.
- **Segurança fecha por padrão.** O webhook da Kiwify recusa tudo sem o
  segredo cadastrado; políticas do banco negam por omissão.
- **Script de fora do site só funciona se entrar na CSP** do `netlify.toml`
  (`script-src` para o arquivo, `connect-src` para onde ele manda dados).
  Sem isso o navegador bloqueia calado e nada aparece no console de quem
  não estiver olhando. Foi o caso do pixel da Meta.
- **Medição de página é feita à mão**, em `src/components/PixelDeRota.tsx`.
  O site nunca recarrega, então nenhuma ferramenta de análise conta as
  visitas sozinha — quem trocar de ferramenta precisa refazer isso.
- **Botão de WhatsApp de vaga nunca aponta para o `wa.me` direto.** Passa
  por `/ir/vaga/:id`, que dispara o evento de conversão e mantém o telefone
  do cliente fora do endereço — é o link que vai nos anúncios da Meta.
  Encurtar esse caminho quebra a campanha e expõe o número.

## Estrutura

- `src/routes/` — páginas (públicas, `_authenticated` = redação, `_empresa` = anunciante)
- `src/components/` — componentes reutilizáveis
- `src/lib/` — regras sem interface (texto, imagem, link, planos, cache)
- `netlify/edge-functions/` — SEO e mapa do site, rodam antes da página sair
- `supabase/functions/` — webhook de pagamento
- `supabase.sql` — referência do banco, seção por seção

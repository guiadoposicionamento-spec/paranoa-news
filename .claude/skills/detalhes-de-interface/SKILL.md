---
name: detalhes-de-interface
description: Detalhes pequenos de CSS que fazem a interface parecer bem-feita — quebra de linha em títulos, raio de borda concêntrico, números tabulares, sombras no lugar de bordas, contorno em imagens, alinhamento óptico de ícones. Use ao criar ou revisar qualquer tela, componente, card, botão ou tipografia deste portal. Baseado em jakub.kr/writing/details-that-make-interfaces-feel-better.
---

# Detalhes que fazem a interface parecer bem-feita

Cada item aqui custa uma linha de CSS e é a diferença entre "funciona" e
"foi feito por alguém que se importa". Aplique ao escrever componente novo e
confira ao revisar componente existente.

Fonte: Jakub Krehel, *Details that make interfaces feel better*.

## 1. Quebra de linha do texto

```css
h1, h2, h3, .titulo-hero, .titulo-secao { text-wrap: balance; }
p, .subtitulo                           { text-wrap: pretty; }
```

`balance` distribui as palavras igualmente entre as linhas — evita o título
com quatro palavras na primeira linha e uma na segunda. `pretty` impede a
palavra órfã sozinha no fim do parágrafo.

Num portal de notícias isso pesa: manchete é o elemento mais visto do site.

## 2. Raio de borda concêntrico

Quando um elemento arredondado está dentro de outro:

```
raio externo = raio interno + espaçamento
```

Exemplo: card com `border-radius: 20px` e `padding: 8px` pede que a imagem
interna tenha `border-radius: 12px`. Raios que não se encaixam deixam um
crescente de espaço torto no canto — o olho percebe antes da cabeça.

## 3. Números tabulares

```css
font-variant-numeric: tabular-nums;   /* Tailwind: tabular-nums */
```

Em qualquer lugar onde números mudam ou se alinham em coluna: contador de
vagas, datas, preços dos planos, relógio. Sem isso a largura do dígito varia
e o texto ao lado pula a cada atualização.

## 4. Sombra no lugar de borda

```css
box-shadow:
  0 0 0 1px rgba(0,0,0,0.06),
  0 1px 2px -1px rgba(0,0,0,0.06),
  0 2px 4px 0 rgba(0,0,0,0.04);
transition-property: box-shadow;
```

A primeira linha faz o papel da borda, as outras duas dão profundidade. No
hover, aumente um pouco a opacidade em vez de trocar a cor. Funciona sobre
fundo de qualquer cor, coisa que borda sólida não faz.

No escuro: `0 0 0 1px rgba(255,255,255,0.08)`.

## 5. Contorno nas imagens

```css
outline: 1px solid rgba(0,0,0,0.1);
outline-offset: -1px;
```

Foto clara sobre fundo claro some. O contorno por dentro (offset negativo)
segura a borda sem alterar o tamanho do elemento nem brigar com o
`border-radius`.

## 6. Alinhamento óptico de ícone

Ícone dentro de botão com texto quase nunca fica certo no alinhamento
geométrico. Diminua o espaçamento do lado do ícone. O ideal é corrigir a
margem dentro do próprio SVG.

## 7. Transição em vez de keyframe

Para qualquer coisa que o usuário possa interromper — menu, dropdown,
acordeão — use `transition`, não `@keyframes`. Transição interpola para o
estado mais recente e pode ser cancelada no meio. Keyframe só para sequência
fixa que sempre roda até o fim (a faixa de cidades, por exemplo).

## 8. Entrada escalonada

Ao revelar vários elementos, atrase cada um:

- 100 ms entre blocos/seções
- 80 ms entre itens de lista ou palavras

Anime `opacity`, `translateY` e `blur` juntos. Um bloco inteiro aparecendo
de uma vez parece mais duro do que os mesmos elementos em cascata.

## 9. Saída mais discreta que a entrada

A saída não merece a mesma atenção da entrada. Em vez de repetir o
movimento ao contrário, saia só com `opacity: 0` e `filter: blur(4px)`.
Fica bem mais suave.

## 10. Suavização de fonte

```css
body { -webkit-font-smoothing: antialiased; }
```

No macOS o texto sai mais fino e nítido. Já está aplicado no `index.css`
deste projeto.

---

## Antes de dar por pronto

- [ ] Título com `text-wrap: balance`, parágrafo com `pretty`
- [ ] Raios de borda concêntricos onde há elemento dentro de elemento
- [ ] `tabular-nums` em tudo que é número que muda
- [ ] Imagem com contorno sutil
- [ ] Menu e dropdown com `transition`, nunca `@keyframes`
- [ ] Saída mais discreta que a entrada
- [ ] `prefers-reduced-motion` respeitado

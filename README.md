# Paranoá News

Revista digital do Paranoá: notícias, denúncias da população, comércio local e vagas de emprego.

Stack: TanStack Start (SPA) + React 19 + Tailwind v4 + Supabase + deploy no Netlify.

---

## 1. Rodar na sua máquina

Precisa ter o Node.js 20 ou superior instalado.

```bash
npm install
npm run dev
```

O site abre em `http://localhost:3000`.

---

## 2. Supabase (já configurado)

O banco do projeto **Paranoá News** já está criado e com as tabelas aplicadas:

- Projeto: `nfzvhunorauozfpbmlou` (região us-east-2)
- Tabelas: `noticias`, `vagas`, `denuncias`, com Row Level Security ativa
- O arquivo `.env` já vem preenchido com a URL e a anon key

Login da redação em `/auth`:

- E-mail: `guiadoposicionamento@gmail.com`
- Senha provisória: `ParanoaNews@2026`

Troque essa senha no painel do Supabase em **Authentication > Users**. Para dar acesso a outra
pessoa da redação, crie o usuário lá mesmo em **Add user** (marque "Auto Confirm User").

O arquivo `supabase.sql` guarda a estrutura completa, caso você precise recriar o banco do zero
em outro projeto.

---

## 3. Estrutura do portal

| Endereço | O que é |
|---|---|
| `/` | Home com destaque, últimas notícias e vagas |
| `/categoria/{slug}` | Editorias: notícias, denúncias, comércio local, vagas, política, segurança, cultura, esportes |
| `/noticia/{slug}` | Página da matéria |
| `/denuncie` | Formulário público de denúncia (pode ser anônima) |
| `/vagas` | Painel público de vagas com busca |
| `/anuncie` | Página de venda do plano + cadastro e login das empresas |
| `/painel` | Área da empresa: assinatura e gestão das próprias vagas |
| `/auth` | Login da redação |
| `/admin` | Painel com os números do portal |
| `/admin/noticias` | Criar, editar, publicar e excluir matérias |
| `/admin/vagas` | Todas as vagas, da redação e das empresas |
| `/admin/denuncias` | Caixa de denúncias recebidas, com status de apuração |
| `/admin/banners` | Banners de publicidade: upload, ordem e rodízio |
| `/admin/assinantes` | Assinantes ativos e o histórico de eventos da Kiwify |

### Segurança das denúncias

A política de acesso do banco permite que qualquer visitante **envie** uma denúncia, mas somente a
redação logada consegue **ler** os relatos. Denúncia marcada como anônima não grava nome nem contato.

---

## 3.1 Plano de vagas pago (Kiwify)

### Os planos

| Plano | Preço | Duração | Por mês |
|---|---|---|---|
| Mensal | R$ 67 | 1 mês | R$ 67,00 |
| Trimestral | R$ 97 | 3 meses | R$ 32,33 |
| Semestral | R$ 177 | 6 meses | R$ 29,50 |

Os três dão o mesmo: até 5 vagas abertas ao mesmo tempo. A diferença é só o prazo e o desconto.

Preço e duração ficam em dois lugares que precisam bater:

- `src/lib/planos.ts` — o que aparece na tela
- tabela `planos` no Supabase — a coluna `meses` é o que o webhook usa para calcular a validade

### Como funciona

1. A empresa entra em `/anuncie`, escolhe um plano, paga pela Kiwify e cria a conta no portal
   **com o mesmo e-mail usado na compra**. É o e-mail que liga o pagamento à conta.
2. A Kiwify avisa o portal por webhook. O portal identifica qual plano foi comprado, soma os meses
   correspondentes e grava o status e a validade na tabela `assinaturas`. Renovando antes de vencer,
   o tempo novo é somado ao que ainda restava, então ninguém perde dias pagos.
3. Com a assinatura ativa, a empresa publica, edita, encerra e exclui as próprias vagas em `/painel`,
   com **limite de 5 vagas abertas ao mesmo tempo**. Encerrar uma libera espaço para outra.
4. Se a mensalidade atrasar ou a assinatura for cancelada, as vagas daquela empresa **somem do site**
   e a publicação trava. Renovando, tudo volta sozinho, sem precisar recadastrar nada.

O limite e o bloqueio são aplicados no banco de dados, não na tela. Mesmo que alguém tente burlar o
site, o Postgres recusa a operação.

### O que falta configurar

**a) As URLs de checkout**

Em `src/lib/planos.ts`, troque o campo `checkout` de cada um dos três planos pelo link do produto
correspondente na Kiwify.

**a2) Amarrar cada produto da Kiwify ao seu plano (recomendado)**

O webhook identifica o plano pelo nome do produto ("mensal", "trimestral", "semestral"). Se os seus
produtos na Kiwify tiverem outro nome, cadastre o id de cada um para não haver dúvida. No SQL Editor:

```sql
update public.planos set kiwify_product_id = 'ID_DO_PRODUTO_MENSAL'     where id = 'mensal';
update public.planos set kiwify_product_id = 'ID_DO_PRODUTO_TRIMESTRAL' where id = 'trimestral';
update public.planos set kiwify_product_id = 'ID_DO_PRODUTO_SEMESTRAL'  where id = 'semestral';
```

Sem isso e sem o nome bater, o webhook assume o plano mensal por segurança (libera menos tempo, nunca
mais do que o comprado).

**b) O webhook na Kiwify**

No painel da Kiwify, em Apps > Webhooks, crie um webhook apontando para:

```
https://nfzvhunorauozfpbmlou.supabase.co/functions/v1/kiwify-webhook
```

Marque os eventos: compra aprovada, compra reembolsada, chargeback, assinatura renovada,
assinatura atrasada e assinatura cancelada.

**c) O token do webhook**

A Kiwify mostra um token junto do webhook. Copie e cadastre no Supabase em
**Edge Functions > Secrets**, com o nome:

```
KIWIFY_WEBHOOK_TOKEN
```

Sem esse token a função aceita qualquer chamada, então configure antes de divulgar o plano.

**d) Conferir**

Use o botão "Testar webhook" da Kiwify e abra `/admin/assinantes` > aba "Eventos da Kiwify".
O evento tem que aparecer marcado como **verificado**.

### Liberar uma assinatura na mão

Se precisar destravar uma empresa sem esperar o webhook, rode no SQL Editor do Supabase:

```sql
-- troque o intervalo conforme o plano: 1 month, 3 months ou 6 months
insert into public.assinaturas (email, nome, plano, plano_id, status, inicio, expira_em, ultimo_evento)
values ('email-da-empresa@exemplo.com', 'Nome da Empresa', 'Trimestral', 'trimestral', 'ativa',
        now(), now() + interval '3 months', 'liberado manualmente')
on conflict (email) do update
set status = 'ativa', expira_em = now() + interval '3 months';
```

---

## 3.2 Banners de publicidade

Três espaços aparecem na home, entre as notícias e os atalhos de serviço. No desktop ficam lado a
lado, no celular um embaixo do outro. A proporção é a de um cartão de visita (9 por 5).

Gestão em `/admin/banners`:

- **Upload direto**: escolha o arquivo no computador, sem precisar hospedar a imagem em outro lugar
- **Vários banners por espaço**: adicione quantos quiser e eles giram em rodízio automático
- **Intervalo do rodízio**: configurável por espaço, de 2 a 60 segundos
- **Ordem**: setas para subir e descer cada banner na fila
- **Ligar e desligar**: tire do ar sem perder a imagem
- **Espaço inteiro oculto**: se quiser esconder um dos três blocos
- **Período do contrato**: os campos `inicio` e `fim` na tabela `banners` fazem o banner entrar e
  sair do ar sozinho na data combinada

### Tamanho da imagem

Use **900 x 500 pixels** (ou 1080 x 600), em JPG, PNG ou WEBP, até 5 MB. Imagem fora da proporção
9 por 5 é cortada nas bordas para não quebrar o layout da página.

### Espaço sem anunciante

Vira automaticamente um convite "Anuncie aqui" que leva para `/anuncie`. Assim nenhum buraco
aparece na home e o espaço vazio ainda trabalha vendendo.

As imagens ficam no Storage do Supabase, no bucket `banners` (público para leitura, gravação só
para a redação logada).

---

## 4. Personalizar

- **Plano, preço e checkout**: `src/lib/planos.ts`
- **Cores da marca**: `src/index.css` (variáveis `--brand-primary` e `--brand-secondary`)
- **Categorias**: `src/lib/categorias.ts`
- **Nome, e-mail e redes**: `src/lib/site.ts`
- **Logo e imagem de compartilhamento**: `public/logo.png` e `public/og-image.jpg`

---

## 5. Publicar no Netlify

```bash
git init
git add .
git commit -m "feat: portal Paranoa News"
git remote add origin https://github.com/SEU_USUARIO/paranoa-news.git
git push -u origin main
```

No Netlify:

1. **New site from Git** e selecione o repositório
2. Build command: `npm run build`
3. Publish directory: `dist/client`
4. Em **Environment variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
5. Deploy

O arquivo `public/_redirects` já está configurado para o site funcionar como SPA.

---

## 6. Adicionar uma rota nova

1. Crie o arquivo em `src/routes/`
2. Abra `src/routeTree.gen.ts` e adicione o import, a constante `.update()` e registre a rota
   em todas as interfaces do arquivo

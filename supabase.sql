-- =====================================================================
-- Paranoá News: estrutura completa do banco no Supabase
-- Já aplicada no projeto nfzvhunorauozfpbmlou.
-- Este arquivo serve para recriar tudo do zero em outro projeto.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. NOTÍCIAS
-- ---------------------------------------------------------------------
create table if not exists public.noticias (
  id bigserial primary key,
  titulo text not null,
  slug text not null unique,
  resumo text,
  conteudo text,
  conteudo_html text,
  foto_capa text,
  categoria text not null,
  autor text not null default 'Redação',
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  destaque_ordem int,
  data_publicacao timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists noticias_status_data_idx on public.noticias (status, data_publicacao desc);
create index if not exists noticias_categoria_status_idx on public.noticias (categoria, status);
create index if not exists noticias_slug_idx on public.noticias (slug);

alter table public.noticias enable row level security;

-- ---------------------------------------------------------------------
-- 2. VAGAS
-- ---------------------------------------------------------------------
create table if not exists public.vagas (
  id bigserial primary key,
  cargo text not null,
  empresa text not null,
  local text,
  tipo text,
  salario text,
  descricao text,
  requisitos text,
  contato text,
  status text not null default 'aberta' check (status in ('aberta', 'encerrada')),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists vagas_status_data_idx on public.vagas (status, created_at desc);
create index if not exists vagas_user_idx on public.vagas (user_id, status);

alter table public.vagas enable row level security;

-- ---------------------------------------------------------------------
-- 3. DENÚNCIAS
-- ---------------------------------------------------------------------
create table if not exists public.denuncias (
  id bigserial primary key,
  assunto text not null,
  local text,
  descricao text not null,
  nome text,
  contato text,
  anonima boolean not null default true,
  status text not null default 'nova' check (status in ('nova', 'apurando', 'publicada', 'arquivada')),
  created_at timestamptz not null default now()
);

create index if not exists denuncias_status_data_idx on public.denuncias (status, created_at desc);

alter table public.denuncias enable row level security;

-- ---------------------------------------------------------------------
-- 4. PERFIS: separa redação de empresa anunciante
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  papel text not null default 'empresa' check (papel in ('redacao', 'empresa')),
  nome text,
  email text,
  telefone text,
  created_at timestamptz not null default now()
);

alter table public.perfis enable row level security;

create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, papel, nome, email, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'papel', 'empresa'),
    new.raw_user_meta_data->>'nome',
    new.email,
    new.raw_user_meta_data->>'telefone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- ---------------------------------------------------------------------
-- 5. ASSINATURAS (alimentadas pelo webhook da Kiwify)
-- ---------------------------------------------------------------------
create table if not exists public.assinaturas (
  id bigserial primary key,
  email text not null unique,
  nome text,
  telefone text,
  kiwify_order_id text,
  kiwify_subscription_id text,
  plano text,
  status text not null default 'pendente'
    check (status in ('pendente', 'ativa', 'atrasada', 'cancelada', 'reembolsada')),
  inicio timestamptz,
  expira_em timestamptz,
  ultimo_evento text,
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists assinaturas_status_idx on public.assinaturas (status, expira_em desc);
alter table public.assinaturas enable row level security;

-- Planos vendidos na Kiwify. A coluna meses é o que o webhook usa
-- para calcular até quando a assinatura vale.
create table if not exists public.planos (
  id text primary key,
  nome text not null,
  meses int not null,
  preco numeric(10,2) not null,
  kiwify_product_id text,
  kiwify_product_name text,
  ativo boolean not null default true,
  ordem int not null default 0
);

alter table public.planos enable row level security;

insert into public.planos (id, nome, meses, preco, ordem) values
  ('mensal',     'Mensal',     1,  67.00, 1),
  ('trimestral', 'Trimestral', 3,  97.00, 2),
  ('semestral',  'Semestral',  6, 177.00, 3)
on conflict (id) do update
set nome = excluded.nome, meses = excluded.meses, preco = excluded.preco, ordem = excluded.ordem;

alter table public.assinaturas add column if not exists plano_id text references public.planos(id);

create table if not exists public.kiwify_eventos (
  id bigserial primary key,
  evento text,
  email text,
  assinatura_valida boolean,
  payload jsonb,
  recebido_em timestamptz not null default now()
);

alter table public.kiwify_eventos enable row level security;

-- ---------------------------------------------------------------------
-- 6. FUNÇÕES DE APOIO
-- ---------------------------------------------------------------------
create or replace function public.eh_redacao()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'redacao');
$$;

create or replace function public.meu_email()
returns text language sql stable security definer set search_path = public as $$
  select lower(u.email) from auth.users u where u.id = auth.uid();
$$;

create or replace function public.assinatura_ativa(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assinaturas a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = uid and a.status = 'ativa' and a.expira_em > now()
  );
$$;

create or replace function public.minha_assinatura()
returns table (status text, plano text, expira_em timestamptz, atualizado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select a.status, a.plano, a.expira_em, a.atualizado_em
  from public.assinaturas a
  join auth.users u on lower(u.email) = lower(a.email)
  where u.id = auth.uid();
$$;

revoke all on function public.criar_perfil_novo_usuario() from public, anon, authenticated;
revoke execute on function public.eh_redacao() from anon, public;
revoke execute on function public.meu_email() from anon, public;
revoke execute on function public.minha_assinatura() from anon, public;
revoke execute on function public.assinatura_ativa(uuid) from public;
grant execute on function public.eh_redacao() to authenticated;
grant execute on function public.meu_email() to authenticated;
grant execute on function public.minha_assinatura() to authenticated;
grant execute on function public.assinatura_ativa(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. LIMITE DE 5 VAGAS ABERTAS POR EMPRESA
-- ---------------------------------------------------------------------
create or replace function public.checar_limite_vagas()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  abertas int;
begin
  if public.eh_redacao() then
    return new;
  end if;

  if new.user_id is null then
    raise exception 'Vaga sem empresa vinculada.';
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'Você só pode gerenciar as vagas da sua própria empresa.';
  end if;

  if not public.assinatura_ativa(new.user_id) then
    raise exception 'Assinatura inativa. Renove para publicar ou reabrir vagas.';
  end if;

  if new.status = 'aberta' then
    select count(*) into abertas
    from public.vagas v
    where v.user_id = new.user_id and v.status = 'aberta'
      and (tg_op = 'INSERT' or v.id <> new.id);

    if abertas >= 5 then
      raise exception 'Limite de 5 vagas abertas atingido. Encerre uma vaga para publicar outra.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.checar_limite_vagas() from public, anon, authenticated;

drop trigger if exists trg_limite_vagas on public.vagas;
create trigger trg_limite_vagas
  before insert or update on public.vagas
  for each row execute function public.checar_limite_vagas();

-- ---------------------------------------------------------------------
-- 8. POLÍTICAS DE ACESSO
-- ---------------------------------------------------------------------

-- NOTÍCIAS: público lê o que está publicado, só a redação escreve
drop policy if exists "Leitura publica de noticias" on public.noticias;
create policy "Leitura publica de noticias" on public.noticias
  for select using (status = 'publicado');

drop policy if exists "Redacao gerencia noticias" on public.noticias;
create policy "Redacao gerencia noticias" on public.noticias
  for all to authenticated using (public.eh_redacao()) with check (public.eh_redacao());

-- VAGAS: vaga de empresa só aparece enquanto a assinatura estiver ativa
drop policy if exists "Leitura publica de vagas" on public.vagas;
create policy "Leitura publica de vagas" on public.vagas
  for select using (
    status = 'aberta' and (user_id is null or public.assinatura_ativa(user_id))
  );

drop policy if exists "Redacao gerencia vagas" on public.vagas;
create policy "Redacao gerencia vagas" on public.vagas
  for all to authenticated using (public.eh_redacao()) with check (public.eh_redacao());

drop policy if exists "Empresa le as proprias vagas" on public.vagas;
create policy "Empresa le as proprias vagas" on public.vagas
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Empresa publica vaga" on public.vagas;
create policy "Empresa publica vaga" on public.vagas
  for insert to authenticated
  with check (user_id = auth.uid() and public.assinatura_ativa(auth.uid()));

drop policy if exists "Empresa edita a propria vaga" on public.vagas;
create policy "Empresa edita a propria vaga" on public.vagas
  for update to authenticated
  using (user_id = auth.uid() and public.assinatura_ativa(auth.uid()))
  with check (user_id = auth.uid());

drop policy if exists "Empresa exclui a propria vaga" on public.vagas;
create policy "Empresa exclui a propria vaga" on public.vagas
  for delete to authenticated using (user_id = auth.uid());

-- DENÚNCIAS: qualquer um envia, só a redação lê
drop policy if exists "Qualquer um pode denunciar" on public.denuncias;
create policy "Qualquer um pode denunciar" on public.denuncias
  for insert to anon, authenticated with check (true);

drop policy if exists "So a redacao le denuncias" on public.denuncias;
create policy "So a redacao le denuncias" on public.denuncias
  for select to authenticated using (public.eh_redacao());

drop policy if exists "Redacao atualiza denuncias" on public.denuncias;
create policy "Redacao atualiza denuncias" on public.denuncias
  for update to authenticated using (public.eh_redacao()) with check (public.eh_redacao());

drop policy if exists "Redacao exclui denuncias" on public.denuncias;
create policy "Redacao exclui denuncias" on public.denuncias
  for delete to authenticated using (public.eh_redacao());

-- PERFIS
drop policy if exists "Le o proprio perfil" on public.perfis;
create policy "Le o proprio perfil" on public.perfis
  for select to authenticated using (id = auth.uid() or public.eh_redacao());

drop policy if exists "Edita o proprio perfil" on public.perfis;
create policy "Edita o proprio perfil" on public.perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and papel = 'empresa');

-- ASSINATURAS: só leitura. Quem escreve é o webhook, com a service role.
drop policy if exists "Le a propria assinatura" on public.assinaturas;
create policy "Le a propria assinatura" on public.assinaturas
  for select to authenticated
  using (public.eh_redacao() or lower(email) = public.meu_email());

drop policy if exists "Redacao le eventos kiwify" on public.kiwify_eventos;
create policy "Redacao le eventos kiwify" on public.kiwify_eventos
  for select to authenticated using (public.eh_redacao());

-- PLANOS
drop policy if exists "Planos sao publicos" on public.planos;
create policy "Planos sao publicos" on public.planos for select using (true);

drop policy if exists "Redacao gerencia planos" on public.planos;
create policy "Redacao gerencia planos" on public.planos
  for all to authenticated using (public.eh_redacao()) with check (public.eh_redacao());

-- ---------------------------------------------------------------------
-- 9. Matéria de estreia
-- ---------------------------------------------------------------------
insert into public.noticias (titulo, slug, resumo, conteudo, categoria, autor, status)
values (
  'Paranoá News no ar: o portal da nossa cidade',
  'paranoa-news-no-ar',
  'Chega ao ar a revista digital que reúne notícias, denúncias da população, comércio local e vagas de emprego do Paranoá.',
  '<p>O <strong>Paranoá News</strong> nasce com um objetivo simples: dar voz a quem mora aqui.</p>',
  'noticias', 'Redação', 'publicado'
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 10. BANNERS DE PUBLICIDADE
-- ---------------------------------------------------------------------
create table if not exists public.banner_espacos (
  id int primary key check (id between 1 and 3),
  nome text not null,
  intervalo_segundos int not null default 6 check (intervalo_segundos between 2 and 60),
  ativo boolean not null default true
);

insert into public.banner_espacos (id, nome) values
  (1, 'Espaço 1'), (2, 'Espaço 2'), (3, 'Espaço 3')
on conflict (id) do nothing;

alter table public.banner_espacos enable row level security;

drop policy if exists "Espacos sao publicos" on public.banner_espacos;
create policy "Espacos sao publicos" on public.banner_espacos for select using (true);

drop policy if exists "Redacao gerencia espacos" on public.banner_espacos;
create policy "Redacao gerencia espacos" on public.banner_espacos
  for all to authenticated using (public.eh_redacao()) with check (public.eh_redacao());

create table if not exists public.banners (
  id bigserial primary key,
  espaco int not null references public.banner_espacos(id) on delete cascade,
  cliente text not null,
  imagem_url text not null,
  imagem_path text,
  link text,
  ordem int not null default 0,
  ativo boolean not null default true,
  inicio date,
  fim date,
  created_at timestamptz not null default now()
);

create index if not exists banners_espaco_idx on public.banners (espaco, ordem, ativo);
alter table public.banners enable row level security;

drop policy if exists "Banners publicos" on public.banners;
create policy "Banners publicos" on public.banners
  for select using (
    ativo = true
    and (inicio is null or inicio <= current_date)
    and (fim is null or fim >= current_date)
  );

drop policy if exists "Redacao gerencia banners" on public.banners;
create policy "Redacao gerencia banners" on public.banners
  for all to authenticated using (public.eh_redacao()) with check (public.eh_redacao());

-- Armazenamento das imagens
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public = true;

drop policy if exists "Imagens de banner sao publicas" on storage.objects;
create policy "Imagens de banner sao publicas" on storage.objects
  for select using (bucket_id = 'banners');

drop policy if exists "Redacao envia banner" on storage.objects;
create policy "Redacao envia banner" on storage.objects
  for insert to authenticated with check (bucket_id = 'banners' and public.eh_redacao());

drop policy if exists "Redacao atualiza banner" on storage.objects;
create policy "Redacao atualiza banner" on storage.objects
  for update to authenticated using (bucket_id = 'banners' and public.eh_redacao());

drop policy if exists "Redacao apaga banner" on storage.objects;
create policy "Redacao apaga banner" on storage.objects
  for delete to authenticated using (bucket_id = 'banners' and public.eh_redacao());


-- =====================================================================
-- 11. IMAGENS DE CAPA DAS MATÉRIAS
--     A redação envia a foto pelo painel; ela é reduzida no navegador
--     antes de subir (src/lib/imagem.ts) e guardada neste bucket.
-- =====================================================================

alter table public.noticias add column if not exists foto_capa_path text;
comment on column public.noticias.foto_capa_path is
  'Caminho do arquivo no bucket noticias. Nulo quando a capa veio de uma URL externa.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('noticias', 'noticias', true, 10485760,
        array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Imagens de materia sao publicas" on storage.objects;
create policy "Imagens de materia sao publicas" on storage.objects
  for select using (bucket_id = 'noticias');

drop policy if exists "Redacao envia imagem de materia" on storage.objects;
create policy "Redacao envia imagem de materia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'noticias' and public.eh_redacao());

drop policy if exists "Redacao atualiza imagem de materia" on storage.objects;
create policy "Redacao atualiza imagem de materia" on storage.objects
  for update to authenticated
  using (bucket_id = 'noticias' and public.eh_redacao());

drop policy if exists "Redacao apaga imagem de materia" on storage.objects;
create policy "Redacao apaga imagem de materia" on storage.objects
  for delete to authenticated
  using (bucket_id = 'noticias' and public.eh_redacao());


-- =====================================================================
-- 12. FAIXA DE PUBLICIDADE EM TODAS AS PÁGINAS
--     Espaço 4, formato "faixa" (1200 x 200), exibido no topo e no rodapé
--     de toda página pública. Aceita no máximo 3 anunciantes em rodízio.
-- =====================================================================

alter table public.banner_espacos drop constraint if exists banner_espacos_id_check;
alter table public.banner_espacos add constraint banner_espacos_id_check check (id >= 1 and id <= 8);

alter table public.banner_espacos add column if not exists formato text not null default 'cartao';
alter table public.banner_espacos add column if not exists limite  integer not null default 99;

alter table public.banner_espacos drop constraint if exists banner_espacos_formato_check;
alter table public.banner_espacos add constraint banner_espacos_formato_check
  check (formato in ('cartao','faixa'));

insert into public.banner_espacos (id, nome, intervalo_segundos, ativo, formato, limite)
values (4, 'Faixa em todas as páginas', 7, true, 'faixa', 3)
on conflict (id) do update set
  nome    = excluded.nome,
  formato = excluded.formato,
  limite  = excluded.limite;

-- O teto de anunciantes é cobrado no banco, não só na tela do painel
create or replace function public.checar_limite_banners()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  teto   integer;
  atuais integer;
begin
  select limite into teto from public.banner_espacos where id = new.espaco;
  if teto is null then
    return new;
  end if;

  select count(*) into atuais
    from public.banners
   where espaco = new.espaco
     and (tg_op = 'INSERT' or id <> new.id);

  if atuais >= teto then
    raise exception 'Este espaço aceita no máximo % anunciante(s). Remova um antes de adicionar outro.', teto
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.checar_limite_banners() from anon, public;

drop trigger if exists trg_limite_banners on public.banners;
create trigger trg_limite_banners
  before insert or update of espaco on public.banners
  for each row execute function public.checar_limite_banners();


-- =====================================================================
-- 13. LEGENDA DA FOTO DE CAPA
--     Texto de crédito exibido abaixo da imagem, na página da matéria.
-- =====================================================================

alter table public.noticias add column if not exists foto_credito text;
comment on column public.noticias.foto_credito is
  'Legenda ou crédito exibido abaixo da foto de capa. Ex: "Foto: Corpo de Bombeiros/DF".';


-- =====================================================================
-- 14. ESPAÇOS DA HOME NO FORMATO DE POST DE INSTAGRAM
--     Os tres espacos passam de cartao de visita (9x5) para retrato (4x5)
--     e entra um quarto. A arte pedida vira 1080 x 1350.
-- =====================================================================

alter table public.banner_espacos drop constraint if exists banner_espacos_formato_check;
alter table public.banner_espacos add constraint banner_espacos_formato_check
  check (formato in ('cartao','retrato','faixa'));

update public.banner_espacos set formato = 'retrato' where id in (1,2,3);
update public.banner_espacos set nome = 'Espaço 1' where id = 1;
update public.banner_espacos set nome = 'Espaço 2' where id = 2;
update public.banner_espacos set nome = 'Espaço 3' where id = 3;

insert into public.banner_espacos (id, nome, intervalo_segundos, ativo, formato, limite)
values (5, 'Espaço 4', 6, true, 'retrato', 99)
on conflict (id) do update set
  nome    = excluded.nome,
  formato = excluded.formato,
  ativo   = excluded.ativo;


-- =====================================================================
-- 15. ARTE DE CELULAR PARA A FAIXA
--     A faixa e 1200x200 no computador. No celular a mesma arte ficaria
--     com 58 pixels de altura. Com uma arte de 600x200 o anunciante ganha
--     o dobro. Sem ela, o site corta a arte larga pelo centro.
-- =====================================================================

alter table public.banners add column if not exists imagem_url_mobile  text;
alter table public.banners add column if not exists imagem_path_mobile text;

comment on column public.banners.imagem_url_mobile is
  'Arte 600x200 exibida em telas estreitas. Nulo = usa a do computador, cortada no centro.';
comment on column public.banners.imagem_path_mobile is
  'Caminho do arquivo da arte de celular no bucket banners, para poder apagar na troca.';

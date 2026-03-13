-- Execute esse SQL no Supabase: SQL Editor → New Query → Cole tudo → Run

-- Usuários (admin e jogadores)
create table usuarios (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password_hash text not null,
  role text not null default 'jogador', -- 'admin' ou 'jogador'
  fazenda text,
  criado_em timestamptz default now()
);

-- Lotes de gado
create table lotes (
  id uuid default gen_random_uuid() primary key,
  codigo text unique not null, -- ex: L-001
  jogador_id uuid references usuarios(id),
  jogador_nome text not null,
  fazenda text not null,
  quantidade int not null,
  fase text not null default 'bezerro', -- bezerro, garrote, boi, abatido
  peso_kg int not null default 180,
  valor_compra numeric not null,
  valor_abate numeric,
  data_compra date not null default current_date,
  data_fase2 date, -- quando virar garrote
  data_fase3 date, -- quando virar boi
  data_fase4 date, -- quando virar abatido
  status text not null default 'ativo', -- ativo, aguardando_pagamento, pago, vendido
  comprovante text,
  criado_em timestamptz default now()
);

-- Transações (compras NPC, p2p, abates)
create table transacoes (
  id uuid default gen_random_uuid() primary key,
  tipo text not null, -- 'compra_npc', 'p2p', 'abate'
  lote_id uuid references lotes(id),
  lote_codigo text,
  de_jogador text,
  para_jogador text,
  quantidade int,
  valor numeric not null,
  fase text,
  data_transacao date not null default current_date,
  status text default 'concluido', -- concluido, aguardando_pagamento, pago
  obs text,
  criado_em timestamptz default now()
);

-- Anúncios p2p
create table anuncios (
  id uuid default gen_random_uuid() primary key,
  lote_id uuid references lotes(id),
  lote_codigo text,
  vendedor_id uuid references usuarios(id),
  vendedor_nome text not null,
  fazenda text,
  fase text not null,
  quantidade int not null,
  peso_kg int,
  preco_pedido numeric not null,
  obs text,
  status text default 'ativo', -- ativo, vendido, cancelado
  criado_em timestamptz default now()
);

-- Habilitar RLS (Row Level Security) mas permitir tudo via service_role
alter table usuarios enable row level security;
alter table lotes enable row level security;
alter table transacoes enable row level security;
alter table anuncios enable row level security;

-- Policies: permitir tudo (auth feita na API)
create policy "allow all" on usuarios for all using (true) with check (true);
create policy "allow all" on lotes for all using (true) with check (true);
create policy "allow all" on transacoes for all using (true) with check (true);
create policy "allow all" on anuncios for all using (true) with check (true);

-- Admin padrão (senha: admin123 — troque depois!)
-- Hash bcrypt de 'admin123'
insert into usuarios (username, password_hash, role, fazenda)
values ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhu8', 'admin', null);

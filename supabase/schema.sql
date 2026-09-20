-- =====================================================================
-- 2TIJEN — schéma de base de données (PostgreSQL / Supabase)
--
-- À coller UNE FOIS dans Supabase > SQL Editor > New query > Run.
-- Peut être relancé sans danger : chaque instruction est « if not exists »
-- ou « create or replace ».
--
-- Sécurité : toutes les tables ont le RLS activé SANS politique, et les rôles
-- publics (anon / authenticated) n'ont aucun droit. Seul le serveur du site,
-- avec la clé « service role » (secrète), peut lire et écrire.
-- =====================================================================

-- ---------- Designs et stock -----------------------------------------

create table if not exists designs (
  id            text primary key,
  name          text not null,
  total_pieces  int  not null check (total_pieces >= 0),
  -- dernier numéro de pièce attribué (012/050 → 12)
  last_number   int  not null default 0
);

create table if not exists stock (
  design_id text not null references designs(id),
  size      text not null check (size in ('S','M','L','XL')),
  total     int  not null check (total >= 0),
  sold      int  not null default 0,
  primary key (design_id, size),
  check (sold >= 0 and sold <= total)
);

-- ---------- Réservations (15 min pendant le paiement) ----------------

create table if not exists reservations (
  id                uuid primary key default gen_random_uuid(),
  status            text not null default 'active'
                    check (status in ('active','completed','released')),
  expires_at        timestamptz not null,
  stripe_session_id text unique,
  created_at        timestamptz not null default now()
);

-- Une ligne par pièce physique réservée.
create table if not exists reservation_items (
  id             bigserial primary key,
  reservation_id uuid not null references reservations(id) on delete cascade,
  design_id      text not null references designs(id),
  size           text not null,
  unit_amount    int,               -- prix alloué, en centimes (rempli après calcul serveur)
  early_bird     boolean not null default false,
  pack           boolean not null default false
);
create index if not exists reservation_items_res_idx on reservation_items(reservation_id);

-- ---------- Commandes -------------------------------------------------

create table if not exists orders (
  id                    uuid primary key default gen_random_uuid(),
  stripe_session_id     text not null unique,        -- garantit l'idempotence
  stripe_payment_intent text,
  reservation_id        uuid references reservations(id),
  drop_name             text,
  email                 text not null,
  name                  text,
  phone                 text,
  delivery_method       text check (delivery_method in ('pickup','shipping')),
  shipping_address      jsonb,
  amount_total          int  not null,               -- centimes, livraison incluse
  shipping_amount       int  not null default 0,
  -- paid = ok ; needs_refund = payée mais stock épuisé entre-temps (à rembourser)
  status                text not null default 'paid'
                        check (status in ('paid','needs_refund','refunded')),
  confirmation_sent_at  timestamptz,
  created_at            timestamptz not null default now()
);

-- Code de réduction utilisé (ajouté après la première version : relancer ce fichier suffit)
alter table orders add column if not exists promo_code      text;
alter table orders add column if not exists discount_amount int not null default 0;

create table if not exists order_items (
  id           bigserial primary key,
  order_id     uuid not null references orders(id) on delete cascade,
  design_id    text not null references designs(id),
  size         text not null,
  piece_number int  not null,
  unit_amount  int  not null,
  early_bird   boolean not null default false,
  pack         boolean not null default false,
  -- un numéro de pièce ne peut jamais être attribué deux fois
  unique (design_id, piece_number)
);
create index if not exists order_items_order_idx on order_items(order_id);

-- ---------- Liste d'attente -------------------------------------------

create table if not exists waitlist (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique check (email = lower(email)),
  whatsapp        text,
  consent_at      timestamptz not null default now(),
  -- jeton du lien d'accès anticipé (24 h avant l'ouverture)
  access_token    text not null unique
                  default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  access_sent_at  timestamptz,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- Limitation de débit ---------------------------------------

create table if not exists rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         int not null default 0,
  primary key (key, window_start)
);

-- ---------- Sécurité : RLS + aucun droit public ------------------------

alter table designs           enable row level security;
alter table stock             enable row level security;
alter table reservations      enable row level security;
alter table reservation_items enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table waitlist          enable row level security;
alter table rate_limits       enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ---------- Vue : stock disponible par design/taille -------------------

create or replace view stock_status with (security_invoker = true) as
select
  s.design_id,
  s.size,
  s.total,
  s.sold,
  coalesce(r.reserved, 0)::int                        as reserved,
  greatest(s.total - s.sold - coalesce(r.reserved, 0), 0)::int as available
from stock s
left join (
  select ri.design_id, ri.size, count(*) as reserved
  from reservation_items ri
  join reservations rs on rs.id = ri.reservation_id
  where rs.status = 'active' and rs.expires_at > now()
  group by ri.design_id, ri.size
) r on r.design_id = s.design_id and r.size = s.size;

revoke all on stock_status from anon, authenticated;

-- =====================================================================
-- Fonctions (appelées par le serveur uniquement)
-- Toutes les opérations sensibles prennent le même verrou global : avec
-- 100 pièces en vente, le volume est faible et cela rend la survente
-- impossible, même avec deux acheteurs simultanés sur la dernière pièce.
-- =====================================================================

-- Réserve des pièces pour N minutes.
-- p_items : [{"design_id":"guadeloupean","size":"M","qty":2}, ...]
-- p_scope : les designs du drop en cours (pour compter l'early bird drop par drop)
-- Retourne l'id de réservation, les ids des lignes (dans l'ordre des pièces)
-- et le nombre de pièces déjà vendues/réservées AVANT cette réservation
-- (sert à calculer l'early bird côté serveur).
-- Lève l'erreur 'SOLD_OUT:<design>:<taille>' si le stock est insuffisant.
create or replace function reserve_stock(p_items jsonb, p_minutes int, p_scope text[])
returns table (reservation_id uuid, item_ids bigint[], pieces_before int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res    uuid;
  v_before int;
  v_ids    bigint[];
  it       record;
  v_avail  int;
begin
  perform pg_advisory_xact_lock(hashtext('2tijen_stock'));

  for it in
    select x->>'design_id' as design_id, x->>'size' as size, sum((x->>'qty')::int) as qty
    from jsonb_array_elements(p_items) x
    group by 1, 2
  loop
    select available into v_avail from stock_status
    where design_id = it.design_id and size = it.size;
    if v_avail is null or v_avail < it.qty then
      raise exception 'SOLD_OUT:%:%', it.design_id, it.size using errcode = 'P0001';
    end if;
  end loop;

  select coalesce(sum(sold + reserved), 0)::int into v_before
  from stock_status where design_id = any(p_scope);

  insert into reservations (expires_at)
  values (now() + make_interval(mins => p_minutes))
  returning id into v_res;

  with ins as (
    insert into reservation_items (reservation_id, design_id, size)
    select v_res, x->>'design_id', x->>'size'
    from jsonb_array_elements(p_items) x,
         generate_series(1, (x->>'qty')::int)
    returning id
  )
  select array_agg(id order by id) into v_ids from ins;

  return query select v_res, v_ids, v_before;
end;
$$;

-- Enregistre les prix calculés côté serveur sur les lignes réservées.
-- p_units : [{"id":123,"unit_amount":3200,"early_bird":true,"pack":false}, ...]
create or replace function price_reservation(p_reservation uuid, p_units jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update reservation_items ri
  set unit_amount = (u->>'unit_amount')::int,
      early_bird  = (u->>'early_bird')::boolean,
      pack        = (u->>'pack')::boolean
  from jsonb_array_elements(p_units) u
  where ri.id = (u->>'id')::bigint
    and ri.reservation_id = p_reservation;
$$;

create or replace function attach_stripe_session(p_reservation uuid, p_session text)
returns void
language sql
security definer
set search_path = public
as $$
  update reservations set stripe_session_id = p_session where id = p_reservation;
$$;

-- Libère une réservation (paiement échoué, session expirée…).
create or replace function release_reservation(p_reservation uuid default null, p_session text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update reservations
  set status = 'released'
  where status = 'active'
    and (id = p_reservation or stripe_session_id = p_session);
$$;

-- Finalise une commande après paiement confirmé par Stripe (webhook).
-- IDEMPOTENT : rejouer le même événement ne crée jamais une 2e commande.
-- Retourne {status: created | duplicate | unknown_reservation | oversold, ...}.
create or replace function complete_order(
  p_session_id      text,
  p_payment_intent  text,
  p_reservation     uuid,
  p_drop_name       text,
  p_email           text,
  p_name            text,
  p_phone           text,
  p_delivery        text,
  p_address         jsonb,
  p_amount_total    int,
  p_shipping_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   uuid;
  v_res     reservations%rowtype;
  it        record;
  v_avail   int;
  v_num     int;
  v_total   int;
  v_items   jsonb := '[]'::jsonb;
  v_ok      boolean := true;
begin
  perform pg_advisory_xact_lock(hashtext('2tijen_stock'));

  select id into v_order from orders where stripe_session_id = p_session_id;
  if found then
    return jsonb_build_object('status', 'duplicate', 'order_id', v_order);
  end if;

  select * into v_res from reservations where id = p_reservation;
  if not found then
    return jsonb_build_object('status', 'unknown_reservation');
  end if;

  -- Si la réservation a expiré (paiement tardif), on vérifie que le stock
  -- est toujours là ; sinon la commande est marquée « à rembourser ».
  if v_res.status <> 'completed' then
    for it in
      select design_id, size, count(*) as qty
      from reservation_items where reservation_id = v_res.id
      group by 1, 2
    loop
      select s.total - s.sold - coalesce((
               select count(*) from reservation_items ri
               join reservations rs on rs.id = ri.reservation_id
               where rs.status = 'active' and rs.expires_at > now()
                 and rs.id <> v_res.id
                 and ri.design_id = s.design_id and ri.size = s.size), 0)
      into v_avail
      from stock s where s.design_id = it.design_id and s.size = it.size;
      if v_avail is null or v_avail < it.qty then v_ok := false; end if;
    end loop;
  end if;

  insert into orders (stripe_session_id, stripe_payment_intent, reservation_id, drop_name,
                      email, name, phone, delivery_method, shipping_address,
                      amount_total, shipping_amount, status)
  values (p_session_id, p_payment_intent, p_reservation, p_drop_name,
          p_email, p_name, p_phone, p_delivery, p_address,
          p_amount_total, p_shipping_amount,
          case when v_ok then 'paid' else 'needs_refund' end)
  returning id into v_order;

  if not v_ok then
    update reservations set status = 'released' where id = v_res.id and status = 'active';
    return jsonb_build_object('status', 'oversold', 'order_id', v_order);
  end if;

  for it in
    select * from reservation_items where reservation_id = v_res.id order by id
  loop
    update stock set sold = sold + 1 where design_id = it.design_id and size = it.size;
    update designs set last_number = last_number + 1
    where id = it.design_id
    returning last_number, total_pieces into v_num, v_total;

    insert into order_items (order_id, design_id, size, piece_number, unit_amount, early_bird, pack)
    values (v_order, it.design_id, it.size, v_num, coalesce(it.unit_amount, 0), it.early_bird, it.pack);

    v_items := v_items || jsonb_build_object(
      'design_id', it.design_id, 'size', it.size,
      'piece_number', v_num, 'total_pieces', v_total);
  end loop;

  update reservations set status = 'completed' where id = v_res.id;

  return jsonb_build_object('status', 'created', 'order_id', v_order, 'items', v_items);
end;
$$;

-- Inscription à la liste d'attente (sans doublon ; réinscription possible).
create or replace function waitlist_join(p_email text, p_whatsapp text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into waitlist (email, whatsapp)
  values (lower(p_email), nullif(p_whatsapp, ''))
  on conflict (email) do update
    set unsubscribed_at = null,
        whatsapp = coalesce(nullif(excluded.whatsapp, ''), waitlist.whatsapp),
        consent_at = now();
$$;

-- Limitation de débit (fenêtre fixe). Retourne false si la limite est dépassée.
create or replace function rate_limit_hit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;

  if random() < 0.02 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end;
$$;

-- Seul le serveur (service role) peut appeler ces fonctions.
revoke execute on all functions in schema public from public, anon, authenticated;

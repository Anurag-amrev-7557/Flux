-- Local-first replication contract. Apply with `supabase db push`.
create extension if not exists pgcrypto;

create or replace function public.set_sync_columns() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;

create table if not exists public.categories (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60), icon text, color text,
  kind text not null check (kind in ('expense', 'income')), field_clocks jsonb not null default '{}',
  deleted_at timestamptz, updated_at timestamptz not null default clock_timestamp(), version int not null default 1
);
create table if not exists public.transactions (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount_minor bigint not null check (abs(amount_minor) < 1000000000000),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'), note text check (char_length(note) <= 500),
  occurred_at timestamptz not null, field_clocks jsonb not null default '{}', deleted_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(), version int not null default 1
);
create table if not exists public.debts (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  counterparty text not null, direction text not null check (direction in ('owed_to_me', 'i_owe')),
  principal_minor bigint not null check (principal_minor > 0), currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  due_at timestamptz, note text check (char_length(note) <= 500), field_clocks jsonb not null default '{}', deleted_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(), version int not null default 1
);
create table if not exists public.debt_payments (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade, amount_minor bigint not null check (amount_minor > 0),
  paid_at timestamptz not null, note text check (char_length(note) <= 500), field_clocks jsonb not null default '{}', deleted_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(), version int not null default 1
);
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  settings jsonb not null default '{}', field_clocks jsonb not null default '{}',
  updated_at timestamptz not null default clock_timestamp(), version int not null default 1
);
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text, avatar jsonb, field_clocks jsonb not null default '{}',
  updated_at timestamptz not null default clock_timestamp(), version int not null default 1
);

do $$ declare t text; begin
  foreach t in array array['categories','transactions','debts','debt_payments','user_settings','profiles'] loop
    execute format('drop trigger if exists %I_sync on public.%I', t, t);
    execute format('create trigger %I_sync before insert or update on public.%I for each row execute function public.set_sync_columns()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    if t in ('user_settings', 'profiles') then
      execute format('create index if not exists %I_updated_at_idx on public.%I (updated_at)', t, t);
    else
      execute format('create index if not exists %I_user_updated_id_idx on public.%I (user_id, updated_at, id)', t, t);
    end if;
  end loop;
end $$;

create or replace function public.clock_wins(incoming jsonb, current_clocks jsonb, field text)
returns boolean language sql immutable as $$
  select coalesce(incoming->'field_clocks'->>field, '') > coalesce(current_clocks->>field, '')
$$;

-- A single authenticated pull endpoint. `updated_at,id` is server-ordered; the client
-- deliberately re-reads a five-second overlap so a checkpoint never loses a committed row.
create or replace function public.pull_sync_rows(
  p_table text, p_updated_at timestamptz default null, p_id uuid default null, p_limit int default 200
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare rows jsonb; begin
  if p_table not in ('categories','transactions','debts','debt_payments','user_settings','profiles') then raise exception 'invalid sync table'; end if;
  if p_limit < 1 or p_limit > 200 then raise exception 'invalid batch size'; end if;
  if p_table in ('user_settings','profiles') then
    execute format('select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at), ''[]''::jsonb) from (select * from %I where updated_at > coalesce($1, ''epoch''::timestamptz) order by updated_at limit $2) x', p_table)
      into rows using p_updated_at, p_limit;
  else
    execute format('select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at, x.id), ''[]''::jsonb) from (select * from %I where (updated_at, id) > (coalesce($1, ''epoch''::timestamptz), coalesce($2, ''00000000-0000-0000-0000-000000000000''::uuid)) order by updated_at, id limit $3) x', p_table)
      into rows using p_updated_at, p_id, p_limit;
  end if;
  return rows;
end $$;

-- Transaction merge is intentionally explicit: it is the financial record with the
-- strictest constraints. A retried write has identical clocks and is therefore idempotent.
create or replace function public.push_transactions(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c jsonb; n jsonb; cur public.transactions; merged public.transactions; conflicts jsonb := '[]'::jsonb; max_edit text;
begin
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 200 then raise exception 'invalid batch'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    n := c->'newDocumentState';
    if n is null or n->>'id' is null then raise exception 'document id required'; end if;
    select * into cur from public.transactions where id = (n->>'id')::uuid for update;
    if not found then
      insert into public.transactions(id, category_id, amount_minor, currency, note, occurred_at, field_clocks, deleted_at)
      values ((n->>'id')::uuid, nullif(n->>'category_id','')::uuid, (n->>'amount_minor')::bigint, n->>'currency', n->>'note',
        (n->>'occurred_at')::timestamptz, coalesce(n->'field_clocks','{}'), nullif(n->>'deleted_at','')::timestamptz);
      continue;
    end if;
    update public.transactions t set
      category_id = case when public.clock_wins(n, cur.field_clocks, 'category_id') then nullif(n->>'category_id','')::uuid else t.category_id end,
      amount_minor = case when public.clock_wins(n, cur.field_clocks, 'amount_minor') then (n->>'amount_minor')::bigint else t.amount_minor end,
      currency = case when public.clock_wins(n, cur.field_clocks, 'currency') then n->>'currency' else t.currency end,
      note = case when public.clock_wins(n, cur.field_clocks, 'note') then n->>'note' else t.note end,
      occurred_at = case when public.clock_wins(n, cur.field_clocks, 'occurred_at') then (n->>'occurred_at')::timestamptz else t.occurred_at end,
      deleted_at = case when public.clock_wins(n, cur.field_clocks, 'deleted_at') then nullif(n->>'deleted_at','')::timestamptz else t.deleted_at end,
      field_clocks = (select coalesce(jsonb_object_agg(k, greatest(coalesce(cur.field_clocks->>k,''), coalesce(n->'field_clocks'->>k,''))), '{}'::jsonb) from (select jsonb_object_keys(cur.field_clocks || coalesce(n->'field_clocks','{}')) k) s)
      where t.id = cur.id returning * into merged;
    if merged.deleted_at is not null then
      select max(value) into max_edit from jsonb_each_text(merged.field_clocks) where key <> 'deleted_at';
      if max_edit > coalesce(merged.field_clocks->>'deleted_at','') then update public.transactions set deleted_at = null where id = merged.id returning * into merged; end if;
    end if;
    if (to_jsonb(merged) - array['updated_at','version','user_id']) is distinct from (n - array['updated_at','version','user_id','_deleted']) then conflicts := conflicts || to_jsonb(merged); end if;
  end loop;
  return conflicts;
end $$;

create or replace function public.push_categories(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c jsonb; n jsonb; cur public.categories; merged public.categories; conflicts jsonb := '[]'::jsonb; max_edit text;
begin
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 200 then raise exception 'invalid batch'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    n := c->'newDocumentState';
    select * into cur from public.categories where id = (n->>'id')::uuid for update;
    if not found then
      insert into public.categories(id, name, icon, color, kind, field_clocks, deleted_at)
      values ((n->>'id')::uuid, n->>'name', n->>'icon', n->>'color', n->>'kind', coalesce(n->'field_clocks','{}'), nullif(n->>'deleted_at','')::timestamptz);
      continue;
    end if;
    update public.categories t set
      name = case when public.clock_wins(n, cur.field_clocks, 'name') then n->>'name' else t.name end,
      icon = case when public.clock_wins(n, cur.field_clocks, 'icon') then n->>'icon' else t.icon end,
      color = case when public.clock_wins(n, cur.field_clocks, 'color') then n->>'color' else t.color end,
      kind = case when public.clock_wins(n, cur.field_clocks, 'kind') then n->>'kind' else t.kind end,
      deleted_at = case when public.clock_wins(n, cur.field_clocks, 'deleted_at') then nullif(n->>'deleted_at','')::timestamptz else t.deleted_at end,
      field_clocks = (select coalesce(jsonb_object_agg(k, greatest(coalesce(cur.field_clocks->>k,''), coalesce(n->'field_clocks'->>k,''))), '{}'::jsonb) from (select jsonb_object_keys(cur.field_clocks || coalesce(n->'field_clocks','{}')) k) s)
      where t.id = cur.id returning * into merged;
    if merged.deleted_at is not null then
      select max(value) into max_edit from jsonb_each_text(merged.field_clocks) where key <> 'deleted_at';
      if max_edit > coalesce(merged.field_clocks->>'deleted_at','') then update public.categories set deleted_at = null where id = merged.id returning * into merged; end if;
    end if;
    if (to_jsonb(merged) - array['updated_at','version','user_id']) is distinct from (n - array['updated_at','version','user_id','_deleted']) then conflicts := conflicts || to_jsonb(merged); end if;
  end loop;
  return conflicts;
end $$;

-- Debt, payment, profile, and settings clients are added with their UI migration. These
-- endpoints fail closed rather than ever acknowledging a write that was not persisted.
create or replace function public.sync_not_ready() returns jsonb language plpgsql security invoker as $$ begin raise exception 'sync endpoint is not implemented for this entity'; end $$;
create or replace function public.push_debts(changes jsonb) returns jsonb language sql security invoker as $$ select public.sync_not_ready() $$;
create or replace function public.push_debt_payments(changes jsonb) returns jsonb language sql security invoker as $$ select public.sync_not_ready() $$;
create or replace function public.push_user_settings(changes jsonb) returns jsonb language sql security invoker as $$ select public.sync_not_ready() $$;
create or replace function public.push_profiles(changes jsonb) returns jsonb language sql security invoker as $$ select public.sync_not_ready() $$;

revoke all on function public.pull_sync_rows(text, timestamptz, uuid, int) from public;
grant execute on function public.pull_sync_rows(text, timestamptz, uuid, int) to authenticated;
grant execute on function public.push_transactions(jsonb), public.push_categories(jsonb), public.push_debts(jsonb), public.push_debt_payments(jsonb), public.push_user_settings(jsonb), public.push_profiles(jsonb) to authenticated;

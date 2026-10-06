-- Migration: Add workspace_id / profile_id to transactions, categories, and debts
-- Enables multi-workspace synchronization without flattening into personal-default

-- 1. Transactions workspace column
alter table if exists public.transactions
  add column if not exists workspace_id text default 'personal-default';

create index if not exists idx_transactions_workspace_id on public.transactions(user_id, workspace_id);

-- 2. Categories workspace column
alter table if exists public.categories
  add column if not exists workspace_id text default 'personal-default';

create index if not exists idx_categories_workspace_id on public.categories(user_id, workspace_id);

-- 3. Debts workspace column
alter table if exists public.debts
  add column if not exists workspace_id text default 'personal-default';

create index if not exists idx_debts_workspace_id on public.debts(user_id, workspace_id);

-- 4. Update push_transactions to support workspace_id
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
      insert into public.transactions(id, category_id, workspace_id, amount_minor, currency, note, occurred_at, field_clocks, deleted_at)
      values (
        (n->>'id')::uuid,
        nullif(n->>'category_id','')::uuid,
        coalesce(nullif(n->>'workspace_id',''), 'personal-default'),
        (n->>'amount_minor')::bigint,
        n->>'currency',
        n->>'note',
        (n->>'occurred_at')::timestamptz,
        coalesce(n->'field_clocks','{}'),
        nullif(n->>'deleted_at','')::timestamptz
      );
      continue;
    end if;
    update public.transactions t set
      category_id = case when public.clock_wins(n, cur.field_clocks, 'category_id') then nullif(n->>'category_id','')::uuid else t.category_id end,
      workspace_id = case when public.clock_wins(n, cur.field_clocks, 'workspace_id') then coalesce(nullif(n->>'workspace_id',''), t.workspace_id) else t.workspace_id end,
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

-- 5. Update push_categories to support workspace_id
create or replace function public.push_categories(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c jsonb; n jsonb; cur public.categories; merged public.categories; conflicts jsonb := '[]'::jsonb; max_edit text;
begin
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 200 then raise exception 'invalid batch'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    n := c->'newDocumentState';
    select * into cur from public.categories where id = (n->>'id')::uuid for update;
    if not found then
      insert into public.categories(id, name, icon, color, kind, workspace_id, field_clocks, deleted_at)
      values ((n->>'id')::uuid, n->>'name', n->>'icon', n->>'color', n->>'kind', coalesce(nullif(n->>'workspace_id',''), 'personal-default'), coalesce(n->'field_clocks','{}'), nullif(n->>'deleted_at','')::timestamptz);
      continue;
    end if;
    update public.categories t set
      name = case when public.clock_wins(n, cur.field_clocks, 'name') then n->>'name' else t.name end,
      icon = case when public.clock_wins(n, cur.field_clocks, 'icon') then n->>'icon' else t.icon end,
      color = case when public.clock_wins(n, cur.field_clocks, 'color') then n->>'color' else t.color end,
      kind = case when public.clock_wins(n, cur.field_clocks, 'kind') then n->>'kind' else t.kind end,
      workspace_id = case when public.clock_wins(n, cur.field_clocks, 'workspace_id') then coalesce(nullif(n->>'workspace_id',''), t.workspace_id) else t.workspace_id end,
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

-- 6. Update push_debts to support workspace_id
create or replace function public.push_debts(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c jsonb; n jsonb; cur public.debts; merged public.debts; conflicts jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 200 then raise exception 'invalid batch'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    n := c->'newDocumentState'; select * into cur from public.debts where id = (n->>'id')::uuid for update;
    if not found then
      insert into public.debts(id,counterparty,direction,principal_minor,currency,due_at,note,workspace_id,field_clocks,deleted_at)
      values ((n->>'id')::uuid,n->>'counterparty',n->>'direction',(n->>'principal_minor')::bigint,n->>'currency',nullif(n->>'due_at','')::timestamptz,n->>'note',coalesce(nullif(n->>'workspace_id',''), 'personal-default'),coalesce(n->'field_clocks','{}'),nullif(n->>'deleted_at','')::timestamptz);
      continue;
    end if;
    update public.debts t set
      counterparty=case when public.clock_wins(n,cur.field_clocks,'counterparty') then n->>'counterparty' else t.counterparty end,
      direction=case when public.clock_wins(n,cur.field_clocks,'direction') then n->>'direction' else t.direction end,
      principal_minor=case when public.clock_wins(n,cur.field_clocks,'principal_minor') then (n->>'principal_minor')::bigint else t.principal_minor end,
      currency=case when public.clock_wins(n,cur.field_clocks,'currency') then n->>'currency' else t.currency end,
      due_at=case when public.clock_wins(n,cur.field_clocks,'due_at') then nullif(n->>'due_at','')::timestamptz else t.due_at end,
      note=case when public.clock_wins(n,cur.field_clocks,'note') then n->>'note' else t.note end,
      workspace_id=case when public.clock_wins(n,cur.field_clocks,'workspace_id') then coalesce(nullif(n->>'workspace_id',''), t.workspace_id) else t.workspace_id end,
      deleted_at=case when public.clock_wins(n,cur.field_clocks,'deleted_at') then nullif(n->>'deleted_at','')::timestamptz else t.deleted_at end,
      field_clocks=(select coalesce(jsonb_object_agg(k,greatest(coalesce(cur.field_clocks->>k,''),coalesce(n->'field_clocks'->>k,''))),'{}') from (select jsonb_object_keys(cur.field_clocks || coalesce(n->'field_clocks','{}')) k)s)
      where t.id=cur.id returning * into merged;
    if (to_jsonb(merged)-array['updated_at','version','user_id']) is distinct from (n-array['updated_at','version','user_id','_deleted']) then conflicts:=conflicts||to_jsonb(merged); end if;
  end loop; return conflicts;
end $$;


-- App workspaces are distinct from the signed-in account profile.  Keeping
-- them in their own sync table permits multiple named finance workspaces.
create table if not exists public.profile_workspaces (
  id text primary key check (char_length(id) between 1 and 100),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  theme text,
  field_clocks jsonb not null default '{}', deleted_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(), version int not null default 1
);
drop trigger if exists profile_workspaces_sync on public.profile_workspaces;
create trigger profile_workspaces_sync before insert or update on public.profile_workspaces for each row execute function public.set_sync_columns();
alter table public.profile_workspaces enable row level security;
drop policy if exists own_rows on public.profile_workspaces;
create policy own_rows on public.profile_workspaces for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists profile_workspaces_user_updated_id_idx on public.profile_workspaces (user_id, updated_at, id);

create or replace function public.pull_sync_rows(
  p_table text, p_updated_at timestamptz default null, p_id uuid default null, p_limit int default 200
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare rows jsonb; begin
  if p_table not in ('categories','transactions','debts','debt_payments','user_settings','profiles','profile_workspaces') then raise exception 'invalid sync table'; end if;
  if p_limit < 1 or p_limit > 200 then raise exception 'invalid batch size'; end if;
  if p_table in ('user_settings','profiles') then
    execute format('select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at), ''[]''::jsonb) from (select * from %I where updated_at > coalesce($1, ''epoch''::timestamptz) order by updated_at limit $2) x', p_table) into rows using p_updated_at, p_limit;
  elsif p_table = 'profile_workspaces' then
    execute 'select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at, x.id), ''[]''::jsonb) from (select * from public.profile_workspaces where (updated_at, id) > (coalesce($1, ''epoch''::timestamptz), coalesce($2, '''')) order by updated_at, id limit $3) x' into rows using p_updated_at, p_id::text, p_limit;
  else
    execute format('select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at, x.id), ''[]''::jsonb) from (select * from %I where (updated_at, id) > (coalesce($1, ''epoch''::timestamptz), coalesce($2, ''00000000-0000-0000-0000-000000000000''::uuid)) order by updated_at, id limit $3) x', p_table) into rows using p_updated_at, p_id, p_limit;
  end if;
  return rows;
end $$;

create or replace function public.push_profile_workspaces(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c jsonb; n jsonb; cur public.profile_workspaces; merged public.profile_workspaces; conflicts jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 200 then raise exception 'invalid batch'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    n := c->'newDocumentState';
    select * into cur from public.profile_workspaces where id = n->>'id' for update;
    if not found then
      insert into public.profile_workspaces(id,name,theme,field_clocks,deleted_at) values (n->>'id',n->>'name',n->>'theme',coalesce(n->'field_clocks','{}'),nullif(n->>'deleted_at','')::timestamptz);
      continue;
    end if;
    update public.profile_workspaces p set
      name=case when public.clock_wins(n,cur.field_clocks,'name') then n->>'name' else p.name end,
      theme=case when public.clock_wins(n,cur.field_clocks,'theme') then n->>'theme' else p.theme end,
      deleted_at=case when public.clock_wins(n,cur.field_clocks,'deleted_at') then nullif(n->>'deleted_at','')::timestamptz else p.deleted_at end,
      field_clocks=(select coalesce(jsonb_object_agg(k,greatest(coalesce(cur.field_clocks->>k,''),coalesce(n->'field_clocks'->>k,''))),'{}') from (select jsonb_object_keys(cur.field_clocks || coalesce(n->'field_clocks','{}')) k)s)
      where p.id=cur.id returning * into merged;
    if (to_jsonb(merged)-array['updated_at','version','user_id']) is distinct from (n-array['updated_at','version','user_id','_deleted']) then conflicts:=conflicts||to_jsonb(merged); end if;
  end loop;
  return conflicts;
end $$;
grant execute on function public.push_profile_workspaces(jsonb) to authenticated;

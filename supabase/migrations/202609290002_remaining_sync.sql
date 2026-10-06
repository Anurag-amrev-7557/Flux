-- Complete the remaining entity write endpoints. This migration replaces the
-- phase-one fail-closed placeholders without changing their public RPC names.

create or replace function public.push_debts(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c jsonb; n jsonb; cur public.debts; merged public.debts; conflicts jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 200 then raise exception 'invalid batch'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    n := c->'newDocumentState'; select * into cur from public.debts where id = (n->>'id')::uuid for update;
    if not found then
      insert into public.debts(id,counterparty,direction,principal_minor,currency,due_at,note,field_clocks,deleted_at)
      values ((n->>'id')::uuid,n->>'counterparty',n->>'direction',(n->>'principal_minor')::bigint,n->>'currency',nullif(n->>'due_at','')::timestamptz,n->>'note',coalesce(n->'field_clocks','{}'),nullif(n->>'deleted_at','')::timestamptz);
      continue;
    end if;
    update public.debts t set
      counterparty=case when public.clock_wins(n,cur.field_clocks,'counterparty') then n->>'counterparty' else t.counterparty end,
      direction=case when public.clock_wins(n,cur.field_clocks,'direction') then n->>'direction' else t.direction end,
      principal_minor=case when public.clock_wins(n,cur.field_clocks,'principal_minor') then (n->>'principal_minor')::bigint else t.principal_minor end,
      currency=case when public.clock_wins(n,cur.field_clocks,'currency') then n->>'currency' else t.currency end,
      due_at=case when public.clock_wins(n,cur.field_clocks,'due_at') then nullif(n->>'due_at','')::timestamptz else t.due_at end,
      note=case when public.clock_wins(n,cur.field_clocks,'note') then n->>'note' else t.note end,
      deleted_at=case when public.clock_wins(n,cur.field_clocks,'deleted_at') then nullif(n->>'deleted_at','')::timestamptz else t.deleted_at end,
      field_clocks=(select coalesce(jsonb_object_agg(k,greatest(coalesce(cur.field_clocks->>k,''),coalesce(n->'field_clocks'->>k,''))),'{}') from (select jsonb_object_keys(cur.field_clocks || coalesce(n->'field_clocks','{}')) k)s)
      where t.id=cur.id returning * into merged;
    if (to_jsonb(merged)-array['updated_at','version','user_id']) is distinct from (n-array['updated_at','version','user_id','_deleted']) then conflicts:=conflicts||to_jsonb(merged); end if;
  end loop; return conflicts;
end $$;

create or replace function public.push_debt_payments(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c jsonb; n jsonb; cur public.debt_payments; merged public.debt_payments; conflicts jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes)>200 then raise exception 'invalid batch'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    n:=c->'newDocumentState'; select * into cur from public.debt_payments where id=(n->>'id')::uuid for update;
    if not found then
      insert into public.debt_payments(id,debt_id,amount_minor,paid_at,note,field_clocks,deleted_at)
      values((n->>'id')::uuid,(n->>'debt_id')::uuid,(n->>'amount_minor')::bigint,(n->>'paid_at')::timestamptz,n->>'note',coalesce(n->'field_clocks','{}'),nullif(n->>'deleted_at','')::timestamptz);
      continue;
    end if;
    -- Ledger facts are append-only; only a tombstone can subsequently win.
    update public.debt_payments t set deleted_at=case when public.clock_wins(n,cur.field_clocks,'deleted_at') then nullif(n->>'deleted_at','')::timestamptz else t.deleted_at end,
      field_clocks=(select coalesce(jsonb_object_agg(k,greatest(coalesce(cur.field_clocks->>k,''),coalesce(n->'field_clocks'->>k,''))),'{}') from (select jsonb_object_keys(cur.field_clocks || coalesce(n->'field_clocks','{}')) k)s)
      where t.id=cur.id returning * into merged;
    if (to_jsonb(merged)-array['updated_at','version','user_id']) is distinct from (n-array['updated_at','version','user_id','_deleted']) then conflicts:=conflicts||to_jsonb(merged); end if;
  end loop; return conflicts;
end $$;

create or replace function public.push_profiles(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c jsonb; n jsonb; cur public.profiles; merged public.profiles; conflicts jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(changes)<>'array' or jsonb_array_length(changes)>1 then raise exception 'invalid batch'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    n:=c->'newDocumentState'; select * into cur from public.profiles where user_id=auth.uid() for update;
    if not found then insert into public.profiles(display_name,avatar,field_clocks) values(n->>'display_name',n->'avatar',coalesce(n->'field_clocks','{}')); continue; end if;
    update public.profiles t set display_name=case when public.clock_wins(n,cur.field_clocks,'display_name') then n->>'display_name' else t.display_name end,
      avatar=case when public.clock_wins(n,cur.field_clocks,'avatar') then n->'avatar' else t.avatar end,
      field_clocks=(select coalesce(jsonb_object_agg(k,greatest(coalesce(cur.field_clocks->>k,''),coalesce(n->'field_clocks'->>k,''))),'{}') from (select jsonb_object_keys(cur.field_clocks || coalesce(n->'field_clocks','{}')) k)s)
      where t.user_id=auth.uid() returning * into merged;
    if (to_jsonb(merged)-array['updated_at','version','user_id']) is distinct from (n-array['updated_at','version','user_id','_deleted']) then conflicts:=conflicts||to_jsonb(merged); end if;
  end loop; return conflicts;
end $$;

create or replace function public.push_user_settings(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c jsonb; n jsonb; cur public.user_settings; merged public.user_settings; next_settings jsonb; next_clocks jsonb; k text; conflicts jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(changes)<>'array' or jsonb_array_length(changes)>1 then raise exception 'invalid batch'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    n:=c->'newDocumentState'; select * into cur from public.user_settings where user_id=auth.uid() for update;
    if not found then insert into public.user_settings(settings,field_clocks) values(coalesce(n->'settings','{}'),coalesce(n->'field_clocks','{}')); continue; end if;
    next_settings:=cur.settings; next_clocks:=cur.field_clocks;
    for k in select jsonb_object_keys(coalesce(n->'settings','{}')) loop
      if coalesce(n->'field_clocks'->>('settings.'||k),'') > coalesce(cur.field_clocks->>('settings.'||k),'') then next_settings:=jsonb_set(next_settings,array[k],n->'settings'->k,true); end if;
      next_clocks:=jsonb_set(next_clocks,array['settings.'||k],to_jsonb(greatest(coalesce(cur.field_clocks->>('settings.'||k),''),coalesce(n->'field_clocks'->>('settings.'||k),''))),true);
    end loop;
    update public.user_settings set settings=next_settings,field_clocks=next_clocks where user_id=auth.uid() returning * into merged;
    if (to_jsonb(merged)-array['updated_at','version','user_id']) is distinct from (n-array['updated_at','version','user_id','_deleted']) then conflicts:=conflicts||to_jsonb(merged); end if;
  end loop; return conflicts;
end $$;

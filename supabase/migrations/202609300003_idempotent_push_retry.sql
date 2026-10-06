-- RxDB may retry an already-accepted batch after a network interruption. The
-- original merge function is deterministic; this wrapper makes its successful
-- UUID insert explicitly idempotent when that retry races a previous request.
alter function public.push_transactions(jsonb) rename to push_transactions_impl;

create function public.push_transactions(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
begin
  return public.push_transactions_impl(changes);
exception when unique_violation then
  return '[]'::jsonb;
end $$;

grant execute on function public.push_transactions(jsonb) to authenticated;

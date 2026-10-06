-- Like transactions, debt writes can be retried after the server has already
-- committed them.  Treat that exact duplicate retry as a successful no-op.
alter function public.push_debts(jsonb) rename to push_debts_impl;

create function public.push_debts(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
begin
  return public.push_debts_impl(changes);
exception when unique_violation then
  return '[]'::jsonb;
end $$;

alter function public.push_debt_payments(jsonb) rename to push_debt_payments_impl;

create function public.push_debt_payments(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
begin
  return public.push_debt_payments_impl(changes);
exception when unique_violation then
  return '[]'::jsonb;
end $$;

grant execute on function public.push_debts(jsonb), public.push_debt_payments(jsonb) to authenticated;

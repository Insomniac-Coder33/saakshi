-- A daily allowance for Sahayak, the legal helper, so one account can't drain the model quota.
-- Only the server touches it. Nothing she asks is stored: just a count per day.
create table public.sahayak_usage (
  owner uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Kolkata')::date,
  n integer not null default 0,
  primary key (owner, day)
);
alter table public.sahayak_usage enable row level security;  -- no policies: server only

create or replace function public.sahayak_tick(p_owner uuid) returns integer
language sql as $$
  insert into public.sahayak_usage (owner, n) values (p_owner, 1)
  on conflict (owner, day) do update set n = public.sahayak_usage.n + 1
  returning n
$$;
revoke execute on function public.sahayak_tick(uuid) from public, anon, authenticated;

-- Moving her Saakshi to a new phone. Her account is anonymous, so a new phone can't sign in to it.
-- The new phone asks for a 6-digit code; she reads it to her guardians, who send it to the bot and
-- approve. When enough of them have, the server signs the new phone in to her account and signs the
-- old one out. Her recordings stay locked with her PIN throughout: guardians vouch, the PIN opens.

create table public.recoveries (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references auth.users (id) on delete cascade,  -- the new phone's own account
  code text not null check (code ~ '^[0-9]{6}$'),
  owner uuid references auth.users (id) on delete cascade,  -- her account, fixed by the first approval
  status text not null default 'open' check (status in ('open', 'approved', 'declined', 'claimed', 'done')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);
create unique index recoveries_open_code on public.recoveries (code) where status = 'open';
create index recoveries_requester on public.recoveries (requester);

create table public.recovery_approvals (
  recovery_id uuid not null references public.recoveries (id) on delete cascade,
  guardian_id uuid not null references public.guardians (id) on delete cascade,
  approved_at timestamptz not null default now(),
  primary key (recovery_id, guardian_id)
);

-- Server only: no policies, so no phone can read or write these directly.
alter table public.recoveries enable row level security;
alter table public.recovery_approvals enable row level security;

-- Signs every device out of an account, so the phone she lost (or that was taken) can't carry on.
create function public.end_sessions_of(uid uuid) returns void
language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = uid;
$$;
revoke all on function public.end_sessions_of(uuid) from public, anon, authenticated;
grant execute on function public.end_sessions_of(uuid) to service_role;

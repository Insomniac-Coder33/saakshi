-- Guardians: people she trusts, reached on Telegram. She creates an invite (a random token); the
-- guardian opens t.me/<bot>?start=<token> and taps Start; the bot's webhook links their chat to it.
-- Alerts go out from the server (/api/alert), which is the only thing that ever sees a chat id in use.

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  chat_id bigint,          -- set by the bot when they tap Start
  name text check (char_length(name) <= 80),  -- their Telegram first name
  created_at timestamptz not null default now(),
  linked_at timestamptz
);
create index guardians_owner on public.guardians (owner);
alter table public.guardians enable row level security;

-- She can see, invite and remove her guardians. Linking a chat is the bot's job, never hers.
create policy "read own guardians" on public.guardians
  for select to authenticated using (owner = auth.uid());
create policy "invite guardians" on public.guardians
  for insert to authenticated with check (owner = auth.uid() and chat_id is null and linked_at is null);
create policy "remove own guardians" on public.guardians
  for delete to authenticated using (owner = auth.uid());

-- One row per guardian per SOS: the live-location message being kept up to date, and what was sent.
create table public.alerts (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  guardian_id uuid not null references public.guardians (id) on delete cascade,
  location_message_id bigint,
  started_at timestamptz not null default now(),
  duress_at timestamptz,
  silent_at timestamptz,   -- when we told them her phone went quiet
  ended_at timestamptz,
  unique (session_id, guardian_id)
);
alter table public.alerts enable row level security;  -- no policies: server only

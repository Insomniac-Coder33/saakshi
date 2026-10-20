-- Saakshi core schema: profiles, capture sessions, sealed pieces, audit log, and the private evidence bucket.
-- Every table is owner-only through row-level security. Users are Supabase anonymous users: no email, no phone.

create extension if not exists pgcrypto;

-- One row per woman. The private key is wrapped (AES-GCM) with a key derived from her vault PIN,
-- so the server can store it for her without being able to read it.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  language text not null default 'en' check (language in ('en', 'bn', 'hi')),
  age_group text not null default 'adult' check (age_group in ('adult', 'minor')),
  public_key text not null,             -- ECDH P-256 public key, raw, base64
  wrapped_private_key text not null,    -- iv || AES-GCM(pkcs8), base64
  kdf_salt text not null,               -- base64
  kdf_iterations integer not null check (kdf_iterations >= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A capture session: a silent SOS recording, a journal entry or a vault upload.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'sos' check (kind in ('sos', 'journal', 'vault')),
  status text not null default 'active' check (status in ('active', 'ended', 'undone')),
  duress boolean not null default false,  -- set when the duress PIN "stopped" it
  ephemeral_public_key text not null,     -- per-session ECDH public key, raw, base64
  mime text,
  title text check (char_length(title) <= 120),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index sessions_owner_started on public.sessions (owner, started_at desc);

-- One encrypted piece: a 5-second media slice, a location fix, a journal entry or an image.
-- sha256 is the fingerprint of the plaintext, taken on her phone before encryption.
create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq integer not null check (seq >= 0),
  kind text not null check (kind in ('media', 'location', 'text', 'image')),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  salt text not null default encode(gen_random_bytes(16), 'hex') check (salt ~ '^[0-9a-f]{32}$'),
  size integer not null check (size >= 0),
  storage_path text not null,
  captured_at timestamptz not null,       -- her phone's clock
  received_at timestamptz not null default now(),  -- the server's clock
  unique (session_id, kind, seq)
);
create index pieces_session on public.pieces (session_id, seq);
create index pieces_sha256 on public.pieces (sha256);

-- Append-only audit trail. Written by triggers and by the server, never edited.
create table public.audit_log (
  id bigint generated always as identity primary key,
  owner uuid references auth.users (id) on delete set null,
  action text not null,
  subject_id uuid,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index audit_log_owner on public.audit_log (owner, at desc);

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.pieces enable row level security;
alter table public.audit_log enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own sessions" on public.sessions
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- Pieces are evidence: she can add and delete them, but never edit one after the fact.
create policy "read own pieces" on public.pieces
  for select to authenticated using (owner = auth.uid());
create policy "add own pieces" on public.pieces
  for insert to authenticated with check (
    owner = auth.uid()
    and exists (select 1 from public.sessions s where s.id = session_id and s.owner = auth.uid())
  );
create policy "delete own pieces" on public.pieces
  for delete to authenticated using (owner = auth.uid());

create policy "read own audit" on public.audit_log
  for select to authenticated using (owner = auth.uid());

-- Audit triggers. security definer so they can write past RLS.
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (owner, action, subject_id, detail)
    values (old.owner, tg_table_name || '.delete', old.id, '{}'::jsonb);
    return old;
  elsif tg_op = 'INSERT' then
    insert into public.audit_log (owner, action, subject_id, detail)
    values (new.owner, tg_table_name || '.insert', new.id,
      case when tg_table_name = 'pieces' then jsonb_build_object('session_id', new.session_id, 'seq', new.seq, 'sha256', new.sha256)
           else jsonb_build_object('kind', new.kind) end);
    return new;
  else
    insert into public.audit_log (owner, action, subject_id, detail)
    values (new.owner, tg_table_name || '.update', new.id, jsonb_build_object('status', new.status, 'duress', new.duress));
    return new;
  end if;
end $$;

create trigger audit_sessions after insert or update or delete on public.sessions
  for each row execute function public.audit_row();
create trigger audit_pieces after insert or delete on public.pieces
  for each row execute function public.audit_row();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Private evidence bucket. Objects live under <owner uid>/<session id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 26214400)
on conflict (id) do nothing;

create policy "evidence: add own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

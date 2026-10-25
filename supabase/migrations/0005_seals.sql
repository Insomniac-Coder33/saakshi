-- Sealing. Every piece gets a salted leaf, SHA-256(salt || sha256), computed here so the phone can't
-- choose it. The sealer (/api/seal, using the secret key) gathers unsealed leaves into one Merkle tree,
-- records each leaf's proof, and anchors the root on Polygon Amoy through EvidenceAnchor.sol.

create table public.seals (
  id bigint generated always as identity primary key,
  root text not null unique check (root ~ '^[0-9a-f]{64}$'),
  leaf_count integer not null check (leaf_count > 0),
  status text not null default 'building' check (status in ('building', 'sent', 'confirmed', 'failed')),
  chain_id integer not null default 80002,
  tx_hash text check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  block_number bigint,
  anchored_at timestamptz,  -- the block's own timestamp
  created_at timestamptz not null default now()
);
create index seals_open on public.seals (created_at) where status in ('building', 'sent');

-- Roots and transactions are public on-chain anyway; anyone may read them.
alter table public.seals enable row level security;
create policy "seals are public" on public.seals for select to anon, authenticated using (true);

alter table public.pieces
  add column leaf text check (leaf ~ '^[0-9a-f]{64}$'),
  add column seal_id bigint references public.seals (id) on delete set null,
  add column proof jsonb;
create index pieces_unsealed on public.pieces (received_at) where seal_id is null;
create index pieces_seal on public.pieces (seal_id);

-- The phone inserts pieces, but the leaf and the seal are never hers to set.
create or replace function public.piece_leaf() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  new.leaf := encode(digest(decode(new.salt, 'hex') || decode(new.sha256, 'hex'), 'sha256'), 'hex');
  new.seal_id := null;
  new.proof := null;
  return new;
end $$;
create trigger pieces_leaf before insert on public.pieces
  for each row execute function public.piece_leaf();

-- One row, so only one sealer runs at a time and seals are spaced out to save gas.
create table public.sealer (
  id boolean primary key default true check (id),
  locked_until timestamptz not null default 'epoch',
  last_sealed_at timestamptz not null default 'epoch'
);
insert into public.sealer default values;
alter table public.sealer enable row level security;

create or replace function public.seal_claim(min_gap_seconds integer) returns boolean
language sql as $$
  update public.sealer set locked_until = now() + interval '90 seconds'
  where id and locked_until < now() and last_sealed_at < now() - make_interval(secs => min_gap_seconds)
  returning true
$$;

create or replace function public.seal_release(sealed boolean) returns void
language sql as $$
  update public.sealer
  set locked_until = 'epoch', last_sealed_at = case when sealed then now() else last_sealed_at end
  where id
$$;

-- Records a built tree in one transaction: the seal row and every leaf's proof.
create or replace function public.seal_record(p_root text, p_items jsonb) returns bigint
language plpgsql as $$
declare
  sid bigint;
begin
  insert into public.seals (root, leaf_count) values (p_root, jsonb_array_length(p_items)) returning id into sid;
  update public.pieces p set seal_id = sid, proof = i.proof
  from jsonb_to_recordset(p_items) as i (id uuid, proof jsonb)
  where p.id = i.id and p.seal_id is null;
  return sid;
end $$;

revoke execute on function public.seal_claim(integer) from public, anon, authenticated;
revoke execute on function public.seal_release(boolean) from public, anon, authenticated;
revoke execute on function public.seal_record(text, jsonb) from public, anon, authenticated;

-- A whole recording file (one segment) exactly as she downloads it from her vault. It isn't sealed
-- itself: the Verify page splits it back into its pieces and checks each piece's own seal.
create table public.files (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  segment integer not null check (segment >= 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size bigint not null check (size >= 0),
  piece_count integer not null check (piece_count > 0),
  created_at timestamptz not null default now(),
  unique (session_id, segment)
);
create index files_sha256 on public.files (sha256);
alter table public.files enable row level security;
create policy "own files" on public.files
  for all to authenticated using (owner = auth.uid()) with check (
    owner = auth.uid()
    and exists (select 1 from public.sessions s where s.id = session_id and s.owner = auth.uid())
  );

-- Pieces that arrived before this migration get their leaves now.
update public.pieces
set leaf = encode(digest(decode(salt, 'hex') || decode(sha256, 'hex'), 'sha256'), 'hex')
where leaf is null;

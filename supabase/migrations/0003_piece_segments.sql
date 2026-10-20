-- When the phone takes the camera away mid-SOS, recording restarts as a new segment. Each segment
-- is its own playable file (a new recorder writes a new header), so pieces record which one they are in.
alter table public.pieces add column segment integer not null default 0 check (segment >= 0);

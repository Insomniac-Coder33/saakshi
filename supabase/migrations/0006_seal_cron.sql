-- Runs the sealer once a minute from the database, so pieces still get sealed when no phone asks:
-- for example when hers was taken right after the last upload. /api/seal spends gas only when
-- something is waiting, so a quiet minute costs nothing.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- Re-running cron.schedule with the same name replaces the job, so a later migration can move it
-- to another domain.
select cron.schedule(
  'saakshi-seal',
  '* * * * *',
  $$ select net.http_post(url := 'https://web-alpha-orcin-85.vercel.app/api/seal', body := '{}'::jsonb, timeout_milliseconds := 55000) $$
);

-- plpgsql plans a CASE expression as a whole, so reading new.session_id failed on sessions rows.
-- Build the detail through to_jsonb(), which works for any table.
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb;
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (owner, action, subject_id, detail)
    values (old.owner, tg_table_name || '.delete', old.id, '{}'::jsonb);
    return old;
  end if;
  rec := to_jsonb(new);
  insert into public.audit_log (owner, action, subject_id, detail)
  values (
    new.owner,
    tg_table_name || '.' || lower(tg_op),
    new.id,
    case when tg_table_name = 'pieces'
      then jsonb_build_object('session_id', rec->'session_id', 'kind', rec->'kind', 'seq', rec->'seq', 'sha256', rec->'sha256')
      else jsonb_build_object('kind', rec->'kind', 'status', rec->'status', 'duress', rec->'duress')
    end
  );
  return new;
end $$;

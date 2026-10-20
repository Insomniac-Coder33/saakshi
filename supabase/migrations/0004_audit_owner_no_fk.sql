-- Erasing an account cascades into sessions and pieces, whose audit triggers then wrote rows that
-- referenced the user being deleted, so the delete failed. The audit owner is now a plain uuid;
-- /api/erase removes the user's audit rows itself and keeps one anonymous "account.erase" entry.
alter table public.audit_log drop constraint if exists audit_log_owner_fkey;

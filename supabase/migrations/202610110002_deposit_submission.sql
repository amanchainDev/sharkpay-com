-- Allow authenticated investors to submit only their own pending deposits.
-- Admin review remains server-authorized and the existing admin update policy is preserved.

alter table public.deposit_records
  add constraint deposit_records_pending_submission_check
  check (status = 'pending' or reviewed_by is not null);

alter table public.deposit_records
  drop constraint if exists deposit_records_reference_required;

alter table public.deposit_records
  add constraint deposit_records_reference_required
  check (tx_hash is not null or explorer_url is not null);

create unique index if not exists deposit_records_tx_hash_unique
  on public.deposit_records (chain, tx_hash)
  where tx_hash is not null;
create unique index if not exists deposit_records_explorer_url_unique
  on public.deposit_records (explorer_url)
  where explorer_url is not null;

drop policy if exists deposit_investor_insert on public.deposit_records;
create policy deposit_investor_insert on public.deposit_records
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

grant select, insert, update on public.deposit_records to authenticated;
grant select, insert on public.returns_ledger to authenticated;

-- SHARKYPAY auditable deposit and returns ledger
-- Apply this file in the connected Supabase SQL Editor before using the review UI.

create table if not exists public.deposit_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid references public.investments(id) on delete set null,
  chain text not null,
  asset text not null,
  treasury_address text not null,
  tx_hash text,
  explorer_url text,
  amount numeric(20,8) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  evidence_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (chain, tx_hash)
);

create table if not exists public.returns_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid references public.investments(id) on delete set null,
  deposit_id uuid references public.deposit_records(id) on delete set null,
  entry_type text not null check (entry_type in ('return','adjustment','withdrawal')),
  amount numeric(20,8) not null check (amount <> 0),
  asset text not null,
  reference text not null,
  note text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists deposit_records_user_status_idx on public.deposit_records(user_id, status, created_at desc);
create index if not exists returns_ledger_user_created_idx on public.returns_ledger(user_id, created_at desc);

alter table public.deposit_records enable row level security;
alter table public.returns_ledger enable row level security;

drop policy if exists deposit_self_select on public.deposit_records;
create policy deposit_self_select on public.deposit_records for select to authenticated using ((select auth.uid()) = user_id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists ledger_self_select on public.returns_ledger;
create policy ledger_self_select on public.returns_ledger for select to authenticated using ((select auth.uid()) = user_id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists deposit_admin_insert on public.deposit_records;
create policy deposit_admin_insert on public.deposit_records for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
drop policy if exists deposit_admin_update on public.deposit_records;
create policy deposit_admin_update on public.deposit_records for update to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
drop policy if exists ledger_admin_insert on public.returns_ledger;
create policy ledger_admin_insert on public.returns_ledger for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create or replace view public.investor_verified_balances (user_id, asset, confirmed_deposits, recorded_returns, net_balance) with (security_invoker = true) as
select u.user_id, u.asset,
  coalesce(d.confirmed_deposits, 0) as confirmed_deposits,
  coalesce(u.recorded_returns, 0) as recorded_returns,
  coalesce(d.confirmed_deposits, 0) + coalesce(u.recorded_returns, 0) + coalesce(u.withdrawals, 0) as net_balance
from (
  select user_id, asset,
    sum(amount) filter (where entry_type = 'return') as recorded_returns,
    sum(amount) filter (where entry_type = 'withdrawal') as withdrawals
  from public.returns_ledger group by user_id, asset
) u
left join (
  select user_id, asset, sum(amount) as confirmed_deposits
  from public.deposit_records where status = 'confirmed' group by user_id, asset
) d using (user_id, asset);

-- Deposits are intentionally not auto-confirmed. Admin review must verify explorer evidence,
-- then update the deposit row and append a matching ledger entry in one controlled operation.
-- Never grant service_role to browser code.

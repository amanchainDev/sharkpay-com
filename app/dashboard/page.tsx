'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = { full_name: string | null; phone: string | null; country: string | null }
type Investment = { id: string; amount: number; chain: string; status: string; created_at: string; investment_plans: { name: string } | null }
type Transaction = { id: string; type: string; amount: number; asset: string; status: string; created_at: string }
type LedgerEntry = { id: string; entry_type: string; amount: number; asset: string; reference: string; note: string; created_at: string }
type DepositRecord = { id: string; amount: number; asset: string; chain: string; tx_hash: string | null; status: string; explorer_url: string | null; created_at: string }
type VerifiedBalance = { asset: string; confirmed_deposits: number; recorded_returns: number; net_balance: number }

export default function DashboardPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
  const [profile, setProfile] = useState<Profile>({ full_name: '', phone: '', country: '' })
  const [investments, setInvestments] = useState<Investment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [deposits, setDeposits] = useState<DepositRecord[]>([])
  const [balances, setBalances] = useState<VerifiedBalance[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { setSupabase(createClient()) }, [])

  useEffect(() => {
    if (!supabase) return
    const loadAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.assign('/?auth=login')
        return
      }
      setEmail(user.email ?? '')
      const [{ data: profileData, error: profileError }, { data: investmentData, error: investmentError }, { data: transactionData, error: transactionError }, { data: ledgerData, error: ledgerError }, { data: depositData, error: depositError }, { data: balanceData, error: balanceError }] = await Promise.all([
        supabase.from('profiles').select('full_name, phone, country').eq('id', user.id).single(),
        supabase.from('investments').select('id, amount, chain, status, created_at, investment_plans(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('id, type, amount, asset, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('returns_ledger').select('id, entry_type, amount, asset, reference, note, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('deposit_records').select('id, amount, asset, chain, tx_hash, status, explorer_url, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('investor_verified_balances').select('asset, confirmed_deposits, recorded_returns, net_balance').eq('user_id', user.id),
      ])
      if (profileError && profileError.code !== 'PGRST116') setError('Unable to load your profile.')
      if (investmentError || transactionError || ledgerError || depositError || balanceError) setError('Unable to load account activity.')
      if (profileData) setProfile(profileData)
      setInvestments((investmentData ?? []) as Investment[])
      setTransactions((transactionData ?? []) as Transaction[])
      setLedger((ledgerData ?? []) as LedgerEntry[])
      setDeposits((depositData ?? []) as DepositRecord[])
      setBalances((balanceData ?? []) as VerifiedBalance[])
      setLoading(false)
    }
    void loadAccount()
  }, [supabase])

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    if (!supabase) { setError('Account services are still loading.'); setSaving(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Your session has expired. Please sign in again.'); setSaving(false); return }
    const { error: updateError } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() })
    setSaving(false)
    if (updateError) { setError('Profile changes could not be saved.'); return }
    setMessage('Profile updated successfully.')
  }

  const invested = investments.reduce((total, item) => total + Number(item.amount), 0)
  const confirmed = investments.filter((item) => item.status === 'confirmed').length

  if (loading) return <main className="min-h-screen bg-[#030914] p-8 text-white"><div className="mx-auto max-w-6xl animate-pulse text-slate-400">Loading your secure account...</div></main>

  return <main className="min-h-screen bg-[#030914] text-white">
    <header className="border-b border-white/10 bg-[#071426] px-5 py-5 lg:px-10"><div className="mx-auto flex max-w-6xl items-center justify-between"><a href="/" className="tracking-[.22em] text-[#64f6a5]">SHARKYPAY</a><div className="flex items-center gap-4"><span className="hidden text-sm text-slate-400 sm:block">{email}</span><button onClick={async () => { await supabase?.auth.signOut(); window.location.assign('/') }} className="rounded-full border border-white/15 px-4 py-2 text-sm">Sign out</button></div></div></header>
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[220px_1fr] lg:px-10">
      <aside className="h-fit rounded-3xl border border-white/10 bg-white/[.035] p-4"><p className="mb-4 px-3 text-xs uppercase tracking-[.2em] text-slate-500">Investor account</p><nav className="flex gap-2 overflow-auto lg:flex-col"><a className="rounded-xl bg-[#64f6a5]/10 px-3 py-3 text-sm text-[#64f6a5]" href="#overview">Overview</a><a className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5" href="#investments">Investments</a><a className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5" href="#transactions">Transactions</a><a className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5" href="#profile">Profile</a></nav></aside>
      <section className="flex flex-col gap-8">
        <div id="overview"><p className="text-sm uppercase tracking-[.2em] text-[#64f6a5]">Investor profile</p><h1 className="mt-2 text-4xl font-semibold">Your account, in clear view.</h1><p className="mt-3 text-slate-400">Review confirmed investments, account activity and verified portfolio records.</p></div>
        {error && <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-3"><Metric label="Verified balance" value={balances.length ? balances.map((item) => `${Number(item.net_balance).toLocaleString()} ${item.asset}`).join(' · ') : '—'} /><Metric label="Confirmed investments" value={String(confirmed)} /><Metric label="Recorded transactions" value={String(transactions.length)} /></div>
        <section id="investments" className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">My investments</h2><p className="mt-1 text-sm text-slate-500">Only investments recorded against your authenticated account appear here.</p></div><a href="/#plans" className="rounded-full bg-[#64f6a5] px-4 py-2 text-sm font-bold text-[#03151a]">New investment</a></div>{investments.length === 0 ? <Empty text="No investments have been recorded yet." /> : <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-slate-500"><tr><th className="pb-3">Plan</th><th className="pb-3">Amount</th><th className="pb-3">Chain</th><th className="pb-3">Status</th><th className="pb-3">Date</th></tr></thead><tbody>{investments.map((item) => <tr className="border-t border-white/10" key={item.id}><td className="py-4">{item.investment_plans?.name ?? 'Investment'}</td><td className="py-4">${Number(item.amount).toLocaleString()}</td><td className="py-4">{item.chain}</td><td className="py-4"><Status value={item.status} /></td><td className="py-4 text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}</section>
        <section id="transactions" className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><h2 className="text-xl font-semibold">Verified returns and activity</h2><p className="mt-1 text-sm text-slate-500">Only confirmed deposits and auditable ledger entries affect your account. No returns are estimated.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Metric label="Recorded returns" value={ledger.filter((item) => item.entry_type === 'return').length ? `$${ledger.filter((item) => item.entry_type === 'return').reduce((total, item) => total + Number(item.amount), 0).toLocaleString()}` : '—'} /><Metric label="Pending deposits" value={String(deposits.filter((item) => item.status === 'pending').length)} /></div>{ledger.length === 0 && transactions.length === 0 ? <Empty text="No verified returns or transactions have been recorded yet." /> : <div className="mt-6 flex flex-col gap-3">{ledger.map((item) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#64f6a5]/20 bg-[#64f6a5]/[.04] p-4" key={item.id}><div><p className="font-medium capitalize">Verified {item.entry_type} · {item.asset}</p><p className="mt-1 text-xs text-slate-400">{item.note}</p><p className="mt-1 text-xs text-slate-500">Reference: {item.reference} · {new Date(item.created_at).toLocaleString()}</p></div><p className="font-semibold text-[#64f6a5]">${Number(item.amount).toLocaleString()}</p></div>)}{transactions.map((item) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 p-4" key={item.id}><div><p className="font-medium capitalize">{item.type} · {item.asset}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p></div><div className="text-right"><p className="font-semibold">${Number(item.amount).toLocaleString()}</p><Status value={item.status} /></div></div>)}</div>}</section>
        <section id="profile" className="rounded-3xl border border-[#2dbbff]/25 bg-gradient-to-br from-[#0a203b] to-[#071224] p-6"><h2 className="text-xl font-semibold">Personal details</h2><p className="mt-1 text-sm text-slate-500">Keep your investor profile current for account support and verification.</p><form onSubmit={saveProfile} className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Full name"><input value={profile.full_name ?? ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#64f6a5]/60" /></Field><Field label="Phone"><input value={profile.phone ?? ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#64f6a5]/60" /></Field><Field label="Country"><input value={profile.country ?? ''} onChange={(e) => setProfile({ ...profile, country: e.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#64f6a5]/60" /></Field><div className="flex items-end"><button disabled={saving} className="w-full rounded-full bg-[#64f6a5] px-5 py-3 font-bold text-[#03151a] disabled:opacity-60">{saving ? 'Saving...' : 'Save changes'}</button></div></form>{message && <p className="mt-4 text-sm text-[#64f6a5]">{message}</p>}</section>
      </section>
    </div>
  </main>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div> }
function Empty({ text }: { text: string }) { return <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-500">{text}</div> }
function Status({ value }: { value: string }) { return <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs capitalize text-slate-300">{value.replace('_', ' ')}</span> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="flex flex-col gap-2 text-sm text-slate-400">{label}{children}</label> }

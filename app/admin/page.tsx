'use client'

import { useState } from 'react'
import { Users, Wallet, Shield, Settings, LogOut, Menu, X, Download, Search, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ADMIN_EMAIL = 'admin@sharkypay.com'
const DEFAULT_ADMIN_PASSWORD = 'Arriver'

interface Investment {
  id: string
  investor: string
  email: string
  plan: string
  amount: number
  chain: string
  wallet: string
  txHash: string
  status: 'pending' | 'confirmed' | 'failed'
  date: string
}

interface User {
  id: string
  email: string
  joinDate: string
  status: 'active' | 'verified' | 'suspended'
  totalInvested: number
}

interface SharkApplication {
  id: string
  name: string
  email: string
  phone: string
  country: string
  investmentAmount: number
  status: 'pending' | 'approved' | 'rejected'
  submittedDate: string
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'investments' | 'users' | 'shark' | 'settings'>('overview')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASSWORD)
  const [authError, setAuthError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [investments, setInvestments] = useState<Investment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [sharkApps, setSharkApps] = useState<SharkApplication[]>([])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password })
    if (error || !data.user) { setAuthError('Invalid admin credentials.'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
    if (profile?.role !== 'admin') { await supabase.auth.signOut(); setAuthError('This account is not authorized for administration.'); return }
    setAuthenticated(true)
  }

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordMessage('')
    if (newPassword.length < 8) { setPasswordError('Use at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return }
    const { error } = await createClient().auth.updateUser({ password: newPassword })
    if (error) { setPasswordError('Unable to change password. Please sign in again and retry.'); return }
    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMessage('Password changed successfully. Use the new password next time you sign in.')
  }

  if (!authenticated) {
    return <main className="min-h-screen bg-[#030914] text-white flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[#2dbbff]/25 bg-gradient-to-br from-[#0a203b] to-[#071224] p-8">
          <div className="flex justify-center mb-6">
            <img src="/sharkpay-logo.png" alt="SHARKYPAY" className="size-16 rounded-full" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Admin Portal</h1>
          <p className="text-center text-slate-400 text-sm mb-6">SHARKYPAY Management Dashboard</p>
          <div className="mb-6 rounded-xl border border-[#64f6a5]/20 bg-[#64f6a5]/[.06] p-4 text-sm leading-6 text-slate-300">
            Administration is restricted to accounts with the <strong className="text-[#64f6a5]">admin</strong> role in Supabase.
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <label className="text-sm text-slate-300">Admin password</label>
            <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter admin password" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3" />
            {authError && <p className="text-sm text-red-300">{authError}</p>}
            <button type="submit" className="w-full rounded-full bg-[#64f6a5] px-5 py-3 font-bold text-[#03151a] hover:bg-[#4dd97a]">
              Sign in securely
            </button>
          </form>
        </div>
      </div>
    </main>
  }

  const stats = {
    totalUsers: users.length,
    totalInvested: investments.reduce((sum, inv) => sum + (inv.status === 'confirmed' ? inv.amount : 0), 0),
    pendingInvestments: investments.filter(inv => inv.status === 'pending').length,
    sharkApplications: sharkApps.filter(app => app.status === 'pending').length,
  }

  const filteredInvestments = investments.filter(inv =>
    inv.investor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.txHash.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredSharkApps = sharkApps.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return <main className="min-h-screen bg-[#030914] text-white">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030914]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/sharkpay-logo.png" alt="SHARKYPAY Admin" className="size-10 rounded-full" />
          <div>
            <span className="block font-bold tracking-[.22em] text-sm">ADMIN</span>
            <small className="text-[9px] tracking-[.25em] text-slate-500">MANAGEMENT</small>
          </div>
        </div>
        <nav className="hidden gap-6 text-sm lg:flex">
          {[['overview', 'Overview'], ['investments', 'Investments'], ['users', 'Users'], ['shark', 'SHARK Apps'], ['settings', 'Settings']].map(([tab, label]) =>
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`transition ${activeTab === tab ? 'text-[#64f6a5]' : 'text-slate-400 hover:text-white'}`}
            >
              {label}
            </button>
          )}
        </nav>
        <button onClick={async () => { await createClient().auth.signOut(); setAuthenticated(false); setPassword('') }} className="hidden gap-2 rounded-full border border-white/15 px-4 py-2 text-sm md:flex items-center">
          <LogOut size={16} /> Logout
        </button>
        <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2">
          {mobileMenu ? <X /> : <Menu />}
        </button>
      </div>
      {mobileMenu && <nav className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 text-sm">
        {[['overview', 'Overview'], ['investments', 'Investments'], ['users', 'Users'], ['shark', 'SHARK Apps'], ['settings', 'Settings']].map(([tab, label]) =>
          <button key={tab} onClick={() => { setActiveTab(tab as any); setMobileMenu(false) }} className={activeTab === tab ? 'text-[#64f6a5]' : 'text-slate-400'}>
            {label}
          </button>
        )}
        <button onClick={() => { setAuthenticated(false); setMobileMenu(false) }} className="border-t border-white/10 pt-3 text-left text-slate-400">
          Logout
        </button>
      </nav>}
    </header>

    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      {activeTab === 'overview' && <section>
        <h1 className="text-4xl font-bold mb-8">Dashboard Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            ['Total Users', stats.totalUsers, Users, '#64f6a5'],
            ['Total Invested', `$${(stats.totalInvested / 1000000).toFixed(2)}M`, DollarSign, '#2dbbff'],
            ['Pending Investments', stats.pendingInvestments, Clock, '#f4c95d'],
            ['SHARK Applications', stats.sharkApplications, Shield, '#64f6a5'],
          ].map(([label, value, Icon, color]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{String(label)}</p>
                <b className="block text-3xl mt-2">{String(value)}</b>
              </div>
              <div style={{ color: String(color) }} className="opacity-60">
                {/* @ts-ignore */}
                <Icon size={28} />
              </div>
            </div>
          </div>)}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Investments</h3>
            <div className="space-y-3">
              {investments.slice(0, 5).map(inv => <div key={inv.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{inv.investor}</p>
                  <p className="text-xs text-slate-500">{inv.plan} • ${inv.amount}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${inv.status === 'confirmed' ? 'bg-[#64f6a5]/20 text-[#64f6a5]' : inv.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                  {inv.status}
                </div>
              </div>)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
            <h3 className="text-lg font-semibold mb-4">System Health</h3>
            <div className="space-y-4">
              {[['Platform Uptime', '99.9%', '#64f6a5'], ['API Response', '89ms', '#2dbbff'], ['Database Status', 'Healthy', '#64f6a5'], ['Security Checks', 'Passed', '#64f6a5']].map(([metric, value, color]) => <div key={metric}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">{metric}</span>
                  <span className="font-semibold" style={{ color }}>{value}</span>
                </div>
                <div className="h-1.5 bg-white/[.05] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ backgroundColor: color, width: value.includes('%') ? value : '100%' }} />
                </div>
              </div>)}
            </div>
          </div>
        </div>
      </section>}

      {activeTab === 'investments' && <section>
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <h1 className="text-4xl font-bold">Investment Management</h1>
          <div className="flex gap-2">
            <div className="relative flex-1 md:flex-initial">
              <Search size={18} className="absolute left-3 top-3 text-slate-400" />
              <input type="text" placeholder="Search investments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 w-full md:w-64 text-sm" />
            </div>
            <button className="rounded-xl border border-white/15 px-4 py-2.5 text-sm hover:bg-white/5"><Download size={18} /></button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full">
            <thead className="bg-white/[.03] border-b border-white/10">
              <tr className="text-sm text-slate-400">
                <th className="px-4 py-3 text-left">Investor</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Chain</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredInvestments.map(inv => <tr key={inv.id} className="hover:bg-white/[.02] transition">
                <td className="px-4 py-3 text-sm">
                  <p className="font-medium">{inv.investor}</p>
                  <p className="text-xs text-slate-500">{inv.email}</p>
                </td>
                <td className="px-4 py-3 text-sm">{inv.plan}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold">${inv.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{inv.chain}</td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${inv.status === 'confirmed' ? 'bg-[#64f6a5]/20 text-[#64f6a5]' : inv.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                    {inv.status === 'confirmed' ? <CheckCircle size={14} /> : inv.status === 'pending' ? <Clock size={14} /> : <AlertCircle size={14} />}
                    {inv.status}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button className="text-slate-400 hover:text-white text-sm">View</button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>}

      {activeTab === 'users' && <section>
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <h1 className="text-4xl font-bold">User Management</h1>
          <div className="relative flex-1 md:flex-initial">
            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
            <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 w-full md:w-64 text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full">
            <thead className="bg-white/[.03] border-b border-white/10">
              <tr className="text-sm text-slate-400">
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Join Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total Invested</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredUsers.map(user => <tr key={user.id} className="hover:bg-white/[.02] transition">
                <td className="px-4 py-3 text-sm font-medium">{user.email}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{user.joinDate}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${user.status === 'verified' ? 'bg-[#64f6a5]/20 text-[#64f6a5]' : 'bg-blue-500/20 text-blue-300'}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold">${user.totalInvested.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <button className="text-slate-400 hover:text-white text-sm">Manage</button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>}

      {activeTab === 'shark' && <section>
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <h1 className="text-4xl font-bold">SHARK Investor Applications</h1>
          <div className="relative flex-1 md:flex-initial">
            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
            <input type="text" placeholder="Search applications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 w-full md:w-64 text-sm" />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredSharkApps.map(app => <div key={app.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">{app.name}</h3>
                <div className="mt-2 space-y-1 text-sm text-slate-400">
                  <p>Email: {app.email}</p>
                  <p>Phone: {app.phone}</p>
                  <p>Country: {app.country}</p>
                  <p className="text-[#64f6a5]">Proposed Investment: ${app.investmentAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${app.status === 'approved' ? 'bg-[#64f6a5]/20 text-[#64f6a5]' : app.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                  {app.status}
                </div>
                <p className="text-xs text-slate-500">Submitted: {app.submittedDate}</p>
                {app.status === 'pending' && <div className="flex gap-2 pt-2">
                  <button onClick={() => { const newApps = sharkApps.map(a => a.id === app.id ? { ...a, status: 'approved' as const } : a); setSharkApps(newApps) }} className="rounded-lg bg-[#64f6a5] px-3 py-1 text-xs font-semibold text-[#03151a] hover:bg-[#4dd97a]">
                    Approve
                  </button>
                  <button onClick={() => { const newApps = sharkApps.map(a => a.id === app.id ? { ...a, status: 'rejected' as const } : a); setSharkApps(newApps) }} className="rounded-lg border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10">
                    Reject
                  </button>
                </div>}
              </div>
            </div>
          </div>)}
        </div>
      </section>}

      {activeTab === 'settings' && <section>
        <h1 className="text-4xl font-bold mb-8">Admin Settings</h1>
        <div className="grid gap-6 max-w-2xl">
          <form onSubmit={changePassword} className="rounded-2xl border border-[#64f6a5]/20 bg-[#64f6a5]/[.04] p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Shield size={20} /> Change admin password</h3>
            <p className="mb-5 text-sm text-slate-400">Update the password for the hidden admin account securely through Supabase Auth.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" aria-label="New password" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3" />
              <input required minLength={8} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" aria-label="Confirm new password" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3" />
            </div>
            {passwordError && <p className="mt-3 text-sm text-red-300">{passwordError}</p>}
            {passwordMessage && <p className="mt-3 text-sm text-[#64f6a5]">{passwordMessage}</p>}
            <button type="submit" className="mt-5 rounded-full bg-[#64f6a5] px-5 py-2.5 font-bold text-[#03151a] hover:bg-[#4dd97a]">Change password</button>
          </form>
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Settings size={20} /> Investment Plan Configuration</h3>
            <div className="space-y-4">
              {['Gold', 'Silver', 'Diamond', 'SHARK'].map(plan => <div key={plan}>
                <label className="text-sm text-slate-400 mb-2 block">{plan} Plan</label>
                <div className="flex gap-3 items-center">
                  <input type="number" placeholder="Min" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
                  <span className="text-slate-400">to</span>
                  <input type="number" placeholder="Max" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
                </div>
              </div>)}
            </div>
            <button className="mt-6 rounded-full bg-[#64f6a5] px-6 py-2.5 font-bold text-[#03151a] hover:bg-[#4dd97a]">Save Settings</button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Wallet size={20} /> Treasury Wallet Configuration</h3>
            <div className="space-y-3 text-sm">
              <p className="text-slate-400 mb-3">Current Treasury Wallets:</p>
              <div className="font-mono text-xs space-y-2 bg-white/[.03] p-3 rounded-lg">
                <p><span className="text-[#64f6a5]">BSC/ETH:</span> 0xc240766472FEd8bB8fdf39c9362bAbbE7e3086A1</p>
                <p><span className="text-[#64f6a5]">SOL:</span> AVmgiG5hK6YfCufjC671gyZZVjZ23AJLnxdkjuj58yZi</p>
                <p><span className="text-[#64f6a5]">BTC:</span> bc1pd8k2d9dljvwfy5nadl9vhzl8ke2k007hfzeale0fwvxgzmtav45sleqex8</p>
                <p><span className="text-[#64f6a5]">TRON:</span> TRHsaAu4f1gfvEVFmu4YDDmk3ZLTv7guvC</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield size={20} /> Security & Audit</h3>
            <div className="space-y-3">
              <button className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm hover:bg-white/5 transition">
                Generate Audit Report
              </button>
              <button className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm hover:bg-white/5 transition">
                Download Transaction Log
              </button>
              <button className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm hover:bg-white/5 transition">
                View Security Status
              </button>
            </div>
          </div>
        </div>
      </section>}
    </div>
  </main>
}

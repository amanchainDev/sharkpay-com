import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const json = (message: string, status = 400) => NextResponse.json({ error: message }, { status })

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, response: json('Authentication required.', 401) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, user: null, response: json('Admin authorization required.', 403) }
  return { supabase, user, response: null }
}

export async function GET() {
  const { supabase, response } = await requireAdmin()
  if (response) return response
  const { data, error } = await supabase.from('deposit_records').select('id,user_id,investment_id,chain,asset,treasury_address,tx_hash,explorer_url,amount,status,evidence_note,created_at').eq('status', 'pending').order('created_at', { ascending: false })
  if (error) return json('Unable to load pending deposits.', 500)
  return NextResponse.json({ deposits: data })
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireAdmin()
  if (response || !user) return response
  const body = await request.json().catch(() => null) as { action?: string; depositId?: string; status?: 'confirmed' | 'rejected'; explorerUrl?: string; evidenceNote?: string; returnAmount?: number; asset?: string; reference?: string; note?: string; investmentId?: string; userId?: string } | null
  if (!body?.action) return json('Action is required.')

  if (body.action === 'review_deposit') {
    if (!body.depositId || !body.status || !body.explorerUrl || !body.evidenceNote) return json('Deposit status, explorer URL, and evidence note are required.')
    try { new URL(body.explorerUrl) } catch { return json('Explorer URL must be valid.') }
    const { data: deposit, error: depositError } = await supabase.from('deposit_records').select('id,user_id,investment_id,status').eq('id', body.depositId).eq('status', 'pending').single()
    if (depositError || !deposit) return json('Pending deposit not found.', 404)
    const { error } = await supabase.from('deposit_records').update({ status: body.status, explorer_url: body.explorerUrl, evidence_note: body.evidenceNote, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', deposit.id)
    if (error) return json('Unable to review deposit.', 500)
    if (body.status === 'confirmed' && deposit.investment_id) {
      const { error: investmentError } = await supabase.from('investments').update({ status: 'confirmed' }).eq('id', deposit.investment_id).eq('user_id', deposit.user_id)
      if (investmentError) return json('Deposit reviewed, but investment confirmation failed. Reconcile before crediting.', 500)
    }
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'record_return') {
    if (!body.userId || !body.returnAmount || body.returnAmount <= 0 || !body.asset || !body.reference || !body.note) return json('User, positive return amount, asset, reference, and note are required.')
    const { error } = await supabase.from('returns_ledger').insert({ user_id: body.userId, investment_id: body.investmentId ?? null, entry_type: 'return', amount: body.returnAmount, asset: body.asset, reference: body.reference, note: body.note, created_by: user.id })
    if (error) return json('Unable to record return.', 500)
    return NextResponse.json({ ok: true })
  }
  return json('Unsupported action.')
}

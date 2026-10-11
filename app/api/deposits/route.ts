import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TREASURIES: Record<string, string> = {
  'BSC / ETH': '0xc240766472FEd8bB8fdf39c9362bAbbE7e3086A1',
  SOL: 'AVmgiG5hK6YfCufjC671gyZZVjZ23AJLnxdkjuj58yZi',
  BTC: 'bc1pd8k2d9dljvwfy5nadl9vhzl8ke2k007hfzeale0fwvxgzmtav45sleqex8',
  TRC: 'TRHsaAu4f1gfvEVFmu4YDDmk3ZLTv7guvC',
}
const ASSETS = new Set(['Bitcoin', 'Ethereum', 'BNB', 'USDT', 'USDC', 'Solana'])

const json = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json('Authentication required.', 401)

  const body = await request.json().catch(() => null) as { amount?: unknown; asset?: unknown; chain?: unknown; txHash?: unknown; explorerUrl?: unknown; evidenceNote?: unknown } | null
  const amount = typeof body?.amount === 'number' ? body.amount : Number(body?.amount)
  const asset = typeof body?.asset === 'string' ? body.asset.trim() : ''
  const chain = typeof body?.chain === 'string' ? body.chain.trim() : ''
  const txHash = typeof body?.txHash === 'string' ? body.txHash.trim() : ''
  const explorerUrl = typeof body?.explorerUrl === 'string' ? body.explorerUrl.trim() : ''
  const evidenceNote = typeof body?.evidenceNote === 'string' ? body.evidenceNote.trim() : ''

  if (!Number.isFinite(amount) || amount <= 0) return json('Enter a positive amount.')
  if (!ASSETS.has(asset)) return json('Unsupported asset.')
  if (!TREASURIES[chain]) return json('Unsupported chain.')
  if (!txHash && !explorerUrl) return json('Provide a transaction hash or explorer URL.')
  if (explorerUrl) {
    try { new URL(explorerUrl) } catch { return json('Explorer URL must be valid.') }
  }
  if (evidenceNote.length < 10) return json('Add an evidence note with the transaction context.')

  const { error } = await supabase.from('deposit_records').insert({
    user_id: user.id,
    chain,
    asset,
    treasury_address: TREASURIES[chain],
    tx_hash: txHash || null,
    explorer_url: explorerUrl || null,
    amount,
    evidence_note: evidenceNote,
    status: 'pending',
  })
  if (error) {
    if (error.code === '23505') return json('This transaction reference has already been submitted.')
    return json('Unable to submit deposit for review.', 500)
  }
  return NextResponse.json({ ok: true, status: 'pending' }, { status: 201 })
}

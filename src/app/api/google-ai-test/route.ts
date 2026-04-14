import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { apiKey, model } = await req.json()
  // List available models to verify the key is valid
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`,
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = data?.error?.message ?? `${res.status}`
    return NextResponse.json({ error: msg }, { status: res.status })
  }
  return NextResponse.json({ ok: true })
}

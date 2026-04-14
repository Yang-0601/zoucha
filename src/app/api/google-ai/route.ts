import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { model, apiKey, payload } = await req.json()

    if (!apiKey) return NextResponse.json({ error: '缺少 API Key' }, { status: 400 })
    if (!model) return NextResponse.json({ error: '缺少 model' }, { status: 400 })

    const baseUrl = 'https://generativelanguage.googleapis.com'
    const res = await fetch(
      `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )

    if (!res.ok) {
      const body = await res.text()
      let msg = `${res.status}`
      try {
        const json = JSON.parse(body)
        msg = json?.error?.message ?? json?.message ?? msg
      } catch { /* ignore */ }
      return NextResponse.json({ error: msg }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

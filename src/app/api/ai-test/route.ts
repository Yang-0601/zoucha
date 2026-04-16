import { NextRequest, NextResponse } from 'next/server'

// If base URL already ends with a version segment (/v4, /v3, …), don't prepend /v1
function chatCompletionsUrl(base: string) {
  const trimmed = base.replace(/\/$/, '')
  return /\/v\d+$/.test(trimmed) ? `${trimmed}/chat/completions` : `${trimmed}/v1/chat/completions`
}

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, modelName, baseUrl } = await req.json()

    if (!apiKey) return NextResponse.json({ error: '请先填写 API Key' }, { status: 400 })
    if (!modelName) return NextResponse.json({ error: '请先选择模型' }, { status: 400 })

    // Gemini 现在直接从浏览器端测试，这里只处理其他 provider
    if (provider === 'google') {
      return NextResponse.json({ error: 'Gemini 应从浏览器端直接测试' }, { status: 400 })
    }

    let res: Response

    if (provider === 'anthropic') {
      const base = (baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '')
      res = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
    } else if (provider === 'openai' || provider === 'custom' || provider === 'zhipu') {
      const defaultBase = provider === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' : 'https://api.openai.com'
      const base = (baseUrl ?? defaultBase).replace(/\/$/, '')
      res = await fetch(chatCompletionsUrl(base), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
    } else {
      return NextResponse.json({ error: '未知 provider' }, { status: 400 })
    }

    if (!res.ok) {
      const body = await res.text()
      let msg = `${res.status}`
      try {
        const json = JSON.parse(body)
        msg = json?.error?.message ?? json?.message ?? json?.error ?? msg
      } catch { /* ignore */ }
      return NextResponse.json({ error: msg, status: res.status }, { status: res.status })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { AIModelConfig, DiffType, Severity } from '@/types'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt'

export interface ParsedDiff {
  title: string
  description: string
  diffType: DiffType[]
  severity: Severity
  confidence: number
  position: { x: number; y: number }
  designValue?: string
  implValue?: string
  delta?: string
  cssHint?: string
}

export interface AnalysisCallbacks {
  onDiff: (diff: ParsedDiff) => void
  onProgress: (pct: number, phase: string) => void
  signal: AbortSignal
}

// ── JSON extraction ──────────────────────────────────────────────────────────

function extractDiffs(raw: string): ParsedDiff[] {
  // Strip markdown fences if model wraps output
  const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1) return []
  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1))
    return Array.isArray(arr) ? arr.filter(isValidDiff) : []
  } catch {
    return []
  }
}

function isValidDiff(item: unknown): item is ParsedDiff {
  if (!item || typeof item !== 'object') return false
  const d = item as Record<string, unknown>
  return (
    typeof d.title === 'string' &&
    typeof d.description === 'string' &&
    Array.isArray(d.diffType) &&
    typeof d.severity === 'string' &&
    typeof d.confidence === 'number' &&
    d.position !== null && typeof d.position === 'object'
  )
}

// ── Anthropic ────────────────────────────────────────────────────────────────

async function runAnthropic(
  config: AIModelConfig,
  designBase64: string,
  liveBase64: string,
  cb: AnalysisCallbacks,
) {
  const baseUrl = config.baseUrl ?? 'https://api.anthropic.com'
  const userMsg = buildUserMessage(config, designBase64, liveBase64)

  cb.onProgress(10, '连接模型…')

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    signal: cb.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.modelName,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [userMsg],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${res.status}: ${err}`)
  }

  cb.onProgress(40, '解析响应…')
  const data = await res.json()
  const text: string = data?.content?.[0]?.text ?? ''
  cb.onProgress(80, '写入差异…')
  const diffs = extractDiffs(text)
  diffs.forEach(cb.onDiff)
  cb.onProgress(100, '完成')
}

// If base URL already contains a version segment (/v4, /v3, …) don't prepend /v1
function chatCompletionsUrl(base: string) {
  const trimmed = base.replace(/\/$/, '')
  return /\/v\d+$/.test(trimmed) ? `${trimmed}/chat/completions` : `${trimmed}/v1/chat/completions`
}

// ── OpenAI ───────────────────────────────────────────────────────────────────

async function runOpenAI(
  config: AIModelConfig,
  designBase64: string,
  liveBase64: string,
  cb: AnalysisCallbacks,
) {
  const baseUrl = (config.baseUrl ?? 'https://api.openai.com').replace(/\/$/, '')
  cb.onProgress(10, '连接模型…')

  const instructions = config.customPrompt ?? ''
  const res = await fetch(chatCompletionsUrl(baseUrl), {
    method: 'POST',
    signal: cb.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/png;base64,${designBase64}` } },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${liveBase64}` } },
            { type: 'text', text: `Image 1 is the design mockup. Image 2 is the live implementation.\n${instructions}` },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI ${res.status}: ${err}`)
  }

  cb.onProgress(40, '解析响应…')
  const data = await res.json()
  const text: string = data?.choices?.[0]?.message?.content ?? ''
  cb.onProgress(80, '写入差异…')
  extractDiffs(text).forEach(cb.onDiff)
  cb.onProgress(100, '完成')
}

// ── Google ───────────────────────────────────────────────────────────────────

async function runGoogle(
  config: AIModelConfig,
  designBase64: string,
  liveBase64: string,
  cb: AnalysisCallbacks,
) {
  const baseUrl = (config.baseUrl?.trim() || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
  const useApiKey = /^AIza[0-9A-Za-z_-]+$/.test(config.apiKey)
  const url = useApiKey
    ? `${baseUrl}/v1beta/models/${encodeURIComponent(config.modelName)}:generateContent?key=${encodeURIComponent(config.apiKey)}`
    : `${baseUrl}/v1beta/models/${encodeURIComponent(config.modelName)}:generateContent`

  cb.onProgress(10, '连接模型…')

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!useApiKey) headers.Authorization = `Bearer ${config.apiKey}`

  const instructions = config.customPrompt ?? ''
  const res = await fetch(url, {
    method: 'POST',
    signal: cb.signal,
    headers,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/png', data: designBase64 } },
          { inline_data: { mime_type: 'image/png', data: liveBase64 } },
          { text: `Image 1 is the design mockup. Image 2 is the live implementation.\n${instructions}` },
        ],
      }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }

    const errorMessage = typeof body === 'object' && body !== null
      ? (body as Record<string, any>)?.error?.message ?? text
      : text

    const isQuotaOrBilling =
      res.status === 429 ||
      errorMessage?.toString().includes('RESOURCE_EXHAUSTED') ||
      errorMessage?.toString().includes('Quota exceeded') ||
      errorMessage?.toString().includes('free_tier')

    if (isQuotaOrBilling) {
      throw new Error(
        'Google Gemini 出现配额或计费问题，请检查 Google Cloud 计费/配额并确认当前项目已启用 Gemini 模型。',
      )
    }

    throw new Error(`Google ${res.status}: ${errorMessage}`)
  }

  cb.onProgress(40, '解析响应…')
  const data = await res.json()
  const candidate = data?.candidates?.[0]?.content
  const text: string = candidate?.parts?.[0]?.text ?? candidate?.text ?? ''
  cb.onProgress(80, '写入差异…')
  extractDiffs(text).forEach(cb.onDiff)
  cb.onProgress(100, '完成')
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

export async function runProvider(
  config: AIModelConfig,
  designBase64: string,
  liveBase64: string,
  cb: AnalysisCallbacks,
) {
  switch (config.provider) {
    case 'anthropic': return runAnthropic(config, designBase64, liveBase64, cb)
    case 'openai':    return runOpenAI(config, designBase64, liveBase64, cb)
    case 'google':    return runGoogle(config, designBase64, liveBase64, cb)
    case 'zhipu':     return runOpenAI({ ...config, baseUrl: config.baseUrl ?? 'https://open.bigmodel.cn/api/paas/v4' }, designBase64, liveBase64, cb)
    case 'custom':    return runOpenAI(config, designBase64, liveBase64, cb)
  }
}

import { AIModelConfig, ReviewQuestion, ReviewAnswer, AuditReport } from '@/types'

// ── Prompts ───────────────────────────────────────────────────────────────────

const QUESTION_SYSTEM_PROMPT = `You are a UX research assistant. Given one or more design screenshots, generate 6–8 contextual questions to understand the design intent, target users, and key scenarios before conducting a usability audit.

Output ONLY a raw JSON array. Each item:
{
  "id": string,           // "q1", "q2", …
  "text": string,         // question text in Chinese
  "type": "single" | "multi" | "text",
  "options": string[],    // for single/multi: 3–5 choices in Chinese; for text: []
  "allowCustom": boolean  // true if user should be able to add a custom option
}

Guidelines:
- Cover: platform type, target users, core task/workflow, design system maturity, accessibility concerns, interaction complexity
- Keep questions concise and directly relevant to what you see in the screenshots
- For text-type questions, use them for open-ended clarification only
- Always include "allowCustom": true for single/multi questions
- Output Chinese text only`

const REPORT_SYSTEM_PROMPT = `You are a senior UX expert conducting a formal usability audit based on Nielsen's 10 Usability Heuristics.

You will receive:
1. Design screenshots
2. Design context (answered questionnaire)

Analyze the design systematically. For each usability issue found, map it to the most relevant heuristic.

Severity levels:
- "critical": Blocks task completion or causes serious user error
- "major": Significantly degrades user experience
- "minor": Noticeable issue but workaround exists
- "suggestion": Enhancement opportunity, not a current problem

Output ONLY raw JSON in this exact format (no markdown):
{
  "score": number,          // 0–100 overall usability score
  "summary": string,        // 2–3 sentence overall assessment in Chinese
  "findings": [
    {
      "id": string,                  // "f1", "f2", …
      "heuristicIndex": number,      // 1–10
      "heuristic": string,           // Chinese name from the list
      "severity": "critical"|"major"|"minor"|"suggestion",
      "title": string,               // ≤15 chars, Chinese
      "description": string,         // specific observation with location details, Chinese
      "recommendation": string,      // concrete fix recommendation, Chinese
      "affectedArea": string         // optional: which part of the UI
    }
  ]
}

Report all findings regardless of count. Be specific and actionable.`

// ── Nielsen's 10 Heuristics ───────────────────────────────────────────────────

const NIELSEN_HEURISTICS = [
  '系统状态可见性',
  '贴近真实世界',
  '用户控制与自由度',
  '一致性与标准',
  '防错设计',
  '识别而非记忆',
  '使用的灵活性与效率',
  '美观简洁的设计',
  '帮助用户识别、诊断和恢复错误',
  '帮助文档',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJson<T>(raw: string): T | null {
  const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim()
  // Try object first, then array
  const objStart = cleaned.indexOf('{')
  const arrStart = cleaned.indexOf('[')
  let start = -1
  let end = -1
  let isArr = false

  if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) {
    start = objStart
    end = cleaned.lastIndexOf('}')
    isArr = false
  } else if (arrStart !== -1) {
    start = arrStart
    end = cleaned.lastIndexOf(']')
    isArr = true
  }

  // isArr is checked to avoid lint warning; both branches produce a valid JSON slice
  void isArr

  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

function chatCompletionsUrl(base: string) {
  const trimmed = base.replace(/\/$/, '')
  return /\/v\d+$/.test(trimmed) ? `${trimmed}/chat/completions` : `${trimmed}/v1/chat/completions`
}

/** Gemini 2.5 series supports thinkingConfig for internal reasoning. */
function supportsGeminiThinking(modelName: string): boolean {
  return /gemini-2\.5/i.test(modelName)
}

// ── generateQuestions ─────────────────────────────────────────────────────────

export async function generateQuestions(
  imagesBase64: string[],  // already base64-encoded PNG strings
  config: AIModelConfig,
): Promise<ReviewQuestion[]> {
  const questionPromptText = '请根据以上设计截图，生成 6–8 个问题以了解设计意图、目标用户和核心场景。'

  switch (config.provider) {
    case 'anthropic': {
      const baseUrl = (config.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '')
      const userContent: unknown[] = [
        ...imagesBase64.map(b64 => ({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: b64 },
        })),
        { type: 'text', text: questionPromptText },
      ]

      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.modelName,
          max_tokens: 4096,
          system: QUESTION_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Anthropic ${res.status}: ${err}`)
      }

      const data = await res.json()
      const text: string = data?.content?.[0]?.text ?? ''
      const items = extractJson<ReviewQuestion[]>(text)
      return validateQuestions(items)
    }

    case 'openai':
    case 'zhipu':
    case 'custom': {
      const defaultBase =
        config.provider === 'zhipu'
          ? 'https://open.bigmodel.cn/api/paas/v4'
          : 'https://api.openai.com'
      const baseUrl = (config.baseUrl ?? defaultBase).replace(/\/$/, '')

      const imageContentParts = imagesBase64.map(b64 => ({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${b64}` },
      }))

      const res = await fetch(chatCompletionsUrl(baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelName,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: QUESTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                ...imageContentParts,
                { type: 'text', text: questionPromptText },
              ],
            },
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`${config.provider} ${res.status}: ${err}`)
      }

      const data = await res.json()
      const text: string = data?.choices?.[0]?.message?.content ?? ''
      const items = extractJson<ReviewQuestion[]>(text)
      return validateQuestions(items)
    }

    case 'google': {
      const thinking = supportsGeminiThinking(config.modelName)
      const baseUrl = (config.baseUrl?.trim() || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
      const useApiKey = /^AIza[0-9A-Za-z_-]+$/.test(config.apiKey)
      const url = useApiKey
        ? `${baseUrl}/v1beta/models/${encodeURIComponent(config.modelName)}:generateContent?key=${encodeURIComponent(config.apiKey)}`
        : `${baseUrl}/v1beta/models/${encodeURIComponent(config.modelName)}:generateContent`

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (!useApiKey) headers.Authorization = `Bearer ${config.apiKey}`

      const generationConfig: Record<string, unknown> = {
        maxOutputTokens: thinking ? 16384 : 8192,
      }
      if (thinking) {
        generationConfig.thinkingConfig = { thinkingBudget: 8000 }
      }

      const imageParts = imagesBase64.map(b64 => ({
        inline_data: { mime_type: 'image/png', data: b64 },
      }))

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: QUESTION_SYSTEM_PROMPT }] },
          contents: [{
            role: 'user',
            parts: [
              ...imageParts,
              { text: questionPromptText },
            ],
          }],
          generationConfig,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Google ${res.status}: ${err}`)
      }

      const data = await res.json()
      const candidate = data?.candidates?.[0]?.content
      const text: string = candidate?.parts?.[0]?.text ?? candidate?.text ?? ''
      const items = extractJson<ReviewQuestion[]>(text)
      return validateQuestions(items)
    }
  }
}

function validateQuestions(items: ReviewQuestion[] | null): ReviewQuestion[] {
  if (!Array.isArray(items)) return []
  return items.filter(
    (item): item is ReviewQuestion =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.text === 'string' &&
      typeof item.type === 'string' &&
      Array.isArray(item.options),
  )
}

// ── generateReport ────────────────────────────────────────────────────────────

export async function generateReport(
  imagesBase64: string[],
  questions: ReviewQuestion[],
  answers: ReviewAnswer[],
  config: AIModelConfig,
  callbacks: {
    onProgress: (pct: number, phase: string) => void
    signal: AbortSignal
  },
): Promise<AuditReport> {
  const { onProgress, signal } = callbacks

  // Build Q&A context text
  const contextLines: string[] = ['设计背景信息：']
  for (const question of questions) {
    const answer = answers.find(a => a.questionId === question.id)
    if (answer && answer.selected.length > 0) {
      contextLines.push(`Q: ${question.text}`)
      contextLines.push(`A: ${answer.selected.join('、')}`)
    }
  }
  const contextText = contextLines.join('\n')

  onProgress(10, '连接模型…')

  let rawText = ''

  switch (config.provider) {
    case 'anthropic': {
      const baseUrl = (config.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '')
      const userContent: unknown[] = [
        ...imagesBase64.map(b64 => ({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: b64 },
        })),
        { type: 'text', text: contextText },
      ]

      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.modelName,
          max_tokens: 8192,
          system: REPORT_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Anthropic ${res.status}: ${err}`)
      }

      onProgress(40, '解析响应…')
      const data = await res.json()
      rawText = data?.content?.[0]?.text ?? ''
      break
    }

    case 'openai':
    case 'zhipu':
    case 'custom': {
      const defaultBase =
        config.provider === 'zhipu'
          ? 'https://open.bigmodel.cn/api/paas/v4'
          : 'https://api.openai.com'
      const baseUrl = (config.baseUrl ?? defaultBase).replace(/\/$/, '')

      const imageContentParts = imagesBase64.map(b64 => ({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${b64}` },
      }))

      const res = await fetch(chatCompletionsUrl(baseUrl), {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelName,
          max_tokens: 8192,
          messages: [
            { role: 'system', content: REPORT_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                ...imageContentParts,
                { type: 'text', text: contextText },
              ],
            },
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`${config.provider} ${res.status}: ${err}`)
      }

      onProgress(40, '解析响应…')
      const data = await res.json()
      rawText = data?.choices?.[0]?.message?.content ?? ''
      break
    }

    case 'google': {
      const thinking = supportsGeminiThinking(config.modelName)
      onProgress(10, thinking ? '连接模型（深度推理中）…' : '连接模型…')

      const baseUrl = (config.baseUrl?.trim() || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
      const useApiKey = /^AIza[0-9A-Za-z_-]+$/.test(config.apiKey)
      const url = useApiKey
        ? `${baseUrl}/v1beta/models/${encodeURIComponent(config.modelName)}:generateContent?key=${encodeURIComponent(config.apiKey)}`
        : `${baseUrl}/v1beta/models/${encodeURIComponent(config.modelName)}:generateContent`

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (!useApiKey) headers.Authorization = `Bearer ${config.apiKey}`

      const generationConfig: Record<string, unknown> = {
        maxOutputTokens: thinking ? 16384 : 8192,
      }
      if (thinking) {
        generationConfig.thinkingConfig = { thinkingBudget: 8000 }
      }

      const imageParts = imagesBase64.map(b64 => ({
        inline_data: { mime_type: 'image/png', data: b64 },
      }))

      const res = await fetch(url, {
        method: 'POST',
        signal,
        headers,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: REPORT_SYSTEM_PROMPT }] },
          contents: [{
            role: 'user',
            parts: [
              ...imageParts,
              { text: contextText },
            ],
          }],
          generationConfig,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Google ${res.status}: ${err}`)
      }

      onProgress(40, '解析响应…')
      const data = await res.json()
      const candidate = data?.candidates?.[0]?.content
      rawText = candidate?.parts?.[0]?.text ?? candidate?.text ?? ''
      break
    }
  }

  onProgress(80, '生成报告…')

  interface RawReport {
    score: number
    summary: string
    findings: Array<{
      id: string
      heuristicIndex: number
      heuristic: string
      severity: string
      title: string
      description: string
      recommendation: string
      affectedArea?: string
    }>
  }

  const parsed = extractJson<RawReport>(rawText)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('无法解析 AI 返回的报告 JSON')
  }

  const findings = (parsed.findings ?? []).map(f => ({
    id: f.id ?? crypto.randomUUID(),
    heuristicIndex: f.heuristicIndex ?? 1,
    heuristic: f.heuristic ?? NIELSEN_HEURISTICS[(f.heuristicIndex ?? 1) - 1] ?? '',
    severity: (f.severity as AuditReport['findings'][number]['severity']) ?? 'minor',
    title: f.title ?? '',
    description: f.description ?? '',
    recommendation: f.recommendation ?? '',
    ...(f.affectedArea !== undefined ? { affectedArea: f.affectedArea } : {}),
  }))

  onProgress(100, '完成')

  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    summary: parsed.summary ?? '',
    score: parsed.score ?? 0,
    findings,
  }
}

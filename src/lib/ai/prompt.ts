import { AIModelConfig } from '@/types'

const DIFF_COUNT: Record<AIModelConfig['precision'], string> = {
  low:      '找出最重要的 1-5 处差异（仅 high/mid severity）',
  standard: '找出所有明显差异，最多 15 处',
  high:     '找出所有差异，不限数量，每条必须提供 cssHint',
}

const LANG_HINT: Record<AIModelConfig['language'], string> = {
  zh: '重要：title 和 description 字段必须使用中文输出，禁止使用英文。',
  en: 'IMPORTANT: All text fields (title, description) must be in English only.',
}

export const SYSTEM_PROMPT = `\
You are a professional UI design-review engineer.
You will receive two images:
- Image 1: the design mockup (expected)
- Image 2: the live implementation (actual)

Your job is to identify visual discrepancies between them and return a JSON array.
Output ONLY the raw JSON array — no markdown fences, no explanation.

Each item in the array must follow this schema exactly:
{
  "title": string,          // ≤10 chars, concise label (language per instruction below)
  "description": string,    // specific description, include numeric values when visible (language per instruction below)
  "diffType": string[],     // one or more of: element|text|module|layout|spacing|interaction|color|font-weight|line-height
  "severity": "high"|"mid"|"low",
  "confidence": number,     // 0-100, your confidence this is a real discrepancy
  "position": { "x": number, "y": number }, // normalized 0-1 coords pointing to the center of the diff area IN IMAGE 2
  "designValue": string,    // optional, value in design
  "implValue": string,      // optional, value in implementation
  "delta": string,          // optional, e.g. "-4px" or "+2"
  "cssHint": string         // optional CSS fix suggestion
}
`

export function buildUserMessage(
  config: AIModelConfig,
  designBase64: string,
  liveBase64: string,
) {
  const instructions = [
    LANG_HINT[config.language],
    DIFF_COUNT[config.precision],
    config.customPrompt ?? '',
  ].filter(Boolean).join('\n')

  return {
    role: 'user' as const,
    content: [
      {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: 'image/png' as const, data: designBase64 },
      },
      {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: 'image/png' as const, data: liveBase64 },
      },
      {
        type: 'text' as const,
        text: `${LANG_HINT[config.language]}\nImage 1 is the design mockup. Image 2 is the live implementation.\n${instructions}`,
      },
    ],
  }
}

import { AIModelConfig } from '@/types'

const DIFF_COUNT: Record<AIModelConfig['precision'], string> = {
  low:      '只报告最重要的 1–5 处差异（仅 high/mid severity，confidence ≥ 80）。',
  standard: '报告所有明显差异，最多 15 处（confidence ≥ 65）。',
  high:     '报告所有差异，不限数量，每条必须提供 cssHint（confidence ≥ 50）。',
}

const LANG_HINT: Record<AIModelConfig['language'], string> = {
  zh: '重要：title 和 description 字段必须使用中文输出，禁止使用英文。',
  en: 'IMPORTANT: All text fields (title, description) must be in English only.',
}

export const SYSTEM_PROMPT = `\
You are an expert UI design-review engineer with pixel-level attention to detail.
You will receive two images:
- Image 1: the design mockup (expected / target)
- Image 2: the live implementation (actual / current)

## Analysis Method
Scan both images systematically using this process:
1. Divide the UI into logical regions: header, navigation, hero/banner, content sections, cards, forms, buttons, footer, etc.
2. For EACH region, compare side-by-side across these dimensions: typography (size, weight, family, line-height), spacing (margin, padding, gap), color (background, text, border), layout (alignment, width, flex/grid), and component shape (border-radius, shadow, border).
3. For each discrepancy found, determine its exact location in Image 2 and record normalized (0–1) x/y coordinates pointing to the CENTER of the affected element.

## Severity Criteria
- "high": Immediately noticeable; breaks visual consistency or usability (wrong color scheme, missing component, significantly wrong layout, wrong font family).
- "mid": Noticeable on close inspection; affects polish (wrong font size, incorrect spacing > 4px, misaligned elements, wrong border-radius).
- "low": Subtle; minor polish issue (1–2px spacing difference, slight color shade variation, minor weight difference).

## Confidence Criteria
- 90–100: Clearly visible — you are certain it is a real discrepancy.
- 70–89: Visible but image compression or scale introduces slight uncertainty.
- 50–69: Possible discrepancy, hard to confirm due to image quality or small scale.
- < 50: Do NOT include.

## What NOT to Report
- Different text content or data values (unless the TEXT STYLE is wrong).
- Image / illustration / icon content differences (unless sizing or placement is wrong).
- Differences caused by screenshot compression artifacts or anti-aliasing.
- Items with confidence below the threshold set by the precision level.

## Output Format
Output ONLY the raw JSON array — no markdown fences, no explanation, no preamble.

Each item must follow this schema exactly:
{
  "title": string,          // ≤10 chars, concise label (language per instruction)
  "description": string,    // specific description with numeric values when visible (language per instruction)
  "diffType": string[],     // one or more: element|text|module|layout|spacing|interaction|color|font-weight|line-height
  "severity": "high"|"mid"|"low",
  "confidence": number,     // integer 50–100
  "position": { "x": number, "y": number }, // normalized 0–1 coords of the center of the diff area IN IMAGE 2
  "designValue": string,    // optional: value observed in Image 1
  "implValue": string,      // optional: value observed in Image 2
  "delta": string,          // optional: e.g. "-4px", "+2", "#FF0000 → #EE0000"
  "cssHint": string         // optional: CSS property/value fix suggestion
}
`

/** Shared instruction block — language hint + precision + custom prompt. */
export function buildInstructions(config: AIModelConfig): string {
  return [
    LANG_HINT[config.language],
    DIFF_COUNT[config.precision],
    config.customPrompt ?? '',
  ].filter(Boolean).join('\n')
}

export function buildUserMessage(
  config: AIModelConfig,
  designBase64: string,
  liveBase64: string,
) {
  const instructions = buildInstructions(config)

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
        text: `Image 1 is the design mockup. Image 2 is the live implementation.\n${instructions}`,
      },
    ],
  }
}

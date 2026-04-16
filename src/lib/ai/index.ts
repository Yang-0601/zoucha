import { useAppStore } from '@/store'
import { Annotation, DiffRecord } from '@/types'
import { runProvider, ParsedDiff } from './providers'

/** Convert an image URL to a base64 string (without the data: prefix) */
async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip "data:image/png;base64," prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

let abortController: AbortController | null = null

export function abortAnalysis() {
  abortController?.abort()
  abortController = null
}

export async function runAnalysis() {
  const store = useAppStore.getState()
  const {
    designImage, liveImage,
    aiConfigs, activeAIConfigId,
    setAnalysisRunning, setAnalysisProgress, setAnalysisPhase,
    setShowAIConfigModal,
    addAnnotation, addDiff,
    annotations,
  } = store

  // Guard: need images
  if (!designImage || !liveImage) return

  // Guard: need a configured model
  const config = aiConfigs.find(c => c.id === activeAIConfigId) ?? aiConfigs[0]
  if (!config) {
    setShowAIConfigModal(true)
    return
  }

  abortController = new AbortController()

  setAnalysisRunning(true)
  setAnalysisProgress(0)
  setAnalysisPhase('准备图片…')

  try {
    // Use scaled URLs when available (they match the canvas viewport)
    const designUrl = designImage.scaledUrl ?? designImage.url
    const liveUrl   = liveImage.scaledUrl   ?? liveImage.url

    setAnalysisPhase('上传图片…')
    const [designBase64, liveBase64] = await Promise.all([
      urlToBase64(designUrl),
      urlToBase64(liveUrl),
    ])

    // Current max index across existing annotations
    let nextIndex = annotations.length
      ? Math.max(...annotations.map(a => a.index)) + 1
      : 1

    const onDiff = (parsed: ParsedDiff) => {
      const annId  = crypto.randomUUID()
      const diffId = crypto.randomUUID()

      // Convert normalized position to canvas pixels
      const canvasW = designImage.scaledWidth  ?? designImage.width
      const canvasH = designImage.scaledHeight ?? designImage.height

      const annotation: Annotation = {
        id: annId,
        index: nextIndex++,
        style: 'A',
        severity: parsed.severity,
        position: {
          x: parsed.position.x * canvasW,
          y: parsed.position.y * canvasH,
        },
        rect: null,
        locked: false,
        diffId,
        source: 'ai',
        aiModel: config.modelName,
        confidence: parsed.confidence,
      }

      const diff: DiffRecord = {
        id: diffId,
        annotationId: annId,
        title: parsed.title,
        description: parsed.description,
        diffType: parsed.diffType,
        severity: parsed.severity,
        source: 'ai',
        confidence: parsed.confidence,
        aiModel: config.modelName,
        designValue: parsed.designValue,
        implValue: parsed.implValue,
        delta: parsed.delta,
        cssHint: parsed.cssHint,
        fixStatus: 'pending',
      }

      addAnnotation(annotation)
      addDiff(diff)
    }

    await runProvider(config, designBase64, liveBase64, {
      onDiff,
      onProgress: (pct, phase) => {
        setAnalysisProgress(pct)
        setAnalysisPhase(phase)
      },
      signal: abortController.signal,
    })
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('[AI Analysis]', err)
      setAnalysisPhase('分析失败')
    }
  } finally {
    setAnalysisRunning(false)
    abortController = null
  }
}

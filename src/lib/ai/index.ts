import { useAppStore } from '@/store'
import { Annotation, DiffRecord, ImageFile } from '@/types'
import { runProvider, ParsedDiff } from './providers'

/** Maximum pixel width sent to AI. Larger = better detail, larger payload. */
const AI_ANALYSIS_WIDTH = 1200

/**
 * Convert an ImageFile to base64 for AI analysis using the original-resolution
 * image (imgFile.url), capped at AI_ANALYSIS_WIDTH. This gives the model far
 * more detail than the canvas display width (typically 375px).
 */
async function imageToBase64ForAI(imgFile: ImageFile): Promise<string> {
  // If original fits within the limit, fetch directly.
  if (imgFile.width <= AI_ANALYSIS_WIDTH) {
    const res = await fetch(imgFile.url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // Otherwise scale down to AI_ANALYSIS_WIDTH via canvas.
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = AI_ANALYSIS_WIDTH / img.naturalWidth
      const h = Math.round(img.naturalHeight * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = AI_ANALYSIS_WIDTH
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, AI_ANALYSIS_WIDTH, h)
      resolve(canvas.toDataURL('image/png').split(',')[1])
    }
    img.onerror = reject
    img.src = imgFile.url
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
    // Send original-resolution images to AI (capped at AI_ANALYSIS_WIDTH).
    // Canvas uses a smaller targetWidth for display; positions are normalised 0-1
    // so they map back to canvas coordinates correctly regardless of resolution.
    setAnalysisPhase('准备图片…')
    const [designBase64, liveBase64] = await Promise.all([
      imageToBase64ForAI(designImage),
      imageToBase64ForAI(liveImage),
    ])

    // Current max index across existing annotations
    let nextIndex = annotations.length
      ? Math.max(...annotations.map(a => a.index)) + 1
      : 1

    const onDiff = (parsed: ParsedDiff) => {
      const annId  = crypto.randomUUID()
      const diffId = crypto.randomUUID()

      // Convert normalized position to live-image canvas pixels
      // (AI positions are in Image 2 = live image coordinate space)
      const canvasW = liveImage.scaledWidth  ?? liveImage.width
      const canvasH = liveImage.scaledHeight ?? liveImage.height

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

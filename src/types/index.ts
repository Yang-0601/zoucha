export type Severity = 'high' | 'mid' | 'low'
export type AnnotationStyle = 'A' | 'B' | 'C'
export type RectCorner = 'tl' | 'tr' | 'bl' | 'br'
export type DiffType = string

export type AnnotationSource = 'ai' | 'manual'

export interface Annotation {
  id: string
  index: number
  style: AnnotationStyle
  severity: Severity
  position: { x: number; y: number }
  rect: { x: number; y: number; w: number; h: number } | null
  rectCorner?: RectCorner
  locked: boolean
  diffId: string
  source: AnnotationSource
  aiModel?: string
  confidence?: number
  diffType?: DiffType
  designValue?: string
  implValue?: string
  delta?: string
  cssHint?: string
  fillOpacity?: number  // 0-100, only used when style === 'C'; default 20
  edited?: boolean
  note?: string
}

export interface DiffRecord {
  id: string
  annotationId: string
  title: string
  description: string
  diffType: DiffType[]
  severity: Severity
  source: AnnotationSource
  confidence?: number
  aiModel?: string
  designValue?: string
  implValue?: string
  delta?: string
  cssHint?: string
  note?: string
  fixStatus: 'pending' | 'fixed' | 'ignored'
  edited?: boolean
}

export type CompareMode = 'side-by-side' | 'slider' | 'overlay-heatmap' | 'overlap'

export interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
}

export interface ImageFile {
  file?: File           // 从 Storage 加载时为 undefined
  url: string           // blob URL（本地）或 Storage URL（远端加载）
  storedUrl?: string    // Supabase Storage 永久 URL（上传后设置）
  width: number
  height: number
  scaledUrl?: string
  scaledWidth?: number
  scaledHeight?: number
}

export interface Guideline {
  id: string
  axis: 'x' | 'y'  // x = vertical line, y = horizontal line
  pos: number       // canvas-space position in px
}

export interface Project {
  id: string
  name: string
  version: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface ProjectVersion {
  id: string
  projectId: string
  name: string
  createdAt: number
  updatedAt: number
}

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'zhipu' | 'custom'

export interface AIModelConfig {
  id: string
  provider: AIProvider
  modelName: string
  apiKey: string
  baseUrl?: string
  precision: 'low' | 'standard' | 'high'
  language: 'zh' | 'en'
  customPrompt?: string
}

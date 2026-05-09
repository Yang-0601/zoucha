import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Annotation,
  DiffRecord,
  CompareMode,
  ViewState,
  ImageFile,
  AIModelConfig,
  Guideline,
} from '@/types'

const PRESET_WIDTHS = [375, 390, 750, 768, 1280, 1440, 1920]

const DEFAULT_VIEW: ViewState = { scale: 1, offsetX: 0, offsetY: 0 }

const EMPTY_GUIDELINES_MAP = (): Record<CompareMode, Guideline[]> => ({
  'side-by-side': [],
  'slider': [],
  'overlay-heatmap': [],
  'overlap': [],
})

interface VersionSnapshot {
  designImage: ImageFile | null
  liveImage: ImageFile | null
  activeAnnotationId: string | null
  annotations: Annotation[]
  diffs: DiffRecord[]
  analysisRunning: boolean
  analysisProgress: number
  analysisPhase: string
}

interface AppState {
  // Upload page
  designImage: ImageFile | null
  liveImage: ImageFile | null
  targetWidth: number
  customWidth: string

  // Workbench
  compareMode: CompareMode
  viewState: ViewState        // shared view (sync locked)
  designViewState: ViewState  // independent design view (side-by-side)
  liveViewState: ViewState    // independent live view (side-by-side)
  overlayDesignViewState: ViewState  // independent design view (overlay modes)
  overlayLiveViewState: ViewState    // independent live view (overlay modes)
  overlaySelectedLayer: 'design' | 'live'  // selected layer for arrow-key nudge in overlay modes
  syncLocked: boolean
  syncLockedMap: Record<'overlay-heatmap' | 'overlap', boolean>
  sliderPos: number
  designOpacity: number
  liveOpacity: number
  differenceBlend: boolean
  heatmapBlend: string
  liveOffsetX: number
  liveOffsetY: number
  showRuler: boolean
  showGuides: boolean
  guidelinesMap: Record<CompareMode, Guideline[]>
  activeAnnotationId: string | null
  annotations: Annotation[]
  diffs: DiffRecord[]
  analysisRunning: boolean
  analysisProgress: number
  analysisPhase: string
  activeVersionId: string | null
  versionData: Record<string, VersionSnapshot>
  versionLoading: boolean
  versionSynced: boolean   // true once the first load attempt for active version completes

  // Annotation mode
  annotationMode: boolean
  pendingAnnotationStyle: import('@/types').AnnotationStyle
  pendingFillOpacity: number

  // Role
  role: 'reviewer' | 'developer' | null
  setRole: (r: 'reviewer' | 'developer' | null) => void

  // AI config
  aiConfigs: AIModelConfig[]
  activeAIConfigId: string | null
  showAIConfigModal: boolean
  confidenceThreshold: number
  diffFilter: 'all' | 'ai' | 'manual'

  // Actions
  setAnnotationMode: (v: boolean) => void
  setPendingAnnotationStyle: (s: import('@/types').AnnotationStyle) => void
  setPendingFillOpacity: (v: number) => void
  setDesignImage: (img: ImageFile | null) => void
  setLiveImage: (img: ImageFile | null) => void
  setTargetWidth: (w: number) => void
  setCustomWidth: (v: string) => void
  setCompareMode: (m: CompareMode) => void
  setViewState: (vs: ViewState) => void
  setDesignViewState: (vs: ViewState) => void
  setLiveViewState: (vs: ViewState) => void
  setOverlayDesignViewState: (vs: ViewState) => void
  setOverlayLiveViewState: (vs: ViewState) => void
  setOverlaySelectedLayer: (v: 'design' | 'live') => void
  setSyncLocked: (v: boolean) => void
  alignViews: (align: 'top' | 'left' | 'right' | 'bottom') => void
  setSliderPos: (v: number) => void
  setDesignOpacity: (v: number) => void
  setLiveOpacity: (v: number) => void
  setDifferenceBlend: (v: boolean) => void
  setHeatmapBlend: (v: string) => void
  setLiveOffset: (x: number, y: number) => void
  toggleRuler: () => void
  toggleGuides: () => void
  addGuideline: (g: Guideline) => void
  moveGuideline: (id: string, pos: number) => void
  removeGuideline: (id: string) => void
  clearGuidelines: () => void
  setActiveAnnotation: (id: string | null) => void
  addAnnotation: (a: Annotation) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void
  setAnnotations: (anns: Annotation[]) => void
  setDiffs: (diffs: DiffRecord[]) => void
  setGuidelinesMap: (m: Record<CompareMode, Guideline[]>) => void
  setVersionLoading: (v: boolean) => void
  setVersionSynced: (v: boolean) => void
  clearAnnotationsAndDiffs: () => void
  addDiff: (d: DiffRecord) => void
  updateDiff: (id: string, patch: Partial<DiffRecord>) => void
  removeDiff: (id: string) => void
  reorderDiffs: (fromId: string, toId: string) => void
  setAnalysisRunning: (v: boolean) => void
  setAnalysisProgress: (v: number) => void
  setAnalysisPhase: (v: string) => void
  addAIConfig: (c: AIModelConfig) => void
  updateAIConfig: (id: string, patch: Partial<AIModelConfig>) => void
  removeAIConfig: (id: string) => void
  setActiveAIConfig: (id: string | null) => void
  setShowAIConfigModal: (v: boolean) => void
  showReportModal: boolean
  setShowReportModal: (v: boolean) => void
  showHelpModal: boolean
  setShowHelpModal: (v: boolean) => void
  setConfidenceThreshold: (v: number) => void
  setDiffFilter: (f: 'all' | 'ai' | 'manual') => void
  switchVersion: (versionId: string | null) => void
  customDiffTypes: string[]
  addCustomDiffType: (label: string) => void
  removeCustomDiffType: (label: string) => void
}

export const PRESET_WIDTHS_LIST = PRESET_WIDTHS

export const useAppStore = create<AppState>()(persist((set, get) => ({
  designImage: null,
  liveImage: null,
  targetWidth: 375,
  customWidth: '',

  compareMode: 'side-by-side',
  viewState: { ...DEFAULT_VIEW },
  designViewState: { ...DEFAULT_VIEW },
  liveViewState: { ...DEFAULT_VIEW },
  syncLocked: true,
  syncLockedMap: { 'overlay-heatmap': true, 'overlap': true },
  sliderPos: 50,
  designOpacity: 100,
  liveOpacity: 50,
  differenceBlend: false,
  heatmapBlend: 'difference',
  liveOffsetX: 0,
  liveOffsetY: 0,
  showRuler: true,
  showGuides: true,
  guidelinesMap: EMPTY_GUIDELINES_MAP(),
  activeAnnotationId: null,
  annotations: [],
  diffs: [],
  analysisRunning: false,
  analysisProgress: 0,
  analysisPhase: '',
  activeVersionId: null,
  versionData: {},
  versionLoading: false,
  versionSynced: false,

  role: null,
  setRole: (r) => set({ role: r }),

  aiConfigs: [],
  activeAIConfigId: null,
  showAIConfigModal: false,
  showReportModal: false,
  showHelpModal: false,
  confidenceThreshold: 70,
  diffFilter: 'all' as 'all' | 'ai' | 'manual',
  customDiffTypes: [],

  annotationMode: false,
  pendingAnnotationStyle: 'A' as import('@/types').AnnotationStyle,
  pendingFillOpacity: 20,

  setAnnotations: (anns) => set({ annotations: anns }),
  setDiffs: (diffs) => set({ diffs }),
  setGuidelinesMap: (m) => set({ guidelinesMap: m }),
  setVersionLoading: (v) => set({ versionLoading: v }),
  setVersionSynced: (v) => set({ versionSynced: v }),
  setAnnotationMode: (v) => set({ annotationMode: v }),
  setPendingAnnotationStyle: (s) => set({ pendingAnnotationStyle: s }),
  setPendingFillOpacity: (v) => set({ pendingFillOpacity: v }),
  setDesignImage: (img) => set({ designImage: img }),
  setLiveImage: (img) => set({ liveImage: img }),
  setTargetWidth: (w) => set({ targetWidth: w }),
  setCustomWidth: (v) => set({ customWidth: v }),
  switchVersion: (versionId) => set((state) => {
    const currentId = state.activeVersionId
    const outgoingSnapshot = currentId ? {
      designImage: state.designImage,
      liveImage: state.liveImage,
      activeAnnotationId: state.activeAnnotationId,
      annotations: state.annotations,
      diffs: state.diffs,
      analysisRunning: state.analysisRunning,
      analysisProgress: state.analysisProgress,
      analysisPhase: state.analysisPhase,
    } : null

    if (currentId === versionId) {
      return {}
    }

    const nextSnapshot = versionId ? state.versionData[versionId] : undefined
    const nextVersionData = currentId && outgoingSnapshot
      ? { ...state.versionData, [currentId]: outgoingSnapshot }
      : state.versionData

    if (nextSnapshot) {
      return {
        versionData: nextVersionData,
        activeVersionId: versionId,
        ...nextSnapshot,
      }
    }

    return {
      versionData: nextVersionData,
      activeVersionId: versionId,
      designImage: null,
      liveImage: null,
      activeAnnotationId: null,
      annotations: [],
      diffs: [],
      analysisRunning: false,
      analysisProgress: 0,
      analysisPhase: '',
    }
  }),
  overlayDesignViewState: { ...DEFAULT_VIEW },
  overlayLiveViewState: { ...DEFAULT_VIEW },
  overlaySelectedLayer: 'design' as 'design' | 'live',

  setCompareMode: (m) => set({ compareMode: m }),
  setViewState: (vs) => set({ viewState: vs }),
  setDesignViewState: (vs) => set({ designViewState: vs }),
  setLiveViewState: (vs) => set({ liveViewState: vs }),
  setOverlayDesignViewState: (vs) => set({ overlayDesignViewState: vs }),
  setOverlayLiveViewState: (vs) => set({ overlayLiveViewState: vs }),
  setOverlaySelectedLayer: (v) => set({ overlaySelectedLayer: v }),
  setSyncLocked: (v) => set((s) => {
    const mode = s.compareMode
    if (mode === 'overlay-heatmap' || mode === 'overlap') {
      return { syncLockedMap: { ...s.syncLockedMap, [mode]: v } }
    }
    return { syncLocked: v }
  }),

  // Align the live view offset to match design view on the given axis
  alignViews: (align) => {
    const { compareMode, overlayDesignViewState, overlayLiveViewState } = get()
    const isOverlay = compareMode === 'overlay-heatmap' || compareMode === 'overlap'
    if (isOverlay) {
      // overlay 模式：对齐 overlayLiveViewState 到 overlayDesignViewState
      if (align === 'top') {
        set((s) => ({ overlayLiveViewState: { ...s.overlayLiveViewState, offsetY: overlayDesignViewState.offsetY } }))
      } else if (align === 'left') {
        set((s) => ({ overlayLiveViewState: { ...s.overlayLiveViewState, offsetX: overlayDesignViewState.offsetX } }))
      } else if (align === 'right') {
        set((s) => ({ overlayLiveViewState: { ...s.overlayLiveViewState, offsetX: overlayDesignViewState.offsetX } }))
      } else if (align === 'bottom') {
        set((s) => ({ overlayLiveViewState: { ...s.overlayLiveViewState, offsetY: overlayDesignViewState.offsetY } }))
      }
    } else {
      const { designViewState } = get()
      if (align === 'top') {
        set((s) => ({ liveViewState: { ...s.liveViewState, offsetY: designViewState.offsetY } }))
      } else if (align === 'left') {
        set((s) => ({ liveViewState: { ...s.liveViewState, offsetX: designViewState.offsetX } }))
      } else if (align === 'right') {
        set((s) => ({ liveViewState: { ...s.liveViewState, offsetX: designViewState.offsetX } }))
      } else if (align === 'bottom') {
        set((s) => ({ liveViewState: { ...s.liveViewState, offsetY: designViewState.offsetY } }))
      }
    }
  },

  setSliderPos: (v) => set({ sliderPos: v }),
  setDesignOpacity: (v) => set({ designOpacity: v }),
  setLiveOpacity: (v) => set({ liveOpacity: v }),
  setDifferenceBlend: (v) => set({ differenceBlend: v }),
  setHeatmapBlend: (v) => set({ heatmapBlend: v }),
  setLiveOffset: (x, y) => set({ liveOffsetX: x, liveOffsetY: y }),
  toggleRuler: () => set((s) => ({ showRuler: !s.showRuler })),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  addGuideline: (g) => set((s) => {
    const mode = s.compareMode
    return { guidelinesMap: { ...s.guidelinesMap, [mode]: [...s.guidelinesMap[mode], g] } }
  }),
  moveGuideline: (id, pos) => set((s) => {
    const mode = s.compareMode
    return { guidelinesMap: { ...s.guidelinesMap, [mode]: s.guidelinesMap[mode].map((g) => g.id === id ? { ...g, pos } : g) } }
  }),
  removeGuideline: (id) => set((s) => {
    const mode = s.compareMode
    return { guidelinesMap: { ...s.guidelinesMap, [mode]: s.guidelinesMap[mode].filter((g) => g.id !== id) } }
  }),
  clearGuidelines: () => set((s) => ({ guidelinesMap: { ...s.guidelinesMap, [s.compareMode]: [] } })),
  setActiveAnnotation: (id) => set({ activeAnnotationId: id }),
  addAnnotation: (a) =>
    set((s) => ({ annotations: [...s.annotations, a] })),
  updateAnnotation: (id, patch) =>
    set((s) => ({
      annotations: s.annotations.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    })),
  removeAnnotation: (id) =>
    set((s) => {
      const annotations = s.annotations.filter((a) => a.id !== id)
      return {
        annotations: annotations.map((a) => {
          const diffIdx = s.diffs.findIndex((d) => d.annotationId === a.id || d.id === a.diffId)
          return diffIdx >= 0 ? { ...a, index: diffIdx + 1 } : a
        }),
      }
    }),
  clearAnnotationsAndDiffs: () =>
    set({
      annotations: [],
      diffs: [],
      activeAnnotationId: null,
    }),
  addDiff: (d) => set((s) => ({ diffs: [...s.diffs, d], activeAnnotationId: d.annotationId })),
  updateDiff: (id, patch) =>
    set((s) => ({
      diffs: s.diffs.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),
  removeDiff: (id) =>
    set((s) => {
      const diffs = s.diffs.filter((d) => d.id !== id)
      return {
        diffs,
        annotations: s.annotations.map((a) => {
          const diffIdx = diffs.findIndex((d) => d.annotationId === a.id || d.id === a.diffId)
          return diffIdx >= 0 ? { ...a, index: diffIdx + 1 } : a
        }),
      }
    }),
  reorderDiffs: (fromId, toId) =>
    set((s) => {
      const arr = [...s.diffs]
      const fromIdx = arr.findIndex(d => d.id === fromId)
      const toIdx   = arr.findIndex(d => d.id === toId)
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return {}
      const [item] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, item)
      // re-sync annotation indices to match new order
      const annotations = s.annotations.map(a => {
        const diffIdx = arr.findIndex(d => d.annotationId === a.id || d.id === a.diffId)
        return diffIdx >= 0 ? { ...a, index: diffIdx + 1 } : a
      })
      return { diffs: arr, annotations }
    }),
  setAnalysisRunning: (v) => set({ analysisRunning: v }),
  setAnalysisProgress: (v) => set({ analysisProgress: v }),
  setAnalysisPhase: (v) => set({ analysisPhase: v }),
  addAIConfig: (c) =>
    set((s) => ({ aiConfigs: [...s.aiConfigs, c] })),
  updateAIConfig: (id, patch) =>
    set((s) => ({
      aiConfigs: s.aiConfigs.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    })),
  removeAIConfig: (id) =>
    set((s) => ({ aiConfigs: s.aiConfigs.filter((c) => c.id !== id) })),
  setActiveAIConfig: (id) => set({ activeAIConfigId: id }),
  setShowAIConfigModal: (v) => set({ showAIConfigModal: v }),
  setShowReportModal: (v) => set({ showReportModal: v }),
  setShowHelpModal: (v) => set({ showHelpModal: v }),
  setConfidenceThreshold: (v) => set({ confidenceThreshold: v }),
  setDiffFilter: (f) => set({ diffFilter: f }),
  addCustomDiffType: (label) => set((s) => ({
    customDiffTypes: s.customDiffTypes.includes(label) ? s.customDiffTypes : [...s.customDiffTypes, label],
  })),
  removeCustomDiffType: (label) => set((s) => ({
    customDiffTypes: s.customDiffTypes.filter(t => t !== label),
    diffs: s.diffs.map(d => ({
      ...d,
      diffType: d.diffType.filter((t: string) => t !== label),
    })).map(d => ({
      ...d,
      diffType: d.diffType.length > 0 ? d.diffType : ['element'],
    })),
  })),
}), {
  name: 'design-review-store',
  partialize: (s) => ({
    role: s.role,
    aiConfigs: s.aiConfigs,
    activeAIConfigId: s.activeAIConfigId,
    confidenceThreshold: s.confidenceThreshold,
    customDiffTypes: s.customDiffTypes,
  }),
}))

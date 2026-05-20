'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useAppStore } from '@/store'
import { ViewState, Guideline } from '@/types'
import clsx from 'clsx'
import AnnotationLayer from './AnnotationLayer'
import OverlapControls from './OverlapControls'

// ── constants ─────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.1  // 10%
const MAX_SCALE = 4.0  // 400%

// ── helpers ───────────────────────────────────────────────────────────────────

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
}

function zoomAtPoint(vs: ViewState, factor: number, cx: number, cy: number): ViewState {
  const newScale = clampScale(vs.scale * factor)
  const ratio = newScale / vs.scale
  return {
    scale: newScale,
    offsetX: cx - ratio * (cx - vs.offsetX),
    offsetY: cy - ratio * (cy - vs.offsetY),
  }
}

// ── useStableWheel ────────────────────────────────────────────────────────────
// Always reads latest VS via ref — prevents stale-closure jitter

function useStableWheel(
  elRef: React.RefObject<HTMLDivElement | null>,
  vsRef: React.MutableRefObject<ViewState>,
  onZoom: (vs: ViewState) => void
) {
  const onZoomRef = useRef(onZoom)
  onZoomRef.current = onZoom

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const rawDelta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY
      const factor = Math.pow(0.999, rawDelta)
      onZoomRef.current(zoomAtPoint(vsRef.current, factor, cx, cy))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  // re-attach only when element mounts/unmounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elRef.current])
}

// ── usePan ────────────────────────────────────────────────────────────────────
// requireSpace=true  → space+drag (side-by-side / slider)
// requireSpace=false → direct drag (overlay modes when unlocked)
// shiftDown: when provided and true at drag-start, constrains to dominant axis

function usePan(
  vsRef: React.MutableRefObject<ViewState>,
  onPan: (vs: ViewState) => void,
  opts: {
    requireSpace?: boolean
    spaceDown?: React.RefObject<boolean>
    shiftDown?: React.RefObject<boolean>
    onGrabChange?: (v: boolean) => void
  } = {}
) {
  const { requireSpace = true, spaceDown, shiftDown, onGrabChange } = opts
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  // axis constraint: null = free, 'x' = horizontal only, 'y' = vertical only
  const axisLock = useRef<'x' | 'y' | null>(null)
  // start position for shift-axis detection
  const dragStart = useRef({ x: 0, y: 0 })
  const shiftWasDown = useRef(false)
  const onPanRef = useRef(onPan)
  onPanRef.current = onPan

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (requireSpace && !spaceDown?.current) return
    e.preventDefault()
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
    dragStart.current = { x: e.clientX, y: e.clientY }
    shiftWasDown.current = !!(shiftDown?.current)
    axisLock.current = null
    onGrabChange?.(true)
  }, [requireSpace, spaceDown, shiftDown, onGrabChange])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }

    // Determine axis lock on first significant movement when Shift was held at drag-start
    if (shiftWasDown.current && axisLock.current === null) {
      const totalDx = Math.abs(e.clientX - dragStart.current.x)
      const totalDy = Math.abs(e.clientY - dragStart.current.y)
      if (totalDx > 4 || totalDy > 4) {
        axisLock.current = totalDx >= totalDy ? 'x' : 'y'
      }
    }

    const effectiveDx = axisLock.current === 'y' ? 0 : dx
    const effectiveDy = axisLock.current === 'x' ? 0 : dy

    const vs = vsRef.current
    onPanRef.current({ ...vs, offsetX: vs.offsetX + effectiveDx, offsetY: vs.offsetY + effectiveDy })
  }, [vsRef])

  // Returns whether a drag was actually in progress (so caller can decide to push undo)
  const onMouseUp = useCallback((): boolean => {
    if (dragging.current) {
      dragging.current = false
      axisLock.current = null
      shiftWasDown.current = false
      onGrabChange?.(false)
      return true
    }
    return false
  }, [onGrabChange])

  // Expose dragging state so external handlers can check before calling onDragStart
  const isDragging = () => dragging.current

  return { onMouseDown, onMouseMove, onMouseUp, isDragging }
}

// ── GuidelinesLayer ───────────────────────────────────────────────────────────
// Renders all guidelines relative to a given viewState.
// rulerContainerRef: the element that actually contains the ruler strips (used
//   for hit-testing in side-by-side mode where the ruler lives outside ImagePane).
// localShowRuler: whether this render site itself has a ruler offset to apply.
// globalShowRuler: whether the ruler is globally enabled (controls deletion zone).

function GuidelinesLayer({ viewState, showRuler, canvasRootRef, onDragStart, onDragEnd }: {
  viewState: ViewState
  showRuler: boolean
  canvasRootRef: React.RefObject<HTMLDivElement | null>
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  const { compareMode, showGuides, guidelinesMap, moveGuideline, removeGuideline } = useAppStore()
  const guidelines = guidelinesMap[compareMode]
  const [altDown, setAltDown] = useState(false)

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.key === 'Alt') { e.preventDefault(); setAltDown(true) } }
    const ku = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltDown(false) }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  if (!showGuides) return null

  // 当 Alt 按下时，计算同轴辅助线之间的距离标注
  const xLines = guidelines.filter(g => g.axis === 'x').sort((a, b) => a.pos - b.pos)
  const yLines = guidelines.filter(g => g.axis === 'y').sort((a, b) => a.pos - b.pos)
  const { scale, offsetX, offsetY } = viewState
  const rulerOffset = showRuler ? RULER_SIZE : 0

  const distanceBadges: React.ReactNode[] = []
  if (altDown) {
    // 垂直参考线(axis='x')之间的水平距离
    for (let i = 0; i + 1 < xLines.length; i++) {
      const a = xLines[i], b = xLines[i + 1]
      const dist = Math.abs(b.pos - a.pos)
      const screenA = a.pos * scale + offsetX + rulerOffset
      const screenB = b.pos * scale + offsetX + rulerOffset
      const midX = (screenA + screenB) / 2
      const labelY = rulerOffset + 24
      distanceBadges.push(
        <React.Fragment key={`xdist-${a.id}-${b.id}`}>
          {/* 连接线 */}
          <div style={{
            position: 'absolute',
            top: labelY + 8,
            left: Math.min(screenA, screenB),
            width: Math.abs(screenB - screenA),
            height: 1,
            background: '#f59e0b',
            opacity: 0.85,
            zIndex: 16,
            pointerEvents: 'none',
          }} />
          {/* 左端竖线 */}
          <div style={{ position: 'absolute', top: labelY + 4, left: Math.min(screenA, screenB), width: 1, height: 8, background: '#f59e0b', opacity: 0.85, zIndex: 16, pointerEvents: 'none' }} />
          {/* 右端竖线 */}
          <div style={{ position: 'absolute', top: labelY + 4, left: Math.max(screenA, screenB), width: 1, height: 8, background: '#f59e0b', opacity: 0.85, zIndex: 16, pointerEvents: 'none' }} />
          {/* 距离文字 */}
          <div style={{
            position: 'absolute',
            top: labelY - 8,
            left: midX,
            transform: 'translateX(-50%)',
            background: '#f59e0b',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            padding: '1px 5px',
            borderRadius: 3,
            zIndex: 17,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>{dist}px</div>
        </React.Fragment>
      )
    }
    // 水平参考线(axis='y')之间的垂直距离
    for (let i = 0; i + 1 < yLines.length; i++) {
      const a = yLines[i], b = yLines[i + 1]
      const dist = Math.abs(b.pos - a.pos)
      const screenA = a.pos * scale + offsetY + rulerOffset
      const screenB = b.pos * scale + offsetY + rulerOffset
      const midY = (screenA + screenB) / 2
      const labelX = rulerOffset + 24
      distanceBadges.push(
        <React.Fragment key={`ydist-${a.id}-${b.id}`}>
          {/* 连接线 */}
          <div style={{
            position: 'absolute',
            left: labelX + 8,
            top: Math.min(screenA, screenB),
            height: Math.abs(screenB - screenA),
            width: 1,
            background: '#f59e0b',
            opacity: 0.85,
            zIndex: 16,
            pointerEvents: 'none',
          }} />
          {/* 上端横线 */}
          <div style={{ position: 'absolute', left: labelX + 4, top: Math.min(screenA, screenB), height: 1, width: 8, background: '#f59e0b', opacity: 0.85, zIndex: 16, pointerEvents: 'none' }} />
          {/* 下端横线 */}
          <div style={{ position: 'absolute', left: labelX + 4, top: Math.max(screenA, screenB), height: 1, width: 8, background: '#f59e0b', opacity: 0.85, zIndex: 16, pointerEvents: 'none' }} />
          {/* 距离文字 */}
          <div style={{
            position: 'absolute',
            top: midY,
            left: labelX - 8,
            transform: 'translate(-100%, -50%)',
            background: '#f59e0b',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            padding: '1px 5px',
            borderRadius: 3,
            zIndex: 17,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>{dist}px</div>
        </React.Fragment>
      )
    }
  }

  return (
    <>
      {guidelines.map((g) => (
        <GuidelineLine
          key={g.id}
          guideline={g}
          viewState={viewState}
          showRuler={showRuler}
          canvasRootRef={canvasRootRef}
          onMove={(pos) => moveGuideline(g.id, pos)}
          onRemove={() => removeGuideline(g.id)}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
      {distanceBadges}
    </>
  )
}

// ── ImagePane (side-by-side) ──────────────────────────────────────────────────
// Each pane is a self-contained view unit with its own ruler + guidelines.
// Both panes share the same viewState (sync-locked), so guidelines appear
// identically in both panes automatically.

function ImagePane({
  src, label, vsRef, vs, onZoom, spaceDown, onGrabChange, showRuler, addGuideline, onDragStart, onDragEnd,
  isLive, imgWidth,
}: {
  src: string
  label: string
  vsRef: React.MutableRefObject<ViewState>
  vs: ViewState
  onZoom: (vs: ViewState) => void
  spaceDown: React.MutableRefObject<boolean>
  onGrabChange: (v: boolean) => void
  showRuler: boolean
  addGuideline: (g: import('@/types').Guideline) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  /** Whether this pane is the live (线上稿) pane — annotation placement target */
  isLive?: boolean
  /** Explicit render width in pixels — forces both panes to the same scale regardless of stored image resolution */
  imgWidth?: number
}) {
  const paneRef = useRef<HTMLDivElement>(null)
  useStableWheel(paneRef, vsRef, onZoom)
  const pan = usePan(vsRef, onZoom, { requireSpace: true, spaceDown, onGrabChange })

  const {
    annotationMode,
    pendingAnnotationStyle,
    pendingFillOpacity,
    annotations,
    addAnnotation,
    addDiff,
    setAnnotationMode,
  } = useAppStore()

  const RULER_OFFSET = showRuler ? RULER_SIZE : 0

  // Click-to-place annotation on the live pane
  const handlePaneClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLive || !annotationMode) return
    // Ignore if we were panning (space+drag)
    if (spaceDown.current) return

    const rect = paneRef.current?.getBoundingClientRect()
    if (!rect) return

    // Screen position relative to pane (accounting for ruler offset)
    const sx = e.clientX - rect.left - RULER_OFFSET
    const sy = e.clientY - rect.top - RULER_OFFSET

    // Convert to image-space
    const imgX = (sx - vs.offsetX) / vs.scale
    const imgY = (sy - vs.offsetY) / vs.scale

    const annId = crypto.randomUUID()
    const diffId = crypto.randomUUID()
    const index = annotations.length + 1

    // Default rect: 80×50 canvas-space centred on click point (styles B & C)
    const defaultRect = pendingAnnotationStyle !== 'A'
      ? { x: imgX - 40, y: imgY - 25, w: 80, h: 50 }
      : null

    // B/C: bubble defaults to top-left corner of the rect
    const bubblePos = defaultRect
      ? { x: defaultRect.x, y: defaultRect.y }
      : { x: imgX, y: imgY }

    addAnnotation({
      id: annId,
      index,
      style: pendingAnnotationStyle,
      severity: 'mid',
      position: bubblePos,
      rect: defaultRect,
      rectCorner: pendingAnnotationStyle !== 'A' ? 'tl' : undefined,
      locked: false,
      diffId,
      source: 'manual',
      fillOpacity: pendingAnnotationStyle === 'C' ? pendingFillOpacity : undefined,
    })

    addDiff({
      id: diffId,
      annotationId: annId,
      title: `标注 #${index}`,
      description: '',
      diffType: ['spacing'],
      severity: 'mid',
      source: 'manual',
      fixStatus: 'pending',
    })

    // Exit annotation mode after placing
    setAnnotationMode(false)
  }, [
    isLive, annotationMode, spaceDown, vs, RULER_OFFSET,
    annotations.length, pendingAnnotationStyle, pendingFillOpacity,
    addAnnotation, addDiff, setAnnotationMode,
  ])

  return (
    <div
      ref={paneRef}
      className={clsx(
        'flex-1 min-w-0 overflow-hidden relative border',
        isLive && annotationMode && 'cursor-crosshair'
      )}
      style={{ background: '#ECEAE4', borderColor: '#D7D5D1', borderRadius: 4 }}
      onMouseDown={pan.onMouseDown}
      onMouseMove={pan.onMouseMove}
      onMouseUp={pan.onMouseUp}
      onMouseLeave={pan.onMouseUp}
      onClick={handlePaneClick}
    >
      {/* Pane-local ruler strips */}
      {showRuler && (
        <>
          {/* corner square */}
          <div className="absolute top-0 left-0 w-5 h-5 z-20" style={{ background: RULER_BG, borderBottom: `1px solid ${RULER_BORDER}`, borderRight: `1px solid ${RULER_BORDER}`, pointerEvents: 'none' }} />
          <RulerBar
            axis="x"
            scale={vs.scale}
            offset={vs.offsetX}
            guidelineOffset={vs.offsetY}
            canvasRootRef={paneRef}
            onCreateGuideline={(pos) => addGuideline({ id: crypto.randomUUID(), axis: 'y', pos })}
          />
          <RulerBar
            axis="y"
            scale={vs.scale}
            offset={vs.offsetY}
            guidelineOffset={vs.offsetX}
            canvasRootRef={paneRef}
            onCreateGuideline={(pos) => addGuideline({ id: crypto.randomUUID(), axis: 'x', pos })}
          />
        </>
      )}

      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-[10px] px-2 py-0.5 rounded-full pointer-events-none"
        style={{ background: 'rgba(37,37,37,0.55)', color: '#F7F4EE', marginLeft: showRuler ? RULER_SIZE / 2 : 0 }}>
        {label}
      </div>
      <div className="absolute bottom-2 right-2 z-10 text-[10px] px-1.5 py-0.5 rounded pointer-events-none"
        style={{ background: 'rgba(37,37,37,0.45)', color: '#F7F4EE' }}>
        {Math.round(vs.scale * 100)}%
      </div>

      {/* Image content, offset by ruler size when ruler is shown */}
      <div
        className={clsx('absolute inset-0', showRuler && 'top-5 left-5')}
        style={{ overflow: 'hidden' }}
      >
        <div style={{
          transform: `translate(${vs.offsetX}px,${vs.offsetY}px) scale(${vs.scale})`,
          transformOrigin: '0 0',
          position: 'absolute', top: 0, left: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} style={{ display: 'block', maxWidth: 'none', imageRendering: 'pixelated', ...(imgWidth ? { width: imgWidth } : {}) }} />
        </div>
      </div>

      {/* Annotation layer — only on live pane */}
      {isLive && (
        <AnnotationLayer viewState={vs} showRuler={showRuler} />
      )}

      {/* Guidelines rendered inside pane — coordinates relative to pane root */}
      {showRuler && (
        <GuidelinesLayer viewState={vs} showRuler={showRuler} canvasRootRef={paneRef} onDragStart={onDragStart} onDragEnd={onDragEnd} />
      )}
    </div>
  )
}

// ── Blend modes available for heatmap overlay ────────────────────────────────

const BLEND_MODES: { value: string; label: string }[] = [
  { value: 'normal',      label: '正常' },
  { value: 'difference',  label: '差值' },
  { value: 'exclusion',   label: '排除' },
  { value: 'multiply',    label: '正片叠底' },
  { value: 'screen',      label: '滤色' },
  { value: 'overlay',     label: '叠加' },
  { value: 'hard-light',  label: '强光' },
  { value: 'soft-light',  label: '柔光' },
  { value: 'color-dodge', label: '颜色减淡' },
  { value: 'color-burn',  label: '颜色加深' },
  { value: 'darken',      label: '变暗' },
  { value: 'lighten',     label: '变亮' },
  { value: 'hue',         label: '色相' },
  { value: 'saturation',  label: '饱和度' },
  { value: 'color',       label: '颜色' },
  { value: 'luminosity',  label: '明度' },
]

// ── DiffCanvas — pixel-diff heatmap overlay ───────────────────────────────────

function DiffCanvas({
  designSrc, liveSrc, vs,
}: {
  designSrc: string
  liveSrc: string
  vs: { offsetX: number; offsetY: number; scale: number }
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false

    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image()
        // No crossOrigin for blob: URLs — setting it causes taint on some browsers
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })

    Promise.all([loadImage(designSrc), loadImage(liveSrc)]).then(([dImg, lImg]) => {
      if (cancelled) return
      const w = Math.max(dImg.naturalWidth, lImg.naturalWidth)
      const h = Math.max(dImg.naturalHeight, lImg.naturalHeight)

      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const ctx = off.getContext('2d')!

      ctx.drawImage(dImg, 0, 0)
      const dData = ctx.getImageData(0, 0, w, h)

      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(lImg, 0, 0)
      const lData = ctx.getImageData(0, 0, w, h)

      const out = ctx.createImageData(w, h)
      for (let i = 0; i < dData.data.length; i += 4) {
        const diff = (
          Math.abs(dData.data[i]     - lData.data[i]) +
          Math.abs(dData.data[i + 1] - lData.data[i + 1]) +
          Math.abs(dData.data[i + 2] - lData.data[i + 2])
        ) / 3
        if (diff > 15) {
          out.data[i]     = 255
          out.data[i + 1] = 40
          out.data[i + 2] = 40
          out.data[i + 3] = Math.min(220, diff * 2.5)
        }
      }
      ctx.putImageData(out, 0, 0)

      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(off, 0, 0)
    }).catch(() => { /* images may not be cross-origin readable — silently skip */ })

    return () => { cancelled = true }
  }, [designSrc, liveSrc])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0, left: 0,
        transform: `translate(${vs.offsetX}px,${vs.offsetY}px) scale(${vs.scale})`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', imageRendering: 'pixelated' }} />
    </div>
  )
}

// ── OverlayCanvas (overlap + overlay-heatmap) ─────────────────────────────────

function OverlayCanvas({
  mode, spaceDown, shiftDown, onGrabChange, onDragStart, onDragEnd,
}: {
  mode: 'overlap' | 'overlay-heatmap'
  spaceDown: React.RefObject<boolean>
  shiftDown: React.RefObject<boolean>
  onGrabChange: (v: boolean) => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const {
    designImage, liveImage,
    viewState, setViewState,
    overlayDesignViewState, setOverlayDesignViewState,
    overlayLiveViewState, setOverlayLiveViewState,
    syncLockedMap,
    overlaySelectedLayer: selected, setOverlaySelectedLayer: setSelected,
    designOpacity, liveOpacity, differenceBlend,
    heatmapBlend, setHeatmapBlend,
  } = useAppStore()

  // overlay-heatmap 和 overlap 各自维护独立的 syncLocked 状态
  const syncLocked = syncLockedMap[mode]

  const containerRef = useRef<HTMLDivElement>(null)

  // Always-fresh refs — overlay 模式使用独立的 viewState，不与 side-by-side 共用
  const sharedVSRef = useRef(viewState); sharedVSRef.current = viewState
  const designVSRef = useRef(overlayDesignViewState); designVSRef.current = overlayDesignViewState
  const liveVSRef = useRef(overlayLiveViewState); liveVSRef.current = overlayLiveViewState

  // Zoom — synced when locked, independent when unlocked
  const syncLockedRef = useRef(syncLocked); syncLockedRef.current = syncLocked

  // useStableWheel only supports a single vsRef; for independent zoom we need the raw wheel event.
  // So we attach our own wheel listener directly on the container.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const rawDelta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY
      const factor = Math.pow(0.999, rawDelta)
      if (syncLockedRef.current) {
        const newVS = zoomAtPoint(sharedVSRef.current, factor, cx, cy)
        setViewState(newVS); setOverlayDesignViewState(newVS); setOverlayLiveViewState(newVS)
      } else {
        // Each layer zooms independently around the same screen focal point
        setOverlayDesignViewState(zoomAtPoint(designVSRef.current, factor, cx, cy))
        setOverlayLiveViewState(zoomAtPoint(liveVSRef.current, factor, cx, cy))
        setViewState(zoomAtPoint(sharedVSRef.current, factor, cx, cy))
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current])

  // Pan — space+drag moves both (Shift supported for axis-constraint)
  // onDragStart / onDragEnd 不绑定到各 pan，由 handleMouseDown / handleMouseUp 统一调用一次，避免多捕
  const sharedPan = usePan(sharedVSRef, (vs) => {
    setViewState(vs); setOverlayDesignViewState(vs); setOverlayLiveViewState(vs)
  }, { requireSpace: true, spaceDown, shiftDown, onGrabChange })

  // Unlocked: direct drag on selected layer (Shift = axis constraint)
  const designDragPan = usePan(designVSRef, setOverlayDesignViewState, { requireSpace: false, shiftDown, onGrabChange })
  const liveDragPan = usePan(liveVSRef, setOverlayLiveViewState, { requireSpace: false, shiftDown, onGrabChange })

  const activeDesignVS = syncLocked ? viewState : overlayDesignViewState
  const activeLiveVS   = syncLocked ? viewState : overlayLiveViewState

  // Canonical width ensures both images render at the same scale across all devices
  const overlayCanonicalWidth = useAppStore.getState().targetWidth
    || designImage?.scaledWidth || liveImage?.scaledWidth || 375
  const imgBase: React.CSSProperties = { display: 'block', maxWidth: 'none', imageRendering: 'pixelated', width: overlayCanonicalWidth }

  const activePan = syncLocked ? sharedPan : (selected === 'design' ? designDragPan : liveDragPan)

  const designImgStyle: React.CSSProperties = {
    ...imgBase,
    opacity: mode === 'overlap' ? designOpacity / 100 : 1,
  }
  const liveImgStyle: React.CSSProperties = {
    ...imgBase,
    opacity: mode === 'overlap' ? liveOpacity / 100 : 1,
    mixBlendMode: mode === 'overlay-heatmap'
      ? (heatmapBlend as React.CSSProperties['mixBlendMode'])
      : (differenceBlend ? 'difference' : 'normal'),
  }

  // activeDragPanRef 追踪本次拖拽实际触发的 pan，mouseUp 时只对它调用一次 onDragEnd
  const activeDragPanRef = useRef<ReturnType<typeof usePan> | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (spaceDown.current) {
      onDragStart()
      activeDragPanRef.current = sharedPan
      sharedPan.onMouseDown(e)
      return
    }
    if (!syncLocked) {
      onDragStart()
      activeDragPanRef.current = activePan
      activePan.onMouseDown(e)
    }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (spaceDown.current) { sharedPan.onMouseMove(e); return }
    if (!syncLocked) activePan.onMouseMove(e)
  }
  const handleMouseUp = () => {
    // 只对实际在拖拽的 pan 调用一次 mouseUp，并在之后统一触发 onDragEnd
    const wasDragging = activeDragPanRef.current
    sharedPan.onMouseUp()
    if (activePan !== sharedPan) activePan.onMouseUp()
    activeDragPanRef.current = null
    if (wasDragging) onDragEnd()
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Layer selector — unlocked only */}
      {!syncLocked && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
          <div className="flex gap-1 px-2 py-1" style={{ background: 'rgba(247,244,238,0.92)', border: '1px solid #E5E2DC', borderRadius: 7, backdropFilter: 'blur(4px)' }}>
            <span className="text-[10px] self-center mr-1" style={{ color: '#8A8680' }}>选中图层</span>
            {(['design', 'live'] as const).map((k) => (
              <button
                key={k}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setSelected(k)}
                className="text-[10px] px-2 py-0.5 rounded transition-colors duration-150"
                style={{
                  background: selected === k ? '#252525' : 'transparent',
                  color: selected === k ? '#F7F4EE' : '#8A8680',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {k === 'design' ? '设计稿' : '线上稿'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Blend context — both layers must share this wrapper for mix-blend-mode to work */}
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
        {/* Design layer — always bottom */}
        {designImage && (
          <div
            className={clsx(
              'absolute',
              !syncLocked && selected === 'design' && 'ring-2 ring-blue-500 ring-offset-0'
            )}
            style={{
              transform: `translate(${activeDesignVS.offsetX}px,${activeDesignVS.offsetY}px) scale(${activeDesignVS.scale})`,
              transformOrigin: '0 0',
              top: 0, left: 0,
              cursor: !syncLocked && selected === 'design' ? 'grab' : 'default',
            }}
            onMouseDown={(e) => {
              if (syncLocked || spaceDown.current) return
              e.stopPropagation()
              setSelected('design')
              designDragPan.onMouseDown(e)
            }}
          >
            <img src={designImage.scaledUrl ?? designImage.url} alt="设计稿" style={designImgStyle} />
          </div>
        )}

        {/* Live layer — on top, blend mode applied in heatmap mode */}
        {liveImage && (
          <div
            className={clsx(
              'absolute',
              !syncLocked && selected === 'live' && 'ring-2 ring-orange-400 ring-offset-0'
            )}
            style={{
              transform: `translate(${activeLiveVS.offsetX}px,${activeLiveVS.offsetY}px) scale(${activeLiveVS.scale})`,
              transformOrigin: '0 0',
              top: 0, left: 0,
              cursor: !syncLocked && selected === 'live' ? 'grab' : 'default',
              mixBlendMode: mode === 'overlay-heatmap'
                ? (heatmapBlend as React.CSSProperties['mixBlendMode'])
                : (differenceBlend ? 'difference' : 'normal'),
            }}
            onMouseDown={(e) => {
              if (syncLocked || spaceDown.current) return
              e.stopPropagation()
              setSelected('live')
              liveDragPan.onMouseDown(e)
            }}
          >
            <img src={liveImage.scaledUrl ?? liveImage.url} alt="线上稿" style={liveImgStyle} />
          </div>
        )}
      </div>

      <AnnotationLayer viewState={activeLiveVS} />

      {/* Blend mode picker — heatmap mode only */}
      {mode === 'overlay-heatmap' && (
        <BlendModePicker value={heatmapBlend} onChange={setHeatmapBlend} />
      )}

    </div>
  )
}

// ── BlendModePicker ───────────────────────────────────────────────────────────

function BlendModePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const checkArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 0)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkArrows()
    el.addEventListener('scroll', checkArrows)
    const ro = new ResizeObserver(checkArrows)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkArrows); ro.disconnect() }
  }, [checkArrows])

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' })
  }

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5"
      style={{
        background: 'rgba(247,244,238,0.95)',
        border: '1px solid #E5E2DC',
        borderRadius: 8,
        backdropFilter: 'blur(4px)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-[11px] shrink-0" style={{ color: '#8A8680' }}>混合模式</span>
      <div style={{ width: 1, height: 14, background: '#E5E2DC' }} className="shrink-0" />
      {canLeft && (
        <button
          onClick={() => scroll('left')}
          className="shrink-0 transition-colors duration-150"
          style={{ color: '#8A8680', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseOver={e => (e.currentTarget.style.color = '#252525')}
          onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L4 6l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
      <div ref={scrollRef} className="flex items-center gap-0.5 overflow-x-hidden">
        {BLEND_MODES.map(({ value: v, label }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="shrink-0 text-[11px] px-2.5 py-1 rounded transition-colors duration-150 whitespace-nowrap"
            style={{
              background: value === v ? '#252525' : 'transparent',
              color: value === v ? '#F7F4EE' : '#3D3A36',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseOver={e => { if (value !== v) e.currentTarget.style.background = '#EDE9E1' }}
            onMouseOut={e => { if (value !== v) e.currentTarget.style.background = 'transparent' }}
          >
            {label}
          </button>
        ))}
      </div>
      {canRight && (
        <button
          onClick={() => scroll('right')}
          className="shrink-0 transition-colors duration-150"
          style={{ color: '#8A8680', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseOver={e => (e.currentTarget.style.color = '#252525')}
          onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8 6l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
    </div>
  )
}

// ── SliderMode ────────────────────────────────────────────────────────────────

function SliderMode({
  vsRef, vs, onZoom, imgStyle, sliderPos, setSliderPos, spaceDown, onGrabChange,
}: {
  vsRef: React.MutableRefObject<ViewState>
  vs: ViewState
  onZoom: (vs: ViewState) => void
  imgStyle: React.CSSProperties
  sliderPos: number
  setSliderPos: (v: number) => void
  spaceDown: React.MutableRefObject<boolean>
  onGrabChange: (v: boolean) => void
}) {
  const { designImage, liveImage } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const sliderDragging = useRef(false)

  useStableWheel(containerRef, vsRef, onZoom)
  const pan = usePan(vsRef, onZoom, { requireSpace: true, spaceDown, onGrabChange })

  const w = designImage?.scaledWidth ?? liveImage?.scaledWidth ?? 375
  const h = designImage?.scaledHeight ?? liveImage?.scaledHeight ?? 667

  const updateSlider = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setSliderPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }

  // sliderPos% of container width → pixel X in screen space
  // The clip must also be in screen space: we use a screen-space overlay
  // that masks the right portion of the design layer.
  const clipPx = `${sliderPos}%`

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden select-none"
      onMouseDown={(e) => {
        if (spaceDown.current) { pan.onMouseDown(e); return }
      }}
      onMouseMove={(e) => {
        if (spaceDown.current) { pan.onMouseMove(e); return }
        if (sliderDragging.current) updateSlider(e.clientX)
      }}
      onMouseUp={() => { sliderDragging.current = false; pan.onMouseUp() }}
      onMouseLeave={() => { sliderDragging.current = false; pan.onMouseUp() }}
    >
      {/* Live image — full, behind */}
      <div style={{
        transform: `translate(${vs.offsetX}px,${vs.offsetY}px) scale(${vs.scale})`,
        transformOrigin: '0 0',
        position: 'absolute', top: 0, left: 0,
        width: w, height: h,
      }}>
        {liveImage && (
          <img src={liveImage.scaledUrl ?? liveImage.url} alt="线上稿" style={imgStyle} />
        )}
      </div>

      {/* Design image — clipped in SCREEN space to left of slider */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: clipPx }}
      >
        <div style={{
          transform: `translate(${vs.offsetX}px,${vs.offsetY}px) scale(${vs.scale})`,
          transformOrigin: '0 0',
          position: 'absolute', top: 0, left: 0,
          width: w, height: h,
        }}>
          {designImage && (
            <img src={designImage.scaledUrl ?? designImage.url} alt="设计稿" style={imgStyle} />
          )}
        </div>
      </div>

      <AnnotationLayer viewState={vs} />

      {/* Slider handle — screen space, always aligned with clip edge */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-10"
        style={{ left: clipPx, width: 1, background: 'rgba(247,244,238,0.9)' }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto cursor-col-resize"
          style={{ width: 28, height: 28, borderRadius: '50%', background: '#F7F4EE', border: '1px solid #D7D5D1' }}
          onMouseDown={(e) => {
            e.stopPropagation()
            sliderDragging.current = true
            updateSlider(e.clientX)
          }}
        >
          <div className="flex gap-0.5">
            <div style={{ width: 1.5, height: 14, background: '#8A8680', borderRadius: 1 }} />
            <div style={{ width: 1.5, height: 14, background: '#8A8680', borderRadius: 1 }} />
          </div>
        </div>
      </div>

      {/* Zoom badge */}
      <div className="absolute bottom-2 right-2 z-10 text-[10px] px-1.5 py-0.5 rounded pointer-events-none"
        style={{ background: 'rgba(37,37,37,0.45)', color: '#F7F4EE' }}>
        {Math.round(vs.scale * 100)}%
      </div>
    </div>
  )
}

// ── History snapshot type ─────────────────────────────────────────────────────

interface FullSnapshot {
  viewState: ViewState
  overlayDesignViewState: ViewState
  overlayLiveViewState: ViewState
  guidelinesMap: Record<import('@/types').CompareMode, import('@/types').Guideline[]>
}

const MAX_HISTORY = 30

// ── Main CompareCanvas ────────────────────────────────────────────────────────

export default function CompareCanvas() {
  const {
    designImage, liveImage,
    compareMode,
    viewState, setViewState,
    designViewState, setDesignViewState,
    liveViewState, setLiveViewState,
    overlayDesignViewState, setOverlayDesignViewState,
    overlayLiveViewState, setOverlayLiveViewState,
    syncLockedMap,
    syncLocked,
    sliderPos, setSliderPos,
    showRuler,
    addGuideline,
    guidelinesMap,
    analysisRunning, analysisProgress, analysisPhase,
    targetWidth,
  } = useAppStore()

  const canvasRootRef = useRef<HTMLDivElement>(null)
  const spaceDown = useRef(false)
  const shiftDown = useRef(false)
  const [isGrabbing, setIsGrabbing] = useState(false)

  // History stack for Ctrl+Z
  const historyRef = useRef<FullSnapshot[]>([])

  // Capture a snapshot of the current image positions + guidelines
  const captureSnapshot = useCallback((): FullSnapshot => ({
    viewState: useAppStore.getState().viewState,
    overlayDesignViewState: useAppStore.getState().overlayDesignViewState,
    overlayLiveViewState: useAppStore.getState().overlayLiveViewState,
    guidelinesMap: useAppStore.getState().guidelinesMap,
  }), [])

  // Push a pre-drag snapshot onto history (called just before drag starts is hard;
  // instead we push on drag-end, storing the state *before* the drag by capturing
  // at drag-start via a ref)
  const preDragSnapshotRef = useRef<FullSnapshot | null>(null)

  // Called by OverlayCanvas / GuidelineLine at the moment a drag starts
  const onDragStart = useCallback(() => {
    preDragSnapshotRef.current = captureSnapshot()
  }, [captureSnapshot])

  // Called by OverlayCanvas / GuidelineLine at the moment a drag ends
  const onDragEnd = useCallback(() => {
    if (!preDragSnapshotRef.current) return
    const snap = preDragSnapshotRef.current
    preDragSnapshotRef.current = null
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), snap]
  }, [])

  // side-by-side uses designViewState (both panes are always sync-locked)
  // other modes use the shared viewState
  const activeVS = compareMode === 'side-by-side' ? designViewState : viewState

  // Always-fresh refs
  const sharedVSRef = useRef(viewState); sharedVSRef.current = viewState
  const designVSRef = useRef(designViewState); designVSRef.current = designViewState
  const liveVSRef = useRef(liveViewState); liveVSRef.current = liveViewState

  // Space key + Shift key
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        spaceDown.current = true
      }
      if (e.key === 'Shift') shiftDown.current = true
    }
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') { spaceDown.current = false; setIsGrabbing(false) }
      if (e.key === 'Shift') shiftDown.current = false
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  // Ctrl+0 reset
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        const r = { scale: 1, offsetX: 0, offsetY: 0 }
        setViewState(r); setDesignViewState(r); setLiveViewState(r)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setViewState, setDesignViewState, setLiveViewState])

  // Ctrl+Z undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        e.preventDefault()
        const stack = historyRef.current
        if (stack.length === 0) return
        const snap = stack[stack.length - 1]
        historyRef.current = stack.slice(0, -1)
        // Restore all positions
        setViewState(snap.viewState)
        setOverlayDesignViewState(snap.overlayDesignViewState)
        setOverlayLiveViewState(snap.overlayLiveViewState)
        // Restore guidelines for all modes
        const { guidelinesMap: gm } = snap
        useAppStore.setState({ guidelinesMap: gm })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setViewState, setOverlayDesignViewState, setOverlayLiveViewState])

  // Arrow key nudge — nudge image position by 1px (10px with Shift)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      if (!arrowKeys.includes(e.key)) return
      e.preventDefault()
      const amount = e.shiftKey ? 10 : 1
      const dx = e.key === 'ArrowLeft' ? -amount : e.key === 'ArrowRight' ? amount : 0
      const dy = e.key === 'ArrowUp' ? -amount : e.key === 'ArrowDown' ? amount : 0

      if (compareMode === 'overlay-heatmap' || compareMode === 'overlap') {
        const isLocked = syncLockedMap[compareMode]
        if (isLocked) {
          // Push undo snapshot before nudge
          historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), captureSnapshot()]
          const dvs = useAppStore.getState().overlayDesignViewState
          const lvs = useAppStore.getState().overlayLiveViewState
          const svs = useAppStore.getState().viewState
          const newDVS = { ...dvs, offsetX: dvs.offsetX + dx, offsetY: dvs.offsetY + dy }
          const newLVS = { ...lvs, offsetX: lvs.offsetX + dx, offsetY: lvs.offsetY + dy }
          const newSVS = { ...svs, offsetX: svs.offsetX + dx, offsetY: svs.offsetY + dy }
          setViewState(newSVS); setOverlayDesignViewState(newDVS); setOverlayLiveViewState(newLVS)
        } else {
          // Nudge only the selected layer
          historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), captureSnapshot()]
          const selectedLayer = useAppStore.getState().overlaySelectedLayer
          if (selectedLayer === 'live') {
            const lvs = useAppStore.getState().overlayLiveViewState
            setOverlayLiveViewState({ ...lvs, offsetX: lvs.offsetX + dx, offsetY: lvs.offsetY + dy })
          } else {
            const dvs = useAppStore.getState().overlayDesignViewState
            setOverlayDesignViewState({ ...dvs, offsetX: dvs.offsetX + dx, offsetY: dvs.offsetY + dy })
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [compareMode, syncLockedMap, captureSnapshot, setViewState, setOverlayDesignViewState, setOverlayLiveViewState])

  const onGrabChange = useCallback((v: boolean) => setIsGrabbing(v), [])

  const noImages = !designImage && !liveImage
  // Use targetWidth as the canonical render width so all devices show images at the same scale
  const canonicalWidth = targetWidth || designImage?.scaledWidth || liveImage?.scaledWidth || 375
  const imgStyle: React.CSSProperties = { display: 'block', maxWidth: 'none', imageRendering: 'pixelated', width: canonicalWidth }

  // side-by-side and slider always sync-locked — disable the lock toggle visually via Toolbar
  const isSyncMode = compareMode === 'side-by-side' || compareMode === 'slider'

  return (
    <div ref={canvasRootRef} className={clsx(
      'flex-1 overflow-hidden relative',
      isGrabbing ? 'cursor-grabbing' : spaceDown.current ? 'cursor-grab' : 'cursor-default'
    )} style={{ background: '#ECEAE4' }}>
      {/* Ruler — only for non-side-by-side modes; side-by-side renders rulers inside each ImagePane */}
      {showRuler && compareMode !== 'side-by-side' && (
        <>
          {/* corner square */}
          <div className="absolute top-0 left-0 w-5 h-5 z-20" style={{ background: RULER_BG, borderBottom: `1px solid ${RULER_BORDER}`, borderRight: `1px solid ${RULER_BORDER}` }} />
          <RulerBar
            axis="x"
            scale={activeVS.scale}
            offset={activeVS.offsetX}
            guidelineOffset={activeVS.offsetY}
            canvasRootRef={canvasRootRef}
            onCreateGuideline={(pos) => addGuideline({ id: crypto.randomUUID(), axis: 'y', pos })}
          />
          <RulerBar
            axis="y"
            scale={activeVS.scale}
            offset={activeVS.offsetY}
            guidelineOffset={activeVS.offsetX}
            canvasRootRef={canvasRootRef}
            onCreateGuideline={(pos) => addGuideline({ id: crypto.randomUUID(), axis: 'x', pos })}
          />
          <GuidelinesLayer viewState={activeVS} showRuler={showRuler} canvasRootRef={canvasRootRef} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        </>
      )}


      {/* Canvas content */}
      <div className={clsx('absolute inset-0', showRuler && compareMode !== 'side-by-side' && 'top-5 left-5')}>
        {noImages ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">请先上传图片</div>
        ) : compareMode === 'side-by-side' ? (
          <div className="flex h-full gap-1.5 p-2" style={{ background: '#ECEAE4' }}>
            {designImage && (
              <ImagePane
                src={designImage.scaledUrl ?? designImage.url}
                label="设计稿"
                vsRef={designVSRef}
                vs={designViewState}
                onZoom={(vs) => { setDesignViewState(vs); setLiveViewState(vs) }}
                spaceDown={spaceDown}
                onGrabChange={onGrabChange}
                showRuler={showRuler}
                addGuideline={addGuideline}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                imgWidth={canonicalWidth}
              />
            )}
            {liveImage && (
              <ImagePane
                src={liveImage.scaledUrl ?? liveImage.url}
                label="线上稿"
                vsRef={liveVSRef}
                vs={liveViewState}
                onZoom={(vs) => { setLiveViewState(vs); setDesignViewState(vs) }}
                spaceDown={spaceDown}
                onGrabChange={onGrabChange}
                showRuler={showRuler}
                addGuideline={addGuideline}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                isLive
                imgWidth={canonicalWidth}
              />
            )}
          </div>
        ) : compareMode === 'slider' ? (
          <SliderMode
            vsRef={sharedVSRef}
            vs={viewState}
            onZoom={setViewState}
            imgStyle={imgStyle}
            sliderPos={sliderPos}
            setSliderPos={setSliderPos}
            spaceDown={spaceDown}
            onGrabChange={onGrabChange}
          />
        ) : (
          <OverlayCanvas
            mode={compareMode as 'overlap' | 'overlay-heatmap'}
            spaceDown={spaceDown}
            shiftDown={shiftDown}
            onGrabChange={onGrabChange}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        )}
      </div>

      {/* Overlap controls */}
      {compareMode === 'overlap' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <OverlapControls />
        </div>
      )}

      {/* Analysis overlay */}
      {analysisRunning && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(37,37,37,0.4)' }}>
          <div className="flex flex-col items-center gap-3 px-8 py-6" style={{
            background: '#F7F4EE', borderRadius: 10,
            border: '1px solid #E5E2DC', minWidth: 260,
          }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#252525' }}>{analysisPhase || 'AI 分析中…'}</p>
            <div style={{ width: '100%', height: 3, background: '#EDE9E1', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#D9C8A0', borderRadius: 2, transition: 'width 300ms', width: `${analysisProgress}%` }} />
            </div>
            <p style={{ fontSize: 12, color: '#8A8680' }}>{analysisProgress}%</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── RulerBar ──────────────────────────────────────────────────────────────────

const RULER_SIZE = 20 // px, matches the top-5/left-5 offset (20px)
const RULER_BG = '#EAE7E0'
const RULER_BORDER = '#D7D5D1'

function RulerBar({ axis, scale, offset, guidelineOffset, canvasRootRef, onCreateGuideline }: {
  axis: 'x' | 'y'
  scale: number
  offset: number          // 用于刻度渲染的 offset（axis='x'→offsetX，axis='y'→offsetY）
  guidelineOffset: number // 用于参考线坐标计算的 offset（与 offset 方向相反）
  canvasRootRef: React.RefObject<HTMLDivElement | null>
  onCreateGuideline: (canvasPos: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const ghostRef = useRef<HTMLDivElement | null>(null)

  // compute tick step based on zoom
  const step = scale < 0.25 ? 200 : scale < 0.5 ? 100 : scale < 1 ? 50 : scale < 2 ? 20 : 10
  // how many ticks to render (generous)
  const count = Math.ceil(3000 / (step * scale)) + 2
  const startTick = Math.floor(-offset / scale / step) * step

  const ticks = Array.from({ length: count }, (_, i) => startTick + i * step)

  const screenPos = (canvasVal: number) => canvasVal * scale + offset

  // drag-out ghost line
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true

    const ghost = document.createElement('div')
    // 水平标尺(axis='x')向下拖出水平参考线，垂直标尺(axis='y')向右拖出垂直参考线
    ghost.style.cssText = axis === 'x'
      ? `position:fixed;left:0;right:0;height:1px;background:#2563eb;opacity:0.7;pointer-events:none;z-index:9999;`
      : `position:fixed;top:0;bottom:0;width:1px;background:#2563eb;opacity:0.7;pointer-events:none;z-index:9999;`
    document.body.appendChild(ghost)
    ghostRef.current = ghost

    const onMove = (me: MouseEvent) => {
      if (axis === 'x') ghost.style.top = me.clientY + 'px'
      else ghost.style.left = me.clientX + 'px'
    }

    const onUp = (me: MouseEvent) => {
      ghost.remove()
      ghostRef.current = null
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      // only create if released outside the ruler strip
      const rulerEl = ref.current
      if (!rulerEl) return
      const rect = rulerEl.getBoundingClientRect()
      const outsideRuler = axis === 'x' ? me.clientY > rect.bottom : me.clientX > rect.right
      if (!outsideRuler) return

      // convert screen pos → canvas pos
      // 始终用根容器的 rect，与 GuidelineLine 的定位容器保持一致
      const canvasAreaEl = canvasRootRef.current
      if (!canvasAreaEl) return
      const canvasRect = canvasAreaEl.getBoundingClientRect()
      // 水平标尺(axis='x')拖出水平参考线，用clientY计算垂直位置；垂直标尺(axis='y')拖出垂直参考线，用clientX计算水平位置
      const screenCoord = axis === 'x'
        ? me.clientY - canvasRect.top - RULER_SIZE
        : me.clientX - canvasRect.left - RULER_SIZE
      const canvasPos = (screenCoord - guidelineOffset) / scale
      onCreateGuideline(Math.round(canvasPos))
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (axis === 'x') {
    return (
      <div
        ref={ref}
        className="absolute top-0 left-5 right-0 z-10 select-none"
        style={{ height: RULER_SIZE, background: RULER_BG, borderBottom: `1px solid ${RULER_BORDER}`, cursor: 's-resize' }}
        onMouseDown={onMouseDown}
      >
        <div className="relative w-full h-full overflow-hidden">
          {ticks.map((t) => {
            const x = screenPos(t)
            const major = t % (step * 5) === 0
            return (
              <div key={t} className="absolute bottom-0 flex flex-col items-center" style={{ left: x }}>
                {major && (
                  <span className="absolute text-[8px] leading-none select-none" style={{ color: '#999', bottom: 7, transform: 'translateX(-50%)' }}>{t}</span>
                )}
                <div style={{ width: 1, height: major ? 6 : 3, background: '#aaa' }} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="absolute top-5 left-0 bottom-0 z-10 select-none"
      style={{ width: RULER_SIZE, background: RULER_BG, borderRight: `1px solid ${RULER_BORDER}`, cursor: 'e-resize' }}
      onMouseDown={onMouseDown}
    >
      <div className="relative w-full h-full overflow-hidden">
        {ticks.map((t) => {
          const y = screenPos(t)
          const major = t % (step * 5) === 0
          return (
            <div key={t} className="absolute right-0 flex items-center" style={{ top: y }}>
              <div style={{ height: 1, width: major ? 6 : 3, background: '#aaa' }} />
              {major && (
                <span
                  className="absolute text-[8px] leading-none select-none"
                  style={{ color: '#999', right: 7, transform: 'translateY(-50%) rotate(180deg)', writingMode: 'vertical-rl' }}
                >{t}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── GuidelineLine ─────────────────────────────────────────────────────────────

function GuidelineLine({ guideline, viewState, showRuler, canvasRootRef, onMove, onRemove, onDragStart, onDragEnd }: {
  guideline: Guideline
  viewState: ViewState
  showRuler: boolean
  canvasRootRef: React.RefObject<HTMLDivElement | null>
  onMove: (pos: number) => void
  onRemove: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  const { axis, pos } = guideline
  const { scale, offsetX, offsetY } = viewState
  const rulerOffset = showRuler ? RULER_SIZE : 0
  const [deleteHint, setDeleteHint] = useState(false)

  // screen position of the guideline
  const screenCoord = axis === 'x'
    ? pos * scale + offsetX + rulerOffset
    : pos * scale + offsetY + rulerOffset

  const dragging = useRef(false)
  const startScreen = useRef(0)
  const startPos = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    startScreen.current = axis === 'x' ? e.clientX : e.clientY
    startPos.current = pos
    onDragStart?.()

    // 使用 CompareCanvas 根元素做标尺区域判断，所有模式下均可靠
    const isInRuler = (me: MouseEvent) => {
      const el = canvasRootRef.current
      if (!el || !showRuler) return false
      const rect = el.getBoundingClientRect()
      // 垂直参考线(axis='x')：拖到左侧标尺区域
      // 水平参考线(axis='y')：拖到顶部标尺区域
      return axis === 'x'
        ? me.clientX < rect.left + RULER_SIZE
        : me.clientY < rect.top + RULER_SIZE
    }

    const onMove_ = (me: MouseEvent) => {
      const delta = (axis === 'x' ? me.clientX : me.clientY) - startScreen.current
      onMove(Math.round(startPos.current + delta / scale))
      setDeleteHint(isInRuler(me))
    }
    const onUp = (me: MouseEvent) => {
      dragging.current = false
      setDeleteHint(false)
      window.removeEventListener('mousemove', onMove_)
      window.removeEventListener('mouseup', onUp)
      onDragEnd?.()
      if (isInRuler(me)) onRemove()
    }
    window.addEventListener('mousemove', onMove_)
    window.addEventListener('mouseup', onUp)
  }

  const style: React.CSSProperties = axis === 'x' ? {
    position: 'absolute',
    top: rulerOffset,
    bottom: 0,
    left: screenCoord,
    width: 1,
    background: deleteHint ? '#ef4444' : '#2563eb',
    opacity: deleteHint ? 0.9 : 0.65,
    cursor: 'ew-resize',
    zIndex: 15,
    pointerEvents: 'auto',
  } : {
    position: 'absolute',
    left: rulerOffset,
    right: 0,
    top: screenCoord,
    height: 1,
    background: deleteHint ? '#ef4444' : '#2563eb',
    opacity: deleteHint ? 0.9 : 0.65,
    cursor: 'ns-resize',
    zIndex: 15,
    pointerEvents: 'auto',
  }

  return (
    <div
      style={style}
      onMouseDown={onMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onRemove() }}
      title="拖回标尺删除 · 双击删除"
    />
  )
}

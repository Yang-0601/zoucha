'use client'

import React, { useRef, useCallback, useState } from 'react'
import { useAppStore } from '@/store'
import { Annotation } from '@/types'
import clsx from 'clsx'
import { Bot } from 'lucide-react'

const SEVERITY_COLOR: Record<string, string> = {
  high: '#E5404A', mid: '#F0A020', low: '#6E8FAD',
}

const CORNER_HIT = 14 // px screen-space proximity to trigger resize cursor

type ScreenRect = { x: number; y: number; w: number; h: number }

const CORNER_CURSORS: Record<string, string> = {
  tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize',
}

/** Return which corner (tl/tr/bl/br) the mouse is near, skipping `skip`. */
function getCornerAt(ox: number, oy: number, w: number, h: number, skip: string): string | null {
  const pts = [
    { id: 'tl', x: 0, y: 0 }, { id: 'tr', x: w, y: 0 },
    { id: 'bl', x: 0, y: h }, { id: 'br', x: w, y: h },
  ]
  for (const p of pts) {
    if (p.id === skip) continue
    if (Math.abs(ox - p.x) <= CORNER_HIT && Math.abs(oy - p.y) <= CORNER_HIT) return p.id
  }
  return null
}

/** Apply a corner-drag resize delta to a rect. */
function applyCornerResize(
  rect: { x: number; y: number; w: number; h: number },
  corner: string, dx: number, dy: number
) {
  let { x, y, w, h } = rect
  if (corner === 'tl') { x += dx; y += dy; w -= dx; h -= dy }
  else if (corner === 'tr') { y += dy; w += dx; h -= dy }
  else if (corner === 'bl') { x += dx; w -= dx; h += dy }
  else if (corner === 'br') { w += dx; h += dy }
  if (w < 10) w = 10
  if (h < 10) h = 10
  return { x, y, w, h }
}

// ── AnnotationBubble ──────────────────────────────────────────────────────────

function AnnotationBubble({
  ann, screenX, screenY, screenRect, isActive,
  onSelect, onMoveBubble, onMoveRect, onResizeRect, scale,
}: {
  ann: Annotation
  screenX: number
  screenY: number
  screenRect: ScreenRect | null
  isActive: boolean
  onSelect: () => void
  onMoveBubble: (dx: number, dy: number) => void
  onMoveRect: (dx: number, dy: number) => void
  onResizeRect: (corner: string, dx: number, dy: number) => void
  scale: number
}) {
  const color = SEVERITY_COLOR[ann.severity] ?? '#6b7280'
  const isDashed = typeof ann.confidence === 'number' && ann.confidence < 70

  // Keep latest callbacks/values in refs to avoid stale closures in drag handlers
  const onMoveBubbleRef = useRef(onMoveBubble)
  onMoveBubbleRef.current = onMoveBubble
  const onMoveRectRef = useRef(onMoveRect)
  onMoveRectRef.current = onMoveRect
  const onResizeRectRef = useRef(onResizeRect)
  onResizeRectRef.current = onResizeRect
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const screenRectRef = useRef(screenRect)
  screenRectRef.current = screenRect
  const annRef = useRef(ann)
  annRef.current = ann

  const [rectCursor, setRectCursor] = useState('move')

  // ── bubble drag — always updates ann.position ──
  const bubbleDragging = useRef(false)
  const bubbleLast = useRef({ x: 0, y: 0 })

  const onBubbleMouseDown = useCallback((e: React.MouseEvent) => {
    if (annRef.current.locked) return
    e.stopPropagation()
    e.preventDefault()
    bubbleDragging.current = true
    bubbleLast.current = { x: e.clientX, y: e.clientY }
    const onMove = (me: MouseEvent) => {
      if (!bubbleDragging.current) return
      const dx = me.clientX - bubbleLast.current.x
      const dy = me.clientY - bubbleLast.current.y
      bubbleLast.current = { x: me.clientX, y: me.clientY }
      onMoveBubbleRef.current(dx / scaleRef.current, dy / scaleRef.current)
    }
    const onUp = () => {
      bubbleDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // ── rect drag / corner resize ──
  const rectDragging = useRef(false)
  const resizeCorner = useRef<string | null>(null)
  const rectLast = useRef({ x: 0, y: 0 })

  const onRectMouseMove = useCallback((e: React.MouseEvent) => {
    if (annRef.current.locked) return
    const sr = screenRectRef.current
    if (!sr) return
    const corner = getCornerAt(
      e.nativeEvent.offsetX, e.nativeEvent.offsetY,
      sr.w, sr.h, annRef.current.rectCorner ?? 'tl'
    )
    setRectCursor(corner ? CORNER_CURSORS[corner] : 'move')
  }, [])

  const onRectMouseDown = useCallback((e: React.MouseEvent) => {
    if (annRef.current.locked) return
    e.stopPropagation()
    e.preventDefault()
    const sr = screenRectRef.current
    if (!sr) return
    const corner = getCornerAt(
      e.nativeEvent.offsetX, e.nativeEvent.offsetY,
      sr.w, sr.h, annRef.current.rectCorner ?? 'tl'
    )
    resizeCorner.current = corner
    rectDragging.current = true
    rectLast.current = { x: e.clientX, y: e.clientY }
    const onMove = (me: MouseEvent) => {
      if (!rectDragging.current) return
      const dx = me.clientX - rectLast.current.x
      const dy = me.clientY - rectLast.current.y
      rectLast.current = { x: me.clientX, y: me.clientY }
      const s = scaleRef.current
      if (resizeCorner.current) {
        onResizeRectRef.current(resizeCorner.current, dx / s, dy / s)
      } else {
        onMoveRectRef.current(dx / s, dy / s)
      }
    }
    const onUp = () => {
      rectDragging.current = false
      resizeCorner.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return (
    <>
      {/* Rect for style B / C */}
      {screenRect && (ann.style === 'B' || ann.style === 'C') && (
        <div
          className="absolute"
          style={{
            left: screenRect.x,
            top: screenRect.y,
            width: screenRect.w,
            height: screenRect.h,
            border: ann.style === 'C' ? 'none' : `2px solid ${color}`,
            borderRadius: 4,
            backgroundColor: ann.style === 'C' ? `${color}33` : 'transparent',
            cursor: ann.locked ? 'default' : rectCursor,
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
          onMouseMove={onRectMouseMove}
          onMouseLeave={() => setRectCursor('move')}
          onMouseDown={onRectMouseDown}
          onClick={(e) => { e.stopPropagation(); onSelect() }}
        />
      )}

      {/* Bubble */}
      <div
        className={clsx(
          'absolute flex items-center justify-center select-none text-white text-xs font-bold rounded-full shadow-md',
          ann.locked ? 'cursor-pointer' : 'cursor-move',
          !ann.locked && 'hover:scale-110 transition-transform'
        )}
        style={{
          left: screenX - 12,
          top: screenY - 12,
          width: 24,
          height: 24,
          backgroundColor: color,
          border: isDashed ? '1.5px dashed white' : '1.5px solid white',
          opacity: isDashed ? 0.6 : 1,
          pointerEvents: 'auto',
          zIndex: isActive ? 22 : 20,
          boxShadow: isActive ? `0 0 0 3px ${color}55` : undefined,
        }}
        onMouseDown={onBubbleMouseDown}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
      >
        {ann.index}
        {ann.source === 'ai' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white flex items-center justify-center">
            <Bot size={6} color="white" />
          </div>
        )}
        {ann.edited && (
          <div className="absolute -top-0.5 -right-0.5 text-[8px] bg-amber-400 rounded-full w-2.5 h-2.5 flex items-center justify-center text-white">
            ✎
          </div>
        )}
      </div>
    </>
  )
}

// ── AnnotationLayer ───────────────────────────────────────────────────────────

const RULER_SIZE = 20

export default function AnnotationLayer({
  viewState,
  showRuler = false,
}: {
  viewState?: { scale: number; offsetX: number; offsetY: number }
  showRuler?: boolean
}) {
  const {
    annotations,
    activeAnnotationId,
    setActiveAnnotation,
    updateAnnotation,
    liveViewState,
    diffs,
    diffFilter,
    confidenceThreshold,
  } = useAppStore()

  const vs = viewState ?? liveViewState
  const { scale, offsetX, offsetY } = vs
  const rulerOffset = showRuler ? RULER_SIZE : 0

  // Apply the same filter as DiffList so canvas and list stay in sync
  const visibleAnnotationIds = new Set(
    diffs
      .filter(d => {
        if (d.source === 'ai' && typeof d.confidence === 'number' && d.confidence < confidenceThreshold) return false
        if (diffFilter === 'ai') return d.source === 'ai'
        if (diffFilter === 'manual') return d.source === 'manual'
        return true
      })
      .map(d => d.annotationId)
  )
  const visibleAnnotations = annotations.filter(a => visibleAnnotationIds.has(a.id))

  const toScreen = (imgX: number, imgY: number) => ({
    sx: imgX * scale + offsetX + rulerOffset,
    sy: imgY * scale + offsetY + rulerOffset,
  })

  const toScreenRect = (rect: { x: number; y: number; w: number; h: number }): ScreenRect => ({
    x: rect.x * scale + offsetX + rulerOffset,
    y: rect.y * scale + offsetY + rulerOffset,
    w: rect.w * scale,
    h: rect.h * scale,
  })

  const handleMoveBubble = useCallback(
    (ann: Annotation, dx: number, dy: number) => {
      updateAnnotation(ann.id, {
        position: { x: ann.position.x + dx, y: ann.position.y + dy },
        ...(ann.rect ? { rect: { ...ann.rect, x: ann.rect.x + dx, y: ann.rect.y + dy } } : {}),
      })
    },
    [updateAnnotation]
  )

  const handleMoveRect = useCallback(
    (ann: Annotation, dx: number, dy: number) => {
      if (!ann.rect) return
      updateAnnotation(ann.id, {
        rect: { ...ann.rect, x: ann.rect.x + dx, y: ann.rect.y + dy },
      })
    },
    [updateAnnotation]
  )

  const handleResizeRect = useCallback(
    (ann: Annotation, corner: string, dx: number, dy: number) => {
      if (!ann.rect) return
      updateAnnotation(ann.id, { rect: applyCornerResize(ann.rect, corner, dx, dy) })
    },
    [updateAnnotation]
  )

  // Build a map: annotationId → diff severity so annotation color always reflects
  // the latest design decision set in DetailPanel
  const diffSeverityMap = new Map(diffs.map(d => [d.annotationId, d.severity]))

  if (visibleAnnotations.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 18 }}>
      {visibleAnnotations.map((ann) => {
        const { sx, sy } = toScreen(ann.position.x, ann.position.y)
        const sr = ann.rect ? toScreenRect(ann.rect) : null
        const isActive = activeAnnotationId === ann.id
        // Use diff's severity (authoritative) with fallback to annotation's own severity
        const annWithSeverity = { ...ann, severity: diffSeverityMap.get(ann.id) ?? ann.severity }
        return (
          <AnnotationBubble
            key={ann.id}
            ann={annWithSeverity}
            screenX={sx}
            screenY={sy}
            screenRect={sr}
            isActive={isActive}
            scale={scale}
            onSelect={() => setActiveAnnotation(ann.id)}
            onMoveBubble={(dx, dy) => handleMoveBubble(ann, dx, dy)}
            onMoveRect={(dx, dy) => handleMoveRect(ann, dx, dy)}
            onResizeRect={(corner, dx, dy) => handleResizeRect(ann, corner, dx, dy)}
          />
        )
      })}
    </div>
  )
}

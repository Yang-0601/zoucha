'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store'
import { DiffRecord, DiffType, RectCorner } from '@/types'
import { Trash2 } from 'lucide-react'

/* ── Design tokens ─────────────────────────────────────────── */
const T = {
  paper:    '#F7F4EE',
  wood:     '#D9C8A0',
  smoke:    '#D7D5D1',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  border:   '#E5E2DC',
  warm:     '#EDE9E1',
  moss:     '#6B7A5E',
}

const SEV_OPTIONS: { value: DiffRecord['severity']; label: string; dot: string }[] = [
  { value: 'high', label: '必须修复',   dot: '#E5404A' },
  { value: 'mid',  label: '建议修复',   dot: '#F0A020' },
  { value: 'low',  label: '可接受偏差', dot: '#6E8FAD' },
]

const DIFF_TYPE_OPTIONS: { value: DiffType; label: string }[] = [
  { value: 'element',     label: '元素' },
  { value: 'text',        label: '文字' },
  { value: 'module',      label: '模块' },
  { value: 'layout',      label: '布局' },
  { value: 'spacing',     label: '间距' },
  { value: 'interaction', label: '交互' },
  { value: 'color',       label: '颜色' },
  { value: 'font-weight', label: '字重' },
  { value: 'line-height', label: '行高' },
]

/* ── Shared primitives ─────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 12, fontWeight: 500, color: T.mist,
      letterSpacing: '0.10em', textTransform: 'uppercase',
      marginBottom: 8,
    }}>
      {children}
    </p>
  )
}

function Rule() {
  return <div style={{ height: 1, background: T.border }} />
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '14px 16px' }}>{children}</div>
}

function WasiInput({
  value, onChange, placeholder, rows, mono, autoGrow,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  mono?: boolean
  autoGrow?: boolean
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!autoGrow || !taRef.current) return
    const el = taRef.current
    el.style.height = '0px'       // force scrollHeight to reflect true content height
    el.style.height = `${el.scrollHeight}px`
    el.scrollTop = 0              // prevent top-clipping on some browsers
  }, [value, autoGrow])

  const base: React.CSSProperties = {
    width: '100%', fontSize: 13, color: T.charcoal,
    background: T.warm, border: `1px solid ${T.border}`,
    borderRadius: 6, padding: '7px 10px',
    outline: 'none', resize: 'none',
    fontFamily: mono ? 'var(--font-geist-mono), monospace' : 'inherit',
    lineHeight: 1.6,
    transition: 'border-color 150ms',
  }
  if (rows || autoGrow) {
    return (
      <textarea
        ref={autoGrow ? taRef : undefined}
        rows={rows ?? 3}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ ...base, ...(autoGrow ? { overflow: 'hidden' } : {}) }}
        onFocus={e => (e.currentTarget.style.borderColor = T.charcoal)}
        onBlur={e => (e.currentTarget.style.borderColor = T.border)}
      />
    )
  }
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={base}
      onFocus={e => (e.currentTarget.style.borderColor = T.charcoal)}
      onBlur={e => (e.currentTarget.style.borderColor = T.border)}
    />
  )
}

/* ── Main component ─────────────────────────────────────────── */
export default function DetailPanel() {
  const {
    activeAnnotationId, annotations, diffs,
    updateDiff, updateAnnotation, setActiveAnnotation,
    removeAnnotation, removeDiff,
    customDiffTypes, addCustomDiffType, removeCustomDiffType,
    role,
  } = useAppStore()
  const isReviewer = role === 'reviewer'

  const [customLabel, setCustomLabel] = useState('')

  const handleAddCustomType = () => {
    const label = customLabel.trim()
    if (!label) return
    addCustomDiffType(label)
    // Also select it on the current diff
    const cur = Array.isArray(diff?.diffType) ? diff!.diffType : []
    if (!cur.includes(label)) {
      updateDiff(diff!.id, { diffType: [...cur, label], edited: true, source: 'manual' as const })
    }
    setCustomLabel('')
  }

  const annotation = annotations.find(a => a.id === activeAnnotationId)
  const diff = diffs.find(d => d.annotationId === activeAnnotationId)

  if (!annotation || !diff) {
    return (
      <aside
        className="shrink-0 flex items-center justify-center"
        style={{ width: 220, background: T.paper, borderLeft: `1px solid ${T.border}` }}
      >
        <p style={{ fontSize: 12, color: '#C4B99A', textAlign: 'center', lineHeight: 1.7, padding: '0 24px' }}>
          点击差异列表<br />或画布标注查看详情
        </p>
      </aside>
    )
  }

  return (
    <aside
      className="shrink-0 flex flex-col overflow-y-auto"
      style={{ width: 220, background: T.paper, borderLeft: `1px solid ${T.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center px-4 shrink-0"
        style={{ height: 44, borderBottom: `1px solid ${T.border}` }}
      >
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.charcoal }}>
          差异 #{annotation.index}
        </span>
        {diff.edited && (
          <span style={{ fontSize: 12, color: T.mist, marginRight: 10 }}>已编辑</span>
        )}
        {isReviewer && (
          <button
            onClick={() => {
              removeDiff(diff.id)
              removeAnnotation(annotation.id)
              setActiveAnnotation(null)
            }}
            aria-label="删除标注"
            style={{ color: T.mist, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            onMouseOver={e => (e.currentTarget.style.color = '#B85C5C')}
            onMouseOut={e => (e.currentTarget.style.color = T.mist)}
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        )}
      </div>


      {/* 设计决策 */}
      <Section>
        <SectionLabel>设计决策</SectionLabel>
        {isReviewer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SEV_OPTIONS.map(o => {
              const active = diff.severity === o.value
              return (
                <button
                  key={o.value}
                  onClick={() => updateDiff(diff.id, { severity: o.value, edited: true, source: 'manual' as const })}
                  className="flex items-center gap-2 transition-colors duration-150"
                  style={{
                    fontSize: 13,
                    color: active ? T.paper : T.ink,
                    background: active ? T.charcoal : 'transparent',
                    border: `1px solid ${active ? T.charcoal : T.border}`,
                    borderRadius: 6,
                    padding: '7px 10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={e => { if (!active) e.currentTarget.style.borderColor = T.mist }}
                  onMouseOut={e => { if (!active) e.currentTarget.style.borderColor = T.border }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: o.dot, flexShrink: 0 }} />
                  {o.label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2" style={{ padding: '7px 10px', background: T.warm, borderRadius: 6 }}>
            {SEV_OPTIONS.filter(o => o.value === diff.severity).map(o => (
              <>
                <span key="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: o.dot, flexShrink: 0 }} />
                <span key="label" style={{ fontSize: 13, color: T.ink }}>{o.label}</span>
              </>
            ))}
          </div>
        )}
      </Section>

      {/* 差异类型 */}
      <Section>
        <SectionLabel>差异类型</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {/* 预设类型 */}
          {DIFF_TYPE_OPTIONS.map(o => {
            const types = Array.isArray(diff.diffType) ? diff.diffType : [diff.diffType]
            const active = types.includes(o.value)
            if (!isReviewer && !active) return null
            return (
              <button
                key={o.value}
                onClick={isReviewer ? () => {
                  const cur = Array.isArray(diff.diffType) ? diff.diffType : [diff.diffType]
                  const next = cur.includes(o.value) ? cur.filter(t => t !== o.value) : [...cur, o.value]
                  updateDiff(diff.id, { diffType: next.length ? next : [o.value], edited: true, source: 'manual' as const })
                } : undefined}
                className={isReviewer ? 'transition-colors duration-150' : ''}
                style={{
                  fontSize: 13, color: active ? T.paper : T.ink,
                  background: active ? T.charcoal : 'transparent',
                  border: `1px solid ${active ? T.charcoal : T.border}`,
                  borderRadius: 4, padding: '4px 9px',
                  cursor: isReviewer ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={isReviewer ? (e => { if (!active) e.currentTarget.style.borderColor = T.mist }) : undefined}
                onMouseOut={isReviewer ? (e => { if (!active) e.currentTarget.style.borderColor = T.border }) : undefined}
              >
                {o.label}
              </button>
            )
          })}
          {/* 全局自定义类型 */}
          {customDiffTypes.map(label => {
            const types = Array.isArray(diff.diffType) ? diff.diffType : [diff.diffType]
            const active = types.includes(label)
            if (!isReviewer && !active) return null
            return (
              <div key={label} className="flex items-center" style={{ position: 'relative' }}>
                <button
                  onClick={isReviewer ? () => {
                    const cur = Array.isArray(diff.diffType) ? diff.diffType : [diff.diffType]
                    const next = cur.includes(label) ? cur.filter(t => t !== label) : [...cur, label]
                    updateDiff(diff.id, { diffType: next.length ? next : cur, edited: true, source: 'manual' as const })
                  } : undefined}
                  className={isReviewer ? 'transition-colors duration-150' : ''}
                  style={{
                    fontSize: 13, color: active ? T.paper : T.ink,
                    background: active ? T.charcoal : 'transparent',
                    border: `1px solid ${active ? T.charcoal : T.border}`,
                    borderRadius: 4,
                    padding: isReviewer ? '4px 28px 4px 9px' : '4px 9px',
                    cursor: isReviewer ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={isReviewer ? (e => { if (!active) e.currentTarget.style.borderColor = T.mist }) : undefined}
                  onMouseOut={isReviewer ? (e => { if (!active) e.currentTarget.style.borderColor = T.border }) : undefined}
                >
                  {label}
                </button>
                {/* 删除全局自定义标签 — reviewer only */}
                {isReviewer && (
                  <button
                    onClick={e => { e.stopPropagation(); removeCustomDiffType(label) }}
                    title="删除此标签"
                    style={{
                      position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                      color: active ? '#ffffff88' : T.mist, lineHeight: 1,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {/* 新增自定义标签 — reviewer only */}
        {isReviewer && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <input
              type="text"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder="新增标签…"
              style={{
                flex: 1, minWidth: 0, fontSize: 13, color: T.charcoal,
                background: 'transparent', border: `1px solid ${T.border}`,
                borderRadius: 4, padding: '4px 9px',
                outline: 'none', transition: 'border-color 150ms',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = T.charcoal)}
              onBlur={e => (e.currentTarget.style.borderColor = T.border)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCustomType() }}
            />
            <button
              onClick={handleAddCustomType}
              style={{
                fontSize: 13, color: T.mist, background: 'transparent',
                border: `1px solid ${T.border}`, borderRadius: 4,
                padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'border-color 150ms',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = T.mist)}
              onMouseOut={e => (e.currentTarget.style.borderColor = T.border)}
            >
              确定
            </button>
          </div>
        )}
      </Section>

      {/* 差异描述 */}
      <Section>
        <SectionLabel>差异描述</SectionLabel>
        {isReviewer ? (
          <WasiInput
            autoGrow
            value={diff.description}
            onChange={v => updateDiff(diff.id, { description: v, edited: true, source: 'manual' as const })}
          />
        ) : (
          <p style={{ fontSize: 13, color: T.charcoal, lineHeight: 1.6 }}>{diff.description}</p>
        )}
      </Section>

      {/* CSS 建议 */}
      {diff.cssHint !== undefined && (
        <>
          <Rule />
          <Section>
            <SectionLabel>CSS 建议</SectionLabel>
            {isReviewer ? (
              <WasiInput
                rows={4}
                mono
                value={diff.cssHint}
                onChange={v => updateDiff(diff.id, { cssHint: v, edited: true, source: 'manual' as const })}
              />
            ) : (
              <pre style={{
                fontSize: 12, color: T.charcoal, lineHeight: 1.6,
                fontFamily: 'var(--font-geist-mono), monospace',
                background: T.warm, borderRadius: 6, padding: '7px 10px',
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>{diff.cssHint}</pre>
            )}
          </Section>
        </>
      )}

      {/* 标注样式 — reviewer only */}
      {isReviewer && <Section><SectionLabel>标注样式</SectionLabel>
        <div style={{ display: 'flex', gap: 4 }}>
          {([['A', '序号'], ['B', '边框'], ['C', '填充']] as const).map(([s, label]) => {
            const active = annotation.style === s
            return (
              <button
                key={s}
                onClick={() => {
                  if (s === 'A') {
                    updateAnnotation(annotation.id, { style: s, rect: null })
                  } else {
                    const rect = annotation.rect ?? {
                      x: annotation.position.x - 40,
                      y: annotation.position.y - 25,
                      w: 80, h: 50,
                    }
                    updateAnnotation(annotation.id, {
                      style: s, rect, rectCorner: 'tl',
                      position: { x: rect.x, y: rect.y },
                    })
                  }
                }}
                className="flex-1 transition-colors duration-150"
                style={{
                  fontSize: 13,
                  color: active ? T.paper : T.mist,
                  background: active ? T.charcoal : 'transparent',
                  border: `1px solid ${active ? T.charcoal : T.border}`,
                  borderRadius: 5,
                  padding: '5px 0',
                  cursor: 'pointer',
                }}
                onMouseOver={e => { if (!active) e.currentTarget.style.borderColor = T.mist }}
                onMouseOut={e => { if (!active) e.currentTarget.style.borderColor = T.border }}
              >
                {label}
              </button>
            )
          })}
        </div>
        {annotation.style === 'C' && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: T.mist }}>填充不透明度</span>
              <span style={{ fontSize: 12, color: T.charcoal, fontWeight: 500 }}>
                {annotation.fillOpacity ?? 20}%
              </span>
            </div>
            <input
              type="range" min={10} max={80} step={5}
              value={annotation.fillOpacity ?? 20}
              onChange={e => updateAnnotation(annotation.id, { fillOpacity: Number(e.target.value) })}
              style={{ width: '100%', accentColor: T.charcoal }}
            />
          </div>
        )}
      </Section>}

      {/* 气泡位置 — B / C, reviewer only */}
      {isReviewer && (annotation.style === 'B' || annotation.style === 'C') && (
        <>
          <Rule />
          <Section>
            <SectionLabel>气泡位置</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, width: 64 }}>
              {(['tl', 'tr', 'bl', 'br'] as RectCorner[]).map(c => {
                const active = (annotation.rectCorner ?? 'tl') === c
                return (
                  <button
                    key={c}
                    title={{ tl: '左上', tr: '右上', bl: '左下', br: '右下' }[c]}
                    onClick={() => {
                      if (!annotation.rect) { updateAnnotation(annotation.id, { rectCorner: c }); return }
                      const { x, y, w, h } = annotation.rect
                      const pos = {
                        tl: { x, y }, tr: { x: x + w, y },
                        bl: { x, y: y + h }, br: { x: x + w, y: y + h },
                      }[c]
                      updateAnnotation(annotation.id, { rectCorner: c, position: pos })
                    }}
                    style={{
                      height: 26, fontSize: 13,
                      color: active ? T.paper : T.smoke,
                      background: active ? T.charcoal : 'transparent',
                      border: `1px solid ${active ? T.charcoal : T.border}`,
                      borderRadius: 5,
                      cursor: 'pointer',
                    }}
                    onMouseOver={e => { if (!active) e.currentTarget.style.borderColor = T.mist }}
                    onMouseOut={e => { if (!active) e.currentTarget.style.borderColor = T.border }}
                  >
                    {c === 'tl' ? '↖' : c === 'tr' ? '↗' : c === 'bl' ? '↙' : '↘'}
                  </button>
                )
              })}
            </div>
          </Section>
        </>
      )}
    </aside>
  )
}

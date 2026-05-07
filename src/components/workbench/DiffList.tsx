'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { DiffRecord, AnnotationStyle } from '@/types'
import { PenLine, Plus, X, Trash2 } from 'lucide-react'

const SEV_DOT: Record<DiffRecord['severity'], string> = {
  high: '#E5404A',
  mid:  '#F0A020',
  low:  '#6E8FAD',
}

const SEV_LABEL: Record<DiffRecord['severity'], string> = {
  high: '必须修复',
  mid: '建议修复',
  low: '可接受偏差',
}

const DIFF_TYPE_LABEL: Record<string, string> = {
  element:     '元素',
  text:        '文字',
  module:      '模块',
  layout:      '布局',
  spacing:     '间距',
  interaction: '交互',
  color:       '颜色',
  'font-weight': '字重',
  'line-height': '行高',
  custom:      '自定义',
  /* legacy */
  font: '字体', size: '尺寸', radius: '圆角',
  shadow: '阴影', missing: '缺失', extra: '多余', image: '图片',
}

const STYLE_OPTIONS: { style: AnnotationStyle; label: string; desc: string }[] = [
  { style: 'A', label: '序号', desc: '序号气泡' },
  { style: 'B', label: '边框', desc: '气泡 + 边框' },
  { style: 'C', label: '填充', desc: '气泡 + 色块' },
]

type FilterKey = 'all' | 'ai' | 'manual'

/* Hairline separator */
const Rule = () => <div style={{ height: 1, background: '#E5E2DC' }} />

export default function DiffList() {
  const {
    diffs, annotations, activeAnnotationId, setActiveAnnotation,
    annotationMode, setAnnotationMode,
    pendingAnnotationStyle, setPendingAnnotationStyle,
    pendingFillOpacity, setPendingFillOpacity,
    reorderDiffs, removeDiff, removeAnnotation,
    confidenceThreshold,
    diffFilter, setDiffFilter,
  } = useAppStore()

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const listRef = useRef<HTMLUListElement>(null)

  const filteredDiffs = diffs.filter(d => {
    if (d.source === 'ai' && typeof d.confidence === 'number' && d.confidence < confidenceThreshold) return false
    if (diffFilter === 'ai') return d.source === 'ai'
    if (diffFilter === 'manual') return d.source === 'manual'
    return true
  })

  const isSelecting = selectedIds.size > 0

  const toggleSelect = (diffId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(diffId) ? next.delete(diffId) : next.add(diffId)
      return next
    })
  }

  const handleBatchDelete = () => {
    filteredDiffs.filter(d => selectedIds.has(d.id)).forEach(d => {
      removeDiff(d.id)
      removeAnnotation(d.annotationId)
    })
    setSelectedIds(new Set())
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredDiffs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredDiffs.map(d => d.id)))
    }
  }

  useEffect(() => {
    if (!activeAnnotationId || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-annotation-id="${activeAnnotationId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeAnnotationId])

  return (
    <aside
      className="shrink-0 flex flex-col"
      style={{ width: 200, background: '#F7F4EE', borderRight: '1px solid #E5E2DC' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: 44, borderBottom: '1px solid #E5E2DC', flexShrink: 0 }}
      >
        {isSelecting ? (
          <>
            <button
              onClick={handleSelectAll}
              style={{ fontSize: 12, color: '#8A8680', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {selectedIds.size === filteredDiffs.length ? '取消全选' : `全选 (${selectedIds.size}/${filteredDiffs.length})`}
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: '#F7F4EE', background: '#E5404A', border: 'none', borderRadius: 5, padding: '4px 9px', cursor: 'pointer' }}
            >
              <Trash2 size={10} />
              删除 {selectedIds.size}
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#252525', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              差异列表
            </span>
            <button
              onClick={() => setAnnotationMode(!annotationMode)}
              title={annotationMode ? '退出标注模式' : '添加标注'}
              className="flex items-center gap-1 transition-colors duration-150"
              style={{
                fontSize: 13, fontWeight: 500, color: '#F7F4EE',
                background: annotationMode ? '#F0A020' : '#252525',
                borderRadius: 5, padding: '4px 9px', border: 'none', cursor: 'pointer',
              }}
              onMouseOver={e => { e.currentTarget.style.background = annotationMode ? '#D99318' : '#3D3A36' }}
              onMouseOut={e => { e.currentTarget.style.background = annotationMode ? '#F0A020' : '#252525' }}
            >
              {annotationMode ? <X size={9} /> : <Plus size={9} />}
              {annotationMode ? '退出' : '新增'}
            </button>
          </>
        )}
      </div>

      {/* Style picker — annotation mode */}
      {annotationMode && (
        <>
          <div className="px-4 py-3" style={{ background: '#F3F0E8' }}>
            <p style={{ fontSize: 12, color: '#8A8680', marginBottom: 8, letterSpacing: '0.04em' }}>
              选择样式后点击画面
            </p>
            <div className="flex gap-1">
              {STYLE_OPTIONS.map(({ style, label, desc }) => {
                const active = pendingAnnotationStyle === style
                return (
                  <button
                    key={style}
                    title={desc}
                    onClick={() => setPendingAnnotationStyle(style)}
                    className="flex-1 transition-colors duration-150"
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      color: active ? '#F7F4EE' : '#3D3A36',
                      background: active ? '#252525' : '#F7F4EE',
                      border: `1px solid ${active ? '#252525' : '#D7D5D1'}`,
                      borderRadius: 5,
                      padding: '5px 0',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {pendingAnnotationStyle === 'C' && (
              <div style={{ marginTop: 10 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#8A8680' }}>填充不透明度</span>
                  <span style={{ fontSize: 12, color: '#252525', fontWeight: 500 }}>{pendingFillOpacity}%</span>
                </div>
                <input
                  type="range" min={10} max={80} step={5}
                  value={pendingFillOpacity}
                  onChange={e => setPendingFillOpacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#252525' }}
                />
              </div>
            )}
          </div>
          <Rule />
        </>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-px px-3 py-2" style={{ borderBottom: '1px solid #E5E2DC' }}>
        {(['all', 'ai', 'manual'] as FilterKey[]).map(f => {
          const active = diffFilter === f
          return (
            <button
              key={f}
              onClick={() => setDiffFilter(f)}
              className="transition-colors duration-150"
              style={{
                fontSize: 13,
                color: active ? '#252525' : '#8A8680',
                fontWeight: active ? 500 : 400,
                background: active ? '#EDE9E1' : 'transparent',
                border: 'none',
                borderRadius: 4,
                padding: '3px 9px',
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? '全部' : f === 'ai' ? 'AI' : '手动'}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredDiffs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <PenLine size={16} strokeWidth={1.5} style={{ color: '#D9C8A0' }} />
            <p style={{ fontSize: 13, color: '#C4B99A', lineHeight: 1.7 }}>
              运行 AI 分析<br />或手动添加标注
            </p>
          </div>
        ) : (
          <ul ref={listRef}>
            {filteredDiffs.map((diff, i) => {
              const annotation = annotations.find(a => a.id === diff.annotationId)
              const isActive = activeAnnotationId === diff.annotationId
              const isDragging = dragId === diff.id
              const isOver = dragOverId === diff.id
              const types = Array.isArray(diff.diffType) ? diff.diffType : [diff.diffType]
              return (
                <li
                  key={diff.id}
                  data-annotation-id={diff.annotationId}
                  draggable
                  onDragStart={() => setDragId(diff.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                  onDragOver={e => { e.preventDefault(); setDragOverId(diff.id) }}
                  onDrop={() => {
                    if (dragId && dragId !== diff.id) reorderDiffs(dragId, diff.id)
                    setDragId(null); setDragOverId(null)
                  }}
                  onClick={() => setActiveAnnotation(diff.annotationId)}
                  className="transition-colors duration-150"
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F0EDE6',
                    background: selectedIds.has(diff.id) ? '#EDE9E1' : isActive ? '#EDE9E1' : 'transparent',
                    cursor: 'grab',
                    opacity: isDragging ? 0.4 : 1,
                    outline: isOver && !isDragging ? '2px solid #C4B99A' : 'none',
                    outlineOffset: -2,
                  }}
                  onMouseOver={e => { if (!isActive && !selectedIds.has(diff.id)) e.currentTarget.style.background = '#F3F0E8' }}
                  onMouseOut={e => { if (!isActive && !selectedIds.has(diff.id)) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* 顶行：序号 + 设计决策 + 多选框 */}
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <div className="flex items-center gap-2">
                      <span
                        onClick={e => toggleSelect(diff.id, e)}
                        title="选择"
                        style={{
                          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                          border: `1.5px solid ${selectedIds.has(diff.id) ? '#252525' : '#D7D5D1'}`,
                          background: selectedIds.has(diff.id) ? '#252525' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {selectedIds.has(diff.id) && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3 5.5L6.5 2" stroke="#F7F4EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span style={{ fontSize: 12, color: '#8A8680' }}>#{i + 1}</span>
                    </div>
                    <span className="flex items-center gap-1" style={{ fontSize: 12, color: '#8A8680' }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: SEV_DOT[diff.severity], flexShrink: 0,
                        display: 'inline-block',
                      }} />
                      {SEV_LABEL[diff.severity]}
                    </span>
                  </div>

                  {/* 一级：差异描述 */}
                  <p style={{
                    fontSize: 13, fontWeight: 500, color: '#252525', lineHeight: 1.6,
                    display: '-webkit-box', WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    marginBottom: 10,
                  }}>
                    {diff.description || diff.title}
                  </p>

                  {/* 二级：差异类型标签（多选） */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {types.map(t => (
                      <span key={t} style={{
                        fontSize: 12, color: '#8A8680',
                        background: 'transparent',
                        border: '1px solid #D7D5D1',
                        borderRadius: 4,
                        padding: '2px 8px', whiteSpace: 'nowrap',
                      }}>
                        {DIFF_TYPE_LABEL[t] ?? t}
                      </span>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}

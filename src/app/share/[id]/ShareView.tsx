'use client'

import { useEffect, useRef } from 'react'
import type { Annotation, DiffRecord } from '@/types'

// ── 设计 token ─────────────────────────────────────────────────────────────────
const T = {
  paper:    '#F7F4EE',
  warm:     '#EDE9E1',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  border:   '#E5E2DC',
  red:      '#E5404A',
  orange:   '#F0A020',
  blue:     '#6E8FAD',
}

const SEV_COLOR: Record<string, string> = { high: T.red, mid: T.orange, low: T.blue }
const SEV_LABEL: Record<string, string> = { high: '必须修复', mid: '建议修复', low: '可接受偏差' }
const DIFF_TYPE_LABEL: Record<string, string> = {
  element: '元素', text: '文字', module: '模块', layout: '布局',
  spacing: '间距', interaction: '交互', color: '颜色',
  'font-weight': '字重', 'line-height': '行高', custom: '自定义',
  font: '字体', size: '尺寸', radius: '圆角', shadow: '阴影',
  missing: '缺失', extra: '多余', image: '图片',
}

// ── 标注气泡叠加 canvas ────────────────────────────────────────────────────────
function AnnotatedCanvas({
  src,
  annotations,
  diffs,
}: {
  src: string
  annotations: Annotation[]
  diffs: DiffRecord[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 建立 diffId → 序号 映射（与 DiffList 顺序一致）
  const annIndexMap = new Map(diffs.map((d, i) => [d.annotationId, i + 1]))
  const diffSevMap = new Map(diffs.map(d => [d.annotationId, d.severity]))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const MAX = 600
      const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1)
      const W = Math.round(img.naturalWidth * scale)
      const H = Math.round(img.naturalHeight * scale)
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, W, H)

      for (const ann of annotations) {
        const idx = annIndexMap.get(ann.id)
        if (idx === undefined) continue
        const sev = diffSevMap.get(ann.id) ?? ann.severity
        const color = SEV_COLOR[sev] ?? T.mist

        // rect for style B / C
        if (ann.rect && (ann.style === 'B' || ann.style === 'C')) {
          const rx = ann.rect.x * scale, ry = ann.rect.y * scale
          const rw = ann.rect.w * scale, rh = ann.rect.h * scale
          if (ann.style === 'C') {
            const alpha = Math.round((ann.fillOpacity ?? 20) * 255 / 100).toString(16).padStart(2, '0')
            ctx.fillStyle = `${color}${alpha}`
            ctx.fillRect(rx, ry, rw, rh)
          } else {
            ctx.strokeStyle = color
            ctx.lineWidth = 1.5
            ctx.strokeRect(rx, ry, rw, rh)
          }
        }

        // bubble
        const sx = ann.position.x * scale
        const sy = ann.position.y * scale
        const r = 9
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = 'white'
        ctx.font = `700 9px -apple-system, "PingFang SC", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(idx), sx, sy)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }
    }
    img.src = src
  }, [src, annotations, diffs])  // eslint-disable-line

  return (
    <canvas
      ref={canvasRef}
      style={{ maxWidth: '100%', display: 'block', borderRadius: 6 }}
    />
  )
}

// ── 主组件 ─────────────────────────────────────────────────────────────────────
export default function ShareView({
  id, designUrl, liveUrl, annotations, diffs, createdAt,
}: {
  id: string
  designUrl: string
  liveUrl: string
  annotations: Annotation[]
  diffs: DiffRecord[]
  createdAt: string
}) {
  const date = new Date(createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const highCount = diffs.filter(d => d.severity === 'high').length
  const midCount  = diffs.filter(d => d.severity === 'mid').length

  return (
    <div style={{ minHeight: '100vh', background: T.paper, fontFamily: '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif' }}>

      {/* 顶部标题栏 */}
      <header style={{
        background: T.charcoal, color: '#fff',
        padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>设计走查分享</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{date} · #{id}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <span style={{ color: T.red }}>必须修复 <strong>{highCount}</strong></span>
          <span style={{ color: T.orange }}>建议修复 <strong>{midCount}</strong></span>
          <span style={{ color: '#9CA3AF' }}>共 {diffs.length} 条</span>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* 图片对比 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: T.mist, letterSpacing: '0.06em', marginBottom: 14 }}>
            设计稿 vs 线上稿
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: '设计稿', content: (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={designUrl} alt="设计稿" style={{ maxWidth: '100%', display: 'block', borderRadius: 6 }} />
              )},
              { label: '线上稿（含标注）', content: (
                <AnnotatedCanvas src={liveUrl} annotations={annotations} diffs={diffs} />
              )},
            ].map(({ label, content }) => (
              <div key={label} style={{
                background: T.warm, borderRadius: 10, padding: 12,
                border: `1px solid ${T.border}`,
              }}>
                {content}
                <p style={{ fontSize: 12, color: T.mist, marginTop: 8, textAlign: 'center' }}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 差异列表 */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: T.mist, letterSpacing: '0.06em', marginBottom: 14 }}>
            差异点列表（{diffs.length} 条）
          </h2>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.charcoal }}>
                  {['序号', '差异描述', '设计决策', '差异类型'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: 12, color: T.paper }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, i) => {
                  const types = (Array.isArray(d.diffType) ? d.diffType : [d.diffType])
                    .map(t => DIFF_TYPE_LABEL[t] ?? t).join(' · ')
                  return (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? T.paper : T.warm, verticalAlign: 'middle' }}>
                      <td style={{ padding: '10px 14px', color: T.mist, whiteSpace: 'nowrap', borderBottom: `1px solid ${T.border}` }}>
                        #{i + 1}
                      </td>
                      <td style={{ padding: '10px 14px', color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap', borderBottom: `1px solid ${T.border}` }}>
                        {d.description || d.title}
                      </td>
                      <td style={{ padding: '10px 14px', color: SEV_COLOR[d.severity], fontWeight: 500, whiteSpace: 'nowrap', borderBottom: `1px solid ${T.border}` }}>
                        {SEV_LABEL[d.severity]}
                      </td>
                      <td style={{ padding: '10px 14px', color: T.mist, borderBottom: `1px solid ${T.border}` }}>
                        {types}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}

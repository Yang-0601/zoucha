'use client'

import { useState, useRef, useCallback, useId, useEffect } from 'react'
import { X, Download, FileImage, FileText, ChevronUp, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store'

// ─── constants ───────────────────────────────────────────────────────────────

const T = {
  paper:    '#F7F4EE',
  warm:     '#EDE9E1',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  smoke:    '#D7D5D1',
  border:   '#E5E2DC',
  moss:     '#6B7A5E',
  red:      '#B85C5C',
  amber:    '#C49A45',
  gray:     '#9CA3AF',
}

const SEV_COLOR: Record<string, string> = {
  high: T.red, mid: T.amber, low: T.gray,
}
const SEV_LABEL: Record<string, string> = {
  high: '必须修复', mid: '建议修复', low: '可接受偏差',
}
const DIFF_TYPE_LABEL: Record<string, string> = {
  element: '元素', text: '文字', module: '模块', layout: '布局',
  spacing: '间距', interaction: '交互', color: '颜色',
  'font-weight': '字重', 'line-height': '行高', custom: '自定义',
  font: '字体', size: '尺寸', radius: '圆角', shadow: '阴影',
  missing: '缺失', extra: '多余', image: '图片',
}
const ANN_COLOR: Record<string, string> = {
  high: '#ef4444', mid: '#f97316', low: '#9ca3af',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    img.src = url
  })
}

/** Wrap text onto canvas ctx (char-level, supports CJK), returns lines drawn */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const chars = Array.from(text)
  let line = ''
  let lines = 0
  for (const char of chars) {
    const test = line + char
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight)
      line = char
      lines++
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, y + lines * lineHeight)
  return lines + 1
}

/** Measure how many lines text will wrap to, without drawing */
function measureWrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): number {
  const chars = Array.from(text)
  let line = ''
  let lines = 0
  for (const char of chars) {
    const test = line + char
    if (ctx.measureText(test).width > maxWidth && line) {
      line = char
      lines++
    } else {
      line = test
    }
  }
  return lines + 1
}

// ─── similarity computation ───────────────────────────────────────────────────

function computeBaseSimilarity(diffCount: number): number {
  // Heuristic: 0 diffs → 100%, each diff costs ~3-5%, floor 20%
  const base = Math.max(20, 100 - diffCount * 4)
  return Math.round(base)
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ReportModal({ onClose }: { onClose: () => void }) {
  const { diffs, annotations, designImage, liveImage } = useAppStore()

  const inputId = useId()
  const baseSimilarity = computeBaseSimilarity(diffs.length)
  const [similarity, setSimilarity] = useState(baseSimilarity)
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null)
  const printFrameRef = useRef<HTMLIFrameElement | null>(null)
  const annotatedCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!liveImage || !annotatedCanvasRef.current) return
    const canvas = annotatedCanvasRef.current
    const MAX_W = 268
    const MAX_H = 400
    const naturalW = liveImage.scaledWidth ?? liveImage.width
    const naturalH = liveImage.scaledHeight ?? liveImage.height
    const scale = Math.min(MAX_W / naturalW, MAX_H / naturalH)
    const W = Math.round(naturalW * scale)
    const H = Math.round(naturalH * scale)
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H)
      for (const ann of annotations) {
        const sx = ann.position.x * scale
        const sy = ann.position.y * scale
        if (ann.rect && (ann.style === 'B' || ann.style === 'C')) {
          const rx = ann.rect.x * scale
          const ry = ann.rect.y * scale
          const rw = ann.rect.w * scale
          const rh = ann.rect.h * scale
          if (ann.style === 'C') {
            ctx.fillStyle = `${ANN_COLOR[ann.severity]}44`
            ctx.fillRect(rx, ry, rw, rh)
          } else {
            ctx.strokeStyle = ANN_COLOR[ann.severity]
            ctx.lineWidth = 1.5
            ctx.strokeRect(rx, ry, rw, rh)
          }
        }
        const r = 8
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fillStyle = ANN_COLOR[ann.severity] ?? '#6b7280'
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = 'white'
        ctx.font = `700 9px -apple-system, "PingFang SC", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(ann.index), sx, sy)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }
    }
    img.src = liveImage.scaledUrl ?? liveImage.url
  }, [liveImage, annotations])

  // ── type count stats ──────────────────────────────────────────────────────
  const typeCounts: Record<string, number> = {}
  for (const d of diffs) {
    for (const t of d.diffType) {
      typeCounts[t] = (typeCounts[t] ?? 0) + 1
    }
  }

  // ─── PNG export ────────────────────────────────────────────────────────────
  const exportPng = useCallback(async () => {
    if (!designImage || !liveImage) return
    setExporting('png')
    try {
      const DPR = 2
      const W = 1200
      // Layout constants
      const PAD = 40
      const HEADER_H = 100
      const STATS_H = 140
      const IMG_SECTION_H = 460  // images + label
      const TABLE_HEADER_H = 40
      const DESC_COL_W = 340
      const LINE_H = 16
      const ROW_VPAD = 28  // vertical padding per row

      // Pre-measure row heights with a temporary canvas
      const measureCanvas = document.createElement('canvas')
      const measureCtx = measureCanvas.getContext('2d')!
      measureCtx.font = `400 11px -apple-system, "PingFang SC", sans-serif`
      const rowData = diffs.map(d => {
        const lineCount = measureWrapLines(measureCtx, d.description || d.title, DESC_COL_W - 16)
        return { lineCount, height: Math.max(44, lineCount * LINE_H + ROW_VPAD) }
      })
      const rowHeights = rowData.map(r => r.height)
      const TABLE_H = TABLE_HEADER_H + rowHeights.reduce((s, h) => s + h, 0) + 2
      const TOTAL_H = HEADER_H + STATS_H + IMG_SECTION_H + TABLE_H + PAD * 4

      const canvas = document.createElement('canvas')
      canvas.width = W * DPR
      canvas.height = TOTAL_H * DPR
      const ctx = canvas.getContext('2d')!
      ctx.scale(DPR, DPR)

      // background
      ctx.fillStyle = T.paper
      ctx.fillRect(0, 0, W, TOTAL_H)

      let cy = 0

      // ── header ──
      ctx.fillStyle = T.charcoal
      ctx.fillRect(0, 0, W, HEADER_H)
      ctx.fillStyle = T.paper
      ctx.font = `600 22px -apple-system, "PingFang SC", sans-serif`
      ctx.fillText('设计走查报告', PAD, 40)
      const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
      ctx.font = `400 13px -apple-system, "PingFang SC", sans-serif`
      ctx.fillStyle = T.smoke
      ctx.fillText(dateStr, PAD, 66)
      cy = HEADER_H

      // ── stats row ──
      cy += PAD
      const statsY = cy
      const statBoxW = (W - PAD * 2 - 12 * 3) / 4
      const statItems = [
        { label: '差异总数', value: String(diffs.length) },
        { label: '必须修复', value: String(diffs.filter(d => d.severity === 'high').length), color: T.red },
        { label: '建议修复', value: String(diffs.filter(d => d.severity === 'mid').length), color: T.amber },
        { label: '页面相似度', value: `${similarity}%`, color: similarity >= 80 ? T.moss : T.amber },
      ]
      for (let i = 0; i < statItems.length; i++) {
        const sx = PAD + i * (statBoxW + 12)
        ctx.fillStyle = T.warm
        roundRect(ctx, sx, statsY, statBoxW, 90, 8)
        ctx.fill()
        ctx.fillStyle = statItems[i].color ?? T.charcoal
        ctx.font = `700 28px -apple-system, "PingFang SC", sans-serif`
        ctx.fillText(statItems[i].value, sx + 16, statsY + 42)
        ctx.fillStyle = T.mist
        ctx.font = `400 12px -apple-system, "PingFang SC", sans-serif`
        ctx.fillText(statItems[i].label, sx + 16, statsY + 66)
      }
      cy += 90 + PAD

      // ── images ──
      ctx.fillStyle = T.charcoal
      ctx.font = `500 13px -apple-system, "PingFang SC", sans-serif`
      ctx.fillText('设计稿 vs 线上稿', PAD, cy + 16)
      cy += 26

      const imgAreaW = (W - PAD * 2 - 24) / 2
      const imgAreaH = IMG_SECTION_H - 40
      const imgY = cy + 2

      // draw design image
      const designImg = await loadImage(designImage.scaledUrl ?? designImage.url)
      drawImageFit(ctx, designImg, PAD, imgY, imgAreaW, imgAreaH)

      // draw live image
      const liveImg = await loadImage(liveImage.scaledUrl ?? liveImage.url)
      const liveX = PAD + imgAreaW + 24
      drawImageFit(ctx, liveImg, liveX, imgY, imgAreaW, imgAreaH)

      // draw annotation bubbles on live image
      const liveNaturalW = liveImage.scaledWidth ?? liveImage.width
      const liveNaturalH = liveImage.scaledHeight ?? liveImage.height
      // compute actual rendered size (object-fit: contain)
      const liveScale = Math.min(imgAreaW / liveNaturalW, imgAreaH / liveNaturalH)
      const liveRW = liveNaturalW * liveScale
      const liveRH = liveNaturalH * liveScale
      const liveOX = liveX + (imgAreaW - liveRW) / 2
      const liveOY = imgY + (imgAreaH - liveRH) / 2

      for (const ann of annotations) {
        const sx = liveOX + ann.position.x * liveScale
        const sy = liveOY + ann.position.y * liveScale

        // draw rect if style B/C first so bubble sits above it
        if (ann.rect && (ann.style === 'B' || ann.style === 'C')) {
          const rx = liveOX + ann.rect.x * liveScale
          const ry = liveOY + ann.rect.y * liveScale
          const rw = ann.rect.w * liveScale
          const rh = ann.rect.h * liveScale
          if (ann.style === 'C') {
            ctx.fillStyle = `${ANN_COLOR[ann.severity]}44`
            ctx.fillRect(rx, ry, rw, rh)
          } else {
            ctx.strokeStyle = ANN_COLOR[ann.severity]
            ctx.lineWidth = 1.5
            ctx.strokeRect(rx, ry, rw, rh)
          }
        }

        const r = 10
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fillStyle = ANN_COLOR[ann.severity] ?? '#6b7280'
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = 'white'
        ctx.font = `700 10px -apple-system, "PingFang SC", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(ann.index), sx, sy)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }

      // image labels
      ctx.fillStyle = T.mist
      ctx.font = `400 11px -apple-system, "PingFang SC", sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('设计稿', PAD + imgAreaW / 2, imgY + imgAreaH + 18)
      ctx.fillText('线上稿（含标注）', liveX + imgAreaW / 2, imgY + imgAreaH + 18)
      ctx.textAlign = 'left'
      cy += imgAreaH + 30

      // ── table ──
      cy += PAD / 2
      ctx.fillStyle = T.charcoal
      ctx.font = `500 13px -apple-system, "PingFang SC", sans-serif`
      ctx.fillText('差异点列表', PAD, cy)
      cy += 16

      const cols = [
        { label: '序号', w: 48 },
        { label: '差异描述', w: 420 },
        { label: '设计决策', w: 120 },
        { label: '差异类型', w: 200 },
      ]
      const totalColW = cols.reduce((s, c) => s + c.w, 0)
      const tableX = PAD + (W - PAD * 2 - totalColW) / 2

      // header row
      ctx.fillStyle = T.charcoal
      ctx.fillRect(tableX, cy, totalColW, TABLE_HEADER_H)
      let cx2 = tableX
      for (const col of cols) {
        ctx.fillStyle = T.paper
        ctx.font = `500 11px -apple-system, "PingFang SC", sans-serif`
        ctx.fillText(col.label, cx2 + 10, cy + 26)
        cx2 += col.w
      }
      cy += TABLE_HEADER_H

      // data rows (variable height)
      let rowOffsetY = cy
      for (let i = 0; i < diffs.length; i++) {
        const d = diffs[i]
        const ann = annotations.find(a => a.id === d.annotationId)
        const { lineCount, height: rowH } = rowData[i]
        const rowY = rowOffsetY
        ctx.fillStyle = i % 2 === 0 ? T.paper : T.warm
        ctx.fillRect(tableX, rowY, totalColW, rowH)

        ctx.fillStyle = T.border
        ctx.fillRect(tableX, rowY + rowH - 1, totalColW, 1)

        let colX = tableX
        ctx.font = `400 11px -apple-system, "PingFang SC", sans-serif`

        // index (vertically centered)
        ctx.fillStyle = T.mist
        ctx.textAlign = 'center'
        ctx.fillText(`#${ann?.index ?? i + 1}`, colX + 24, rowY + rowH / 2 + 4)
        ctx.textAlign = 'left'
        colX += cols[0].w

        // description (vertically centered block)
        ctx.fillStyle = T.charcoal
        const descStartY = rowY + (rowH - lineCount * LINE_H) / 2 + LINE_H - 3
        wrapText(ctx, d.description || d.title, colX + 8, descStartY, cols[1].w - 16, LINE_H)
        colX += cols[1].w

        // severity (vertically centered)
        ctx.fillStyle = SEV_COLOR[d.severity]
        ctx.font = `500 11px -apple-system, "PingFang SC", sans-serif`
        ctx.fillText(SEV_LABEL[d.severity], colX + 8, rowY + rowH / 2 + 4)
        colX += cols[2].w

        // diff types (vertically centered)
        ctx.fillStyle = T.mist
        ctx.font = `400 11px -apple-system, "PingFang SC", sans-serif`
        const typeStr = d.diffType.map(t => DIFF_TYPE_LABEL[t] ?? t).join(' · ')
        ctx.fillText(typeStr, colX + 8, rowY + rowH / 2 + 4)

        rowOffsetY += rowH
      }

      // download
      canvas.toBlob(blob => {
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `设计走查报告_${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(a.href)
        setExporting(null)
      }, 'image/png')
    } catch (e) {
      console.error(e)
      setExporting(null)
    }
  }, [designImage, liveImage, diffs, annotations, similarity, typeCounts])

  // ─── PDF export ────────────────────────────────────────────────────────────
  const exportPdf = useCallback(async () => {
    if (!designImage || !liveImage) return
    setExporting('pdf')

    const annotatedLiveUrl = await createAnnotatedLiveImageUrl(liveImage, annotations)
    const typeRows = Object.entries(typeCounts)
      .map(([k, v]) => `<span class="tag">${DIFF_TYPE_LABEL[k] ?? k} <b>${v}</b></span>`)
      .join('')

    const tableRows = diffs.map((d, i) => {
      const ann = annotations.find(a => a.id === d.annotationId)
      const types = d.diffType.map(t => DIFF_TYPE_LABEL[t] ?? t).join(' · ')
      return `<tr class="${i % 2 === 0 ? '' : 'alt'}">
        <td class="center mist">#${ann?.index ?? i + 1}</td>
        <td>${d.description || d.title}</td>
        <td style="color:${SEV_COLOR[d.severity]};font-weight:500">${SEV_LABEL[d.severity]}</td>
        <td class="mist">${types}</td>
        <td style="color:${d.source === 'ai' ? '#2563eb' : T.mist}">${d.source === 'ai' ? 'AI' : '手动'}</td>
      </tr>`
    }).join('')

    const simColor = similarity >= 80 ? T.moss : T.amber

    const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>设计走查报告</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system,"PingFang SC","Microsoft YaHei",sans-serif; background:#fff; color:${T.charcoal}; font-size:13px; }
  @page { size: A4; margin: 18mm 16mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .header { background:${T.charcoal}; color:#fff; padding:20px 28px; margin-bottom:20px; border-radius:8px; }
  .header h1 { font-size:20px; font-weight:600; margin-bottom:4px; }
  .header .date { color:${T.smoke}; font-size:12px; }
  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
  .stat { background:${T.warm}; border-radius:8px; padding:14px 16px; }
  .stat .val { font-size:26px; font-weight:700; }
  .stat .lbl { font-size:11px; color:${T.mist}; margin-top:4px; }
  .section-title { font-size:13px; font-weight:500; margin-bottom:10px; }
  .tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:20px; }
  .tag { background:${T.warm}; border:1px solid ${T.border}; border-radius:5px; padding:3px 10px; font-size:12px; color:${T.charcoal}; }
  .tag b { font-weight:600; }
  .images { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; page-break-inside:avoid; }
  .img-box { background:${T.warm}; border-radius:8px; padding:10px; text-align:center; }
  .img-box img { max-width:100%; max-height:320px; object-fit:contain; display:block; margin:0 auto; }
  .img-box .img-label { font-size:11px; color:${T.mist}; margin-top:6px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:${T.charcoal}; color:#fff; padding:8px 10px; text-align:left; font-weight:500; font-size:11px; }
  td { padding:9px 10px; border-bottom:1px solid ${T.border}; vertical-align:top; line-height:1.5; }
  tr.alt td { background:${T.warm}; }
  .center { text-align:center; }
  .mist { color:${T.mist}; }
</style>
</head>
<body>
<div class="header">
  <h1>设计走查报告</h1>
  <div class="date">${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

<div class="stats">
  <div class="stat"><div class="val">${diffs.length}</div><div class="lbl">差异总数</div></div>
  <div class="stat"><div class="val" style="color:${T.red}">${diffs.filter(d => d.severity === 'high').length}</div><div class="lbl">必须修复</div></div>
  <div class="stat"><div class="val" style="color:${T.amber}">${diffs.filter(d => d.severity === 'mid').length}</div><div class="lbl">建议修复</div></div>
  <div class="stat"><div class="val" style="color:${simColor}">${similarity}%</div><div class="lbl">页面相似度</div></div>
</div>

<p class="section-title">设计稿 vs 线上稿</p>
<div class="images">
  <div class="img-box">
    <img src="${designImage?.scaledUrl ?? designImage?.url ?? ''}" />
    <div class="img-label">设计稿</div>
  </div>
  <div class="img-box">
    <img src="${annotatedLiveUrl}" />
    <div class="img-label">线上稿（含标注）</div>
  </div>
</div>

<p class="section-title">差异点列表</p>
<table>
  <thead><tr><th style="width:48px">序号</th><th>差异描述</th><th style="width:90px">设计决策</th><th style="width:160px">差异类型</th><th style="width:60px">来源</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body>
</html>`

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;'
    document.body.appendChild(iframe)
    printFrameRef.current = iframe

    const doc = iframe.contentDocument!
    doc.open()
    doc.write(html)
    doc.close()

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
          printFrameRef.current = null
          setExporting(null)
        }, 500)
      }, 300)
    }
  }, [diffs, annotations, designImage, liveImage, similarity, typeCounts])

  // ─── render ────────────────────────────────────────────────────────────────
  const highCount = diffs.filter(d => d.severity === 'high').length
  const midCount  = diffs.filter(d => d.severity === 'mid').length
  const lowCount  = diffs.filter(d => d.severity === 'low').length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(37,37,37,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col"
        style={{
          background: T.paper, width: '100%', maxWidth: 600,
          maxHeight: '90vh', borderRadius: 12,
          border: `1px solid ${T.border}`,
          boxShadow: '0 8px 32px rgba(37,37,37,0.14)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center px-6 shrink-0"
          style={{ height: 52, borderBottom: `1px solid ${T.border}` }}
        >
          <h2 style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.charcoal }}>导出走查报告</h2>
          <button
            onClick={onClose}
            style={{ color: T.smoke, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.smoke)}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Summary stats */}
          <div>
            <p style={{ fontSize: 11, color: T.mist, marginBottom: 10, letterSpacing: '0.06em' }}>差异概览</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[
                { label: '差异总数', value: diffs.length, color: T.charcoal },
                { label: '必须修复', value: highCount, color: T.red },
                { label: '建议修复', value: midCount,  color: T.amber },
                { label: '可接受',   value: lowCount,  color: T.gray },
              ].map(s => (
                <div key={s.label} style={{ background: T.warm, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: T.mist, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Image comparison preview */}
          {(designImage || liveImage) && (
            <div>
              <p style={{ fontSize: 11, color: T.mist, marginBottom: 8, letterSpacing: '0.06em' }}>对比预览</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: T.warm, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  {designImage && (
                    <img
                      src={designImage.scaledUrl ?? designImage.url}
                      style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: 4 }}
                    />
                  )}
                  <p style={{ fontSize: 11, color: T.mist, marginTop: 6 }}>设计稿</p>
                </div>
                <div style={{ background: T.warm, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <canvas
                    ref={annotatedCanvasRef}
                    style={{ maxWidth: '100%', maxHeight: 400, display: 'block', margin: '0 auto', borderRadius: 4 }}
                  />
                  <p style={{ fontSize: 11, color: T.mist, marginTop: 6 }}>线上稿（含标注）</p>
                </div>
              </div>
            </div>
          )}

          {/* Similarity slider */}
          <div style={{ background: T.warm, borderRadius: 8, padding: '14px 16px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: T.charcoal }}>页面相似度</p>
                <p style={{ fontSize: 11, color: T.mist, marginTop: 2 }}>
                  基于差异数量自动估算，可手动调整
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSimilarity(v => Math.max(0, v - 1))}
                  style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 4, cursor: 'pointer', padding: '2px 4px', color: T.mist }}
                >
                  <ChevronDown size={12} />
                </button>
                <span style={{ fontSize: 20, fontWeight: 700, color: similarity >= 80 ? T.moss : T.amber, minWidth: 52, textAlign: 'center' }}>
                  {similarity}%
                </span>
                <button
                  onClick={() => setSimilarity(v => Math.min(100, v + 1))}
                  style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 4, cursor: 'pointer', padding: '2px 4px', color: T.mist }}
                >
                  <ChevronUp size={12} />
                </button>
              </div>
            </div>
            <input
              id={inputId}
              type="range" min={0} max={100}
              value={similarity}
              onChange={e => setSimilarity(+e.target.value)}
              style={{ width: '100%', accentColor: T.charcoal }}
            />
          </div>

          {/* Diff table preview */}
          <div>
            <p style={{ fontSize: 11, color: T.mist, marginBottom: 8, letterSpacing: '0.06em' }}>
              差异点列表（{diffs.length} 条）
            </p>
            {diffs.length === 0 ? (
              <p style={{ fontSize: 12, color: T.mist, textAlign: 'center', padding: '20px 0' }}>暂无差异记录</p>
            ) : (
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: T.charcoal }}>
                      {['序号', '差异描述', '设计决策', '差异类型'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: T.paper }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d, i) => {
                      const ann = annotations.find(a => a.id === d.annotationId)
                      const types = d.diffType.map(t => DIFF_TYPE_LABEL[t] ?? t).join(' · ')
                      return (
                        <tr key={d.id} style={{ background: i % 2 === 0 ? T.paper : T.warm }}>
                          <td style={{ padding: '8px 10px', color: T.mist, whiteSpace: 'nowrap', borderBottom: `1px solid ${T.border}` }}>
                            #{ann?.index ?? i + 1}
                          </td>
                          <td style={{ padding: '8px 10px', color: T.charcoal, lineHeight: 1.5, borderBottom: `1px solid ${T.border}` }}>
                            {d.description || d.title}
                          </td>
                          <td style={{ padding: '8px 10px', color: SEV_COLOR[d.severity], fontWeight: 500, whiteSpace: 'nowrap', borderBottom: `1px solid ${T.border}` }}>
                            {SEV_LABEL[d.severity]}
                          </td>
                          <td style={{ padding: '8px 10px', color: T.mist, borderBottom: `1px solid ${T.border}` }}>
                            {types}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 shrink-0"
          style={{ borderTop: `1px solid ${T.border}` }}
        >
          <button
            onClick={onClose}
            style={{
              fontSize: 12, color: T.mist, background: 'none',
              border: `1px solid ${T.border}`, borderRadius: 7,
              padding: '7px 18px', cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={exportPng}
            disabled={exporting !== null}
            className="flex items-center gap-1.5"
            style={{
              fontSize: 12, fontWeight: 500,
              color: exporting ? T.mist : T.charcoal,
              background: exporting ? T.warm : T.warm,
              border: `1px solid ${exporting ? T.border : T.smoke}`,
              borderRadius: 7, padding: '7px 18px', cursor: exporting ? 'not-allowed' : 'pointer',
            }}
          >
            <FileImage size={13} strokeWidth={1.5} />
            {exporting === 'png' ? '生成中…' : '导出 PNG'}
          </button>
          <button
            onClick={exportPdf}
            disabled={exporting !== null}
            className="flex items-center gap-1.5"
            style={{
              fontSize: 12, fontWeight: 500,
              color: exporting ? T.mist : T.paper,
              background: exporting ? T.warm : T.charcoal,
              border: 'none', borderRadius: 7,
              padding: '7px 18px', cursor: exporting ? 'not-allowed' : 'pointer',
            }}
            onMouseOver={e => { if (!exporting) e.currentTarget.style.background = T.ink }}
            onMouseOut={e => { if (!exporting) e.currentTarget.style.background = T.charcoal }}
          >
            <FileText size={13} strokeWidth={1.5} />
            {exporting === 'pdf' ? '生成中…' : '导出 PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── canvas helpers ───────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawImageFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight)
  const rw = img.naturalWidth * scale
  const rh = img.naturalHeight * scale
  const ox = x + (w - rw) / 2
  const oy = y + (h - rh) / 2
  // light background behind image
  ctx.fillStyle = '#f0ede6'
  ctx.fillRect(x, y, w, h)
  ctx.drawImage(img, ox, oy, rw, rh)
}

async function createAnnotatedLiveImageUrl(
  liveImage: any,
  annotations: any[],
) {
  const img = await loadImage(liveImage.scaledUrl ?? liveImage.url)
  const W = img.naturalWidth
  const H = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, W, H)
  for (const ann of annotations) {
    if (ann.rect && (ann.style === 'B' || ann.style === 'C')) {
      const rx = ann.rect.x
      const ry = ann.rect.y
      const rw = ann.rect.w
      const rh = ann.rect.h
      if (ann.style === 'C') {
        ctx.fillStyle = `${ANN_COLOR[ann.severity]}44`
        ctx.fillRect(rx, ry, rw, rh)
      } else {
        ctx.strokeStyle = ANN_COLOR[ann.severity]
        ctx.lineWidth = 1.5
        ctx.strokeRect(rx, ry, rw, rh)
      }
    }
    const sx = ann.position.x
    const sy = ann.position.y
    const r = 10
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fillStyle = ANN_COLOR[ann.severity] ?? '#6b7280'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = 'white'
    ctx.font = `700 10px -apple-system, "PingFang SC", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(ann.index), sx, sy)
  }
  return canvas.toDataURL('image/png')
}

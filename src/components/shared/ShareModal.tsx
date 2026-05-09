'use client'

import { useState, useCallback } from 'react'
import { X, Link2, Check, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store'

const T = {
  paper:    '#F7F4EE',
  warm:     '#EDE9E1',
  charcoal: '#252525',
  mist:     '#8A8680',
  border:   '#E5E2DC',
  smoke:    '#D7D5D1',
  ink:      '#3D3A36',
  red:      '#B85C5C',
  moss:     '#6B7A5E',
}

/** 将 ImageFile 的 url（blob 或 http）转为 dataUrl */
async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function ShareModal({ onClose }: { onClose: () => void }) {
  const { designImage, liveImage, annotations, diffs, confidenceThreshold } = useAppStore()

  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  // 与 DiffList / AnnotationLayer 保持一致的可见性过滤
  const visibleDiffs = diffs.filter(d => {
    if (d.source === 'ai' && typeof d.confidence === 'number' && d.confidence < confidenceThreshold) return false
    return true
  })
  const visibleAnnIds = new Set(visibleDiffs.map(d => d.annotationId))
  const visibleAnnotations = annotations.filter(a => visibleAnnIds.has(a.id))

  const handleGenerate = useCallback(async () => {
    if (!designImage || !liveImage) return
    setStatus('uploading')
    setErrMsg('')
    try {
      const [designDataUrl, liveDataUrl] = await Promise.all([
        toDataUrl(designImage.scaledUrl ?? designImage.url),
        toDataUrl(liveImage.scaledUrl ?? liveImage.url),
      ])

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designDataUrl,
          liveDataUrl,
          annotations: visibleAnnotations,
          diffs: visibleDiffs,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }

      const { url } = await res.json()
      setShareUrl(url)
      setStatus('done')
    } catch (err) {
      setErrMsg(String(err))
      setStatus('error')
    }
  }, [designImage, liveImage, visibleAnnotations, visibleDiffs])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])

  const canGenerate = !!(designImage && liveImage) && status !== 'uploading'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(37,37,37,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col"
        style={{
          background: T.paper, width: '100%', maxWidth: 480,
          borderRadius: 12, border: `1px solid ${T.border}`,
          boxShadow: '0 8px 32px rgba(37,37,37,0.14)',
        }}
      >
        {/* Header */}
        <div className="flex items-center px-6 shrink-0" style={{ height: 52, borderBottom: `1px solid ${T.border}` }}>
          <h2 style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.charcoal }}>生成分享链接</h2>
          <button
            onClick={onClose}
            style={{ color: T.smoke, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.smoke)}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {/* 说明 */}
          <p style={{ fontSize: 13, color: T.mist, lineHeight: 1.7 }}>
            链接包含设计稿、线上截图及全部可见标注数据，收件人无需登录即可查看。
          </p>

          {/* 统计 */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: '可见差异', value: visibleDiffs.length },
              { label: '标注气泡', value: visibleAnnotations.length },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: T.warm, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.charcoal }}>{s.value}</div>
                <div style={{ fontSize: 11, color: T.mist, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 无图片提示 */}
          {(!designImage || !liveImage) && (
            <p style={{ fontSize: 12, color: T.red, background: '#FEF2F2', borderRadius: 6, padding: '8px 12px' }}>
              请先上传设计稿和线上截图
            </p>
          )}

          {/* 错误 */}
          {status === 'error' && (
            <p style={{ fontSize: 12, color: T.red, background: '#FEF2F2', borderRadius: 6, padding: '8px 12px' }}>
              生成失败：{errMsg}
            </p>
          )}

          {/* 结果链接 */}
          {status === 'done' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.warm, borderRadius: 8, padding: '10px 12px',
              border: `1px solid ${T.border}`,
            }}>
              <Link2 size={14} strokeWidth={1.5} style={{ color: T.mist, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: T.ink, wordBreak: 'break-all' }}>{shareUrl}</span>
              <button
                onClick={handleCopy}
                style={{
                  fontSize: 12, fontWeight: 500, flexShrink: 0,
                  color: copied ? T.moss : T.charcoal,
                  background: 'none', border: `1px solid ${T.border}`,
                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {copied ? <Check size={12} strokeWidth={2} /> : null}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          )}
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
            关闭
          </button>
          {status !== 'done' && (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center gap-1.5"
              style={{
                fontSize: 12, fontWeight: 500,
                color: canGenerate ? T.paper : T.mist,
                background: canGenerate ? T.charcoal : T.warm,
                border: 'none', borderRadius: 7,
                padding: '7px 18px', cursor: canGenerate ? 'pointer' : 'not-allowed',
              }}
            >
              {status === 'uploading'
                ? <><Loader2 size={13} strokeWidth={1.5} className="animate-spin" />上传中…</>
                : <><Link2 size={13} strokeWidth={1.5} />生成链接</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

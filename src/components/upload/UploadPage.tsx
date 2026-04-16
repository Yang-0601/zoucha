'use client'

import React, { useEffect, useLayoutEffect, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, PenLine, Settings, ChevronLeft, ClipboardCheck, Upload, X, Plus } from 'lucide-react'
import { useAppStore } from '@/store'
import { scaleImageToWidth, readImageFile } from '@/lib/imageUtils'
import DropZone from './DropZone'
import WidthSelector from './WidthSelector'
import { ImageFile } from '@/types'

// ── Multi-image drop zone for review mode ────────────────────────────────────

function ReviewDropZone({
  images,
  onAdd,
  onRemove,
}: {
  images: ImageFile[]
  onAdd: (img: ImageFile) => void
  onRemove: (index: number) => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const MAX = 5

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) return
    if (file.size > 20 * 1024 * 1024) { alert('文件大小不能超过 20MB'); return }
    if (images.length >= MAX) { alert(`最多上传 ${MAX} 张图片`); return }
    const img = await readImageFile(file)
    onAdd(img)
  }, [images.length, onAdd])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    Array.from(e.dataTransfer.files).forEach(f => handleFile(f))
  }, [handleFile])

  return (
    <div className="flex flex-col gap-3">
      {/* Uploaded images grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative overflow-hidden"
              style={{
                width: 130,
                height: 100,
                background: '#F0EDE6',
                border: '1px solid #E5E2DC',
                borderRadius: 8,
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`设计稿 ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <button
                onClick={() => onRemove(i)}
                aria-label="移除"
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 20, height: 20,
                  background: 'rgba(247,244,238,0.92)',
                  border: '1px solid #E5E2DC',
                  borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#8A8680',
                }}
                onMouseOver={e => (e.currentTarget.style.color = '#252525')}
                onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
              >
                <X size={10} strokeWidth={2} />
              </button>
              <span
                style={{
                  position: 'absolute', bottom: 3, left: 5,
                  fontSize: 9, color: '#8A8680',
                  background: 'rgba(247,244,238,0.88)',
                  padding: '1px 5px',
                  borderRadius: 3,
                }}
              >
                {img.width} × {img.height}
              </span>
            </div>
          ))}

          {/* Add more slot */}
          {images.length < MAX && (
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                width: 130, height: 100,
                background: 'transparent',
                border: '1px dashed #D7D5D1',
                borderRadius: 8,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 6, cursor: 'pointer', color: '#8A8680',
                flexShrink: 0,
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#D9C8A0'; e.currentTarget.style.color = '#3D3A36' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#D7D5D1'; e.currentTarget.style.color = '#8A8680' }}
            >
              <Plus size={16} strokeWidth={1.5} />
              <span style={{ fontSize: 11 }}>继续添加</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={e => {
                  Array.from(e.target.files ?? []).forEach(f => handleFile(f))
                  e.target.value = ''
                }}
              />
            </button>
          )}
        </div>
      )}

      {/* Empty drop area */}
      {images.length === 0 && (
        <div
          tabIndex={0}
          role="button"
          aria-label="上传设计稿"
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            minHeight: 200,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            border: `1px dashed ${dragging ? '#D9C8A0' : '#D7D5D1'}`,
            background: dragging ? '#F3F0E8' : 'transparent',
            borderRadius: 10,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <Upload size={22} strokeWidth={1.5} style={{ color: dragging ? '#D9C8A0' : '#C4B99A' }} />
          <div className="text-center">
            <p style={{ fontSize: 13, color: '#3D3A36', lineHeight: 1.6 }}>拖拽、点击或 Ctrl+V 粘贴</p>
            <p style={{ fontSize: 11, color: '#C4B99A', marginTop: 4 }}>最多 {MAX} 张 · PNG · JPG · WebP · 最大 20MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={e => {
              Array.from(e.target.files ?? []).forEach(f => handleFile(f))
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UploadPage({ projectId, versionId }: { projectId?: string; versionId?: string }) {
  const router = useRouter()
  const {
    designImage,
    liveImage,
    targetWidth,
    uploadMode,
    reviewImages,
    setDesignImage,
    setLiveImage,
    setShowAIConfigModal,
    switchVersion,
    setUploadMode,
    addReviewImage,
    removeReviewImage,
    clearReviewImages,
    setReviewQuestions,
    setReviewAnswers,
    setAuditReport,
  } = useAppStore()

  useLayoutEffect(() => {
    if (versionId) {
      switchVersion(versionId)
    }
  }, [versionId, switchVersion])

  const workbenchBase = projectId && versionId
    ? `/project/${projectId}/version/${versionId}/workbench`
    : '/workbench'

  const analysisBase = projectId && versionId
    ? `/project/${projectId}/version/${versionId}/analysis`
    : '/workbench/analysis'

  useEffect(() => {
    if (designImage) {
      scaleImageToWidth(designImage, targetWidth).then(setDesignImage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWidth])

  useEffect(() => {
    if (liveImage) {
      scaleImageToWidth(liveImage, targetWidth).then(setLiveImage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWidth])

  const handleDesignImage = async (img: Parameters<typeof setDesignImage>[0]) => {
    if (!img) return setDesignImage(null)
    const scaled = await scaleImageToWidth(img, targetWidth)
    setDesignImage(scaled)
  }

  const handleLiveImage = async (img: Parameters<typeof setLiveImage>[0]) => {
    if (!img) return setLiveImage(null)
    const scaled = await scaleImageToWidth(img, targetWidth)
    setLiveImage(scaled)
  }

  const handleAddReviewImage = async (img: ImageFile) => {
    addReviewImage(img)
  }

  const canInspect = !!designImage && !!liveImage
  const canReview = reviewImages.length > 0

  function handleStartReview() {
    // Clear previous review state
    setReviewQuestions([])
    setReviewAnswers([])
    setAuditReport(null)
    router.push(analysisBase)
  }

  function handleModeSwitch(mode: 'inspect' | 'review') {
    setUploadMode(mode)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F4EE' }}>
      {/* Navigation */}
      <header
        className="shrink-0 flex items-center justify-between px-10"
        style={{ height: 56, borderBottom: '1px solid #E5E2DC' }}
      >
        <div className="flex items-center gap-3">
          {/* Wordmark */}
          <div
            className="flex items-center justify-center"
            style={{ width: 28, height: 28, background: '#252525', borderRadius: 6 }}
          >
            <span style={{ color: '#F7F4EE', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>DI</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#252525', letterSpacing: '-0.01em' }}>
            设计走查
          </span>
          <span style={{ fontSize: 11, color: '#8A8680', marginLeft: 2 }}>v1.1</span>
          {projectId && versionId && (
            <>
              <span style={{ fontSize: 12, color: '#D7D5D1', marginLeft: 4 }}>/</span>
              <button
                onClick={() => router.push(`/project/${projectId}`)}
                className="flex items-center gap-1 transition-colors duration-150"
                style={{ fontSize: 12, color: '#8A8680', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseOver={e => (e.currentTarget.style.color = '#252525')}
                onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
              >
                <ChevronLeft size={13} strokeWidth={1.5} />
                版本列表
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setShowAIConfigModal(true)}
          aria-label="AI 模型配置"
          className="flex items-center gap-1.5 transition-colors duration-150"
          style={{ fontSize: 12, color: '#8A8680' }}
          onMouseOver={e => (e.currentTarget.style.color = '#252525')}
          onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
        >
          <Settings size={13} strokeWidth={1.5} />
          AI 配置
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="w-full flex flex-col gap-10" style={{ maxWidth: 760 }}>

          {/* Mode toggle */}
          <div
            className="flex items-center"
            style={{
              background: '#EDE9E1',
              border: '1px solid #E5E2DC',
              borderRadius: 10,
              padding: 4,
              width: 'fit-content',
              gap: 2,
            }}
          >
            {([
              { mode: 'inspect' as const, icon: <PenLine size={13} strokeWidth={1.5} />, label: '设计走查' },
              { mode: 'review' as const, icon: <ClipboardCheck size={13} strokeWidth={1.5} />, label: '设计评审' },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => handleModeSwitch(mode)}
                className="flex items-center gap-1.5 transition-all duration-150"
                style={{
                  fontSize: 12,
                  fontWeight: uploadMode === mode ? 600 : 400,
                  color: uploadMode === mode ? '#252525' : '#8A8680',
                  background: uploadMode === mode ? '#F7F4EE' : 'transparent',
                  border: uploadMode === mode ? '1px solid #E5E2DC' : '1px solid transparent',
                  borderRadius: 7,
                  padding: '7px 16px',
                  cursor: 'pointer',
                  boxShadow: uploadMode === mode ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Page title */}
          <div style={{ borderLeft: '3px solid #D9C8A0', paddingLeft: 16 }}>
            {uploadMode === 'inspect' ? (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 600, color: '#252525', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  上传图片
                </h1>
                <p style={{ fontSize: 13, color: '#8A8680', marginTop: 6, lineHeight: 1.7 }}>
                  上传设计稿与线上截图，两张图将自动缩放至相同规格宽度以确保对比一致
                </p>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 600, color: '#252525', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  设计评审
                </h1>
                <p style={{ fontSize: 13, color: '#8A8680', marginTop: 6, lineHeight: 1.7 }}>
                  上传 1–5 张设计截图，AI 将基于尼尔森可用性原则生成可用性审计报告
                </p>
              </>
            )}
          </div>

          {uploadMode === 'inspect' ? (
            <>
              {/* Width selector */}
              <section className="flex flex-col gap-3">
                <WidthSelector />
                <div style={{ height: 1, background: '#E5E2DC' }} />
              </section>

              {/* Upload zones */}
              <section className="flex gap-6">
                <DropZone
                  label="设计稿"
                  image={designImage}
                  onImage={handleDesignImage}
                  onClear={() => setDesignImage(null)}
                />
                <DropZone
                  label="线上截图"
                  image={liveImage}
                  onImage={handleLiveImage}
                  onClear={() => setLiveImage(null)}
                />
              </section>

              {/* CTA row */}
              <div className="flex items-center gap-4">
                <button
                  disabled={!canInspect}
                  onClick={() => router.push(workbenchBase)}
                  className="flex items-center gap-2 transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    fontSize: 13, fontWeight: 500,
                    color: canInspect ? '#3D3A36' : '#C4B99A',
                    border: '1px solid',
                    borderColor: canInspect ? '#D7D5D1' : '#E5E2DC',
                    borderRadius: 8,
                    padding: '10px 18px',
                    background: 'transparent',
                    cursor: canInspect ? 'pointer' : 'not-allowed',
                  }}
                  onMouseOver={e => { if (canInspect) e.currentTarget.style.borderColor = '#8A8680' }}
                  onMouseOut={e => { if (canInspect) e.currentTarget.style.borderColor = '#D7D5D1' }}
                >
                  <PenLine size={14} strokeWidth={1.5} />
                  直接标注
                </button>

                <button
                  disabled={!canInspect}
                  onClick={() => router.push(`${workbenchBase}?autoAnalyze=1`)}
                  className="flex items-center gap-2 transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    fontSize: 13, fontWeight: 600,
                    color: canInspect ? '#F7F4EE' : '#C4B99A',
                    background: canInspect ? '#252525' : '#D7D5D1',
                    borderRadius: 8,
                    padding: '10px 22px',
                    border: 'none',
                    cursor: canInspect ? 'pointer' : 'not-allowed',
                  }}
                  onMouseOver={e => { if (canInspect) e.currentTarget.style.background = '#3D3A36' }}
                  onMouseOut={e => { if (canInspect) e.currentTarget.style.background = '#252525' }}
                >
                  <Sparkles size={14} strokeWidth={1.5} />
                  AI 分析
                </button>

                {!canInspect && (
                  <span style={{ fontSize: 12, color: '#C4B99A' }}>请先上传两张图片</span>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Review upload */}
              <section className="flex flex-col gap-3">
                <p style={{ fontSize: 11, fontWeight: 500, color: '#8A8680', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  设计截图
                </p>
                <ReviewDropZone
                  images={reviewImages}
                  onAdd={handleAddReviewImage}
                  onRemove={removeReviewImage}
                />
                {reviewImages.length > 0 && (
                  <button
                    onClick={clearReviewImages}
                    style={{ fontSize: 11, color: '#8A8680', background: 'none', border: 'none', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#B85C5C')}
                    onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
                  >
                    清空全部
                  </button>
                )}
              </section>

              {/* CTA */}
              <div className="flex items-center gap-4">
                <button
                  disabled={!canReview}
                  onClick={handleStartReview}
                  className="flex items-center gap-2 transition-all duration-150"
                  style={{
                    fontSize: 13, fontWeight: 600,
                    color: canReview ? '#F7F4EE' : '#C4B99A',
                    background: canReview ? '#252525' : '#D7D5D1',
                    borderRadius: 8,
                    padding: '10px 22px',
                    border: 'none',
                    cursor: canReview ? 'pointer' : 'not-allowed',
                  }}
                  onMouseOver={e => { if (canReview) e.currentTarget.style.background = '#3D3A36' }}
                  onMouseOut={e => { if (canReview) e.currentTarget.style.background = '#252525' }}
                >
                  <ClipboardCheck size={14} strokeWidth={1.5} />
                  开始评审
                </button>

                {!canReview && (
                  <span style={{ fontSize: 12, color: '#C4B99A' }}>请先上传至少一张设计截图</span>
                )}
              </div>
            </>
          )}

        </div>
      </main>

      {/* Footer hint */}
      <footer className="shrink-0 flex items-center justify-center pb-8">
        <p style={{ fontSize: 11, color: '#C4B99A', letterSpacing: '0.04em' }}>
          支持 PNG · JPG · WebP · 最大 20 MB
        </p>
      </footer>
    </div>
  )
}

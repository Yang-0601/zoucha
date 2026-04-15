'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, PenLine, Settings, ChevronLeft } from 'lucide-react'
import { useAppStore } from '@/store'
import { scaleImageToWidth } from '@/lib/imageUtils'
import DropZone from './DropZone'
import WidthSelector from './WidthSelector'

export default function UploadPage({ projectId, versionId }: { projectId?: string; versionId?: string }) {
  const router = useRouter()
  const {
    designImage,
    liveImage,
    targetWidth,
    setDesignImage,
    setLiveImage,
    setShowAIConfigModal,
    activeAnnotationId,
    setActiveAnnotation,
    annotations,
    diffs,
    setAnalysisRunning,
    setAnalysisProgress,
    setAnalysisPhase,
    clearAnnotationsAndDiffs,
  } = useAppStore()

  const [previousVersionId, setPreviousVersionId] = useState<string | null>(null)

  const workbenchBase = projectId && versionId
    ? `/project/${projectId}/version/${versionId}/workbench`
    : '/workbench'

  // Clear data when switching to a new version
  useEffect(() => {
    const currentVersionId = versionId || null

    // If versionId changed and is different from previous
    if (currentVersionId && currentVersionId !== previousVersionId) {
      // Clear all images and annotations from previous version
      setDesignImage(null)
      setLiveImage(null)
      clearAnnotationsAndDiffs()
      // Reset analysis state
      setAnalysisRunning(false)
      setAnalysisProgress(0)
      setAnalysisPhase('')
      // Update previous version ID
      setPreviousVersionId(currentVersionId)
    }
  }, [versionId, setDesignImage, setLiveImage, clearAnnotationsAndDiffs, setAnalysisRunning, setAnalysisProgress, setAnalysisPhase])

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

  // Auto-navigate to workbench if both images exist
  useEffect(() => {
    if (designImage && liveImage && projectId && versionId) {
      // Small delay to ensure state is settled
      const timer = setTimeout(() => {
        router.push(workbenchBase)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [designImage, liveImage, projectId, versionId, router, workbenchBase])

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

  const canProceed = !!designImage && !!liveImage

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
            style={{
              width: 28, height: 28,
              background: '#252525',
              borderRadius: 6,
            }}
          >
            <span style={{ color: '#F7F4EE', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>
              DI
            </span>
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
        <div className="w-full flex flex-col gap-14" style={{ maxWidth: 760 }}>

          {/* Page title */}
          <div style={{ borderLeft: '3px solid #D9C8A0', paddingLeft: 16 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#252525', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              上传图片
            </h1>
            <p style={{ fontSize: 13, color: '#8A8680', marginTop: 6, lineHeight: 1.7 }}>
              上传设计稿与线上截图，两张图将自动缩放至相同规格宽度以确保对比一致
            </p>
          </div>

          {/* Width selector + bottom rule grouped together */}
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
              disabled={!canProceed}
              onClick={() => router.push(workbenchBase)}
              className="flex items-center gap-2 transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: canProceed ? '#3D3A36' : '#C4B99A',
                border: '1px solid',
                borderColor: canProceed ? '#D7D5D1' : '#E5E2DC',
                borderRadius: 8,
                padding: '10px 18px',
                background: 'transparent',
                cursor: canProceed ? 'pointer' : 'not-allowed',
              }}
              onMouseOver={e => { if (canProceed) e.currentTarget.style.borderColor = '#8A8680' }}
              onMouseOut={e => { if (canProceed) e.currentTarget.style.borderColor = '#D7D5D1' }}
            >
              <PenLine size={14} strokeWidth={1.5} />
              直接标注
            </button>

            <button
              disabled={!canProceed}
              onClick={() => router.push(`${workbenchBase}?autoAnalyze=1`)}
              className="flex items-center gap-2 transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: canProceed ? '#F7F4EE' : '#C4B99A',
                background: canProceed ? '#252525' : '#D7D5D1',
                borderRadius: 8,
                padding: '10px 22px',
                border: 'none',
                cursor: canProceed ? 'pointer' : 'not-allowed',
              }}
              onMouseOver={e => { if (canProceed) e.currentTarget.style.background = '#3D3A36' }}
              onMouseOut={e => { if (canProceed) e.currentTarget.style.background = '#252525' }}
            >
              <Sparkles size={14} strokeWidth={1.5} />
              AI 分析
            </button>

            {!canProceed && (
              <span style={{ fontSize: 12, color: '#C4B99A' }}>请先上传两张图片</span>
            )}
          </div>

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

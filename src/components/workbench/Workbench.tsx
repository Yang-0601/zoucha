'use client'

import { useEffect, useLayoutEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings, FileDown, Share2 } from 'lucide-react'
import { useAppStore } from '@/store'
import Toolbar from './Toolbar'
import DiffList from './DiffList'
import CompareCanvas from './CompareCanvas'
import DetailPanel from './DetailPanel'
import ReportModal from '@/components/shared/ReportModal'
import ShareModal from '@/components/shared/ShareModal'
import WorkbenchGuideModal from '@/components/shared/WorkbenchGuideModal'

export default function Workbench() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  // e.g. /project/abc/version/xyz/workbench → back to /project/abc
  const segments = pathname.split('/')
  const backUrl = segments[1] === 'project' && segments[2] ? `/project/${segments[2]}` : '/'
  const versionId = segments[4] || null

  const {
    designImage, liveImage,
    setShowAIConfigModal, toggleRuler,
    showReportModal, setShowReportModal,
    showHelpModal, setShowHelpModal,
    showShareModal, setShowShareModal,
    switchVersion, versionData,
    annotations, diffs,
  } = useAppStore()

  const versionSnapshot = versionId ? versionData[versionId] : undefined

  useLayoutEffect(() => {
    if (versionId) {
      switchVersion(versionId)
    }
  }, [versionId, switchVersion])

  useEffect(() => {
    const hasExistingContent = !!designImage || !!liveImage || annotations.length > 0 || diffs.length > 0
    if (versionId && !hasExistingContent && !versionSnapshot) {
      router.replace(backUrl)
    }
  }, [designImage, liveImage, annotations.length, diffs.length, versionSnapshot, versionId, router, backUrl])

  useEffect(() => {
    if (searchParams.get('export') === '1' && designImage && liveImage) {
      setShowReportModal(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault(); toggleRuler()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleRuler])

  if (!designImage || !liveImage) return null

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F7F4EE' }}>
      {/* Top nav */}
      <header
        className="shrink-0 flex items-center gap-4 px-5"
        style={{ height: 44, borderBottom: '1px solid #E5E2DC', background: '#F7F4EE' }}
      >
        <Link
          href={backUrl}
          className="flex items-center gap-1.5 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ fontSize: 13, color: '#8A8680' }}
          onMouseOver={e => (e.currentTarget.style.color = '#252525')}
          onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
        >
          <ArrowLeft size={12} strokeWidth={1.5} />
          返回
        </Link>

        <div style={{ width: 1, height: 14, background: '#E5E2DC' }} />

        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center"
            style={{ width: 20, height: 20, background: '#252525', borderRadius: 4 }}
          >
            <span style={{ color: '#F7F4EE', fontSize: 8, fontWeight: 700, letterSpacing: '0.04em' }}>DI</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#252525', letterSpacing: '-0.01em' }}>走查工作台</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowHelpModal(true)}
          className="flex items-center gap-1 transition-colors duration-150 px-2 py-1"
          style={{ fontSize: 12, color: '#8A8680', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
          onMouseOver={e => (e.currentTarget.style.color = '#252525')}
          onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
        >
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 9999, background: '#8A8680', textAlign: 'center', lineHeight: '10px', fontSize: 10, color: '#F7F4EE' }}>?</span>
          使用手册
        </button>

        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-1 transition-colors duration-150 px-2 py-1"
          style={{ fontSize: 12, color: '#8A8680', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
          onMouseOver={e => (e.currentTarget.style.color = '#252525')}
          onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
        >
          <FileDown size={13} strokeWidth={1.5} />
          导出报告
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-1 transition-colors duration-150 px-2 py-1"
          style={{ fontSize: 12, color: '#8A8680', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
          onMouseOver={e => (e.currentTarget.style.color = '#252525')}
          onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
        >
          <Share2 size={13} strokeWidth={1.5} />
          分享
        </button>

        <div style={{ width: 1, height: 14, background: '#E5E2DC' }} />

        <button
          onClick={() => setShowAIConfigModal(true)}
          aria-label="设置"
          className="transition-colors duration-150 p-1"
          style={{ color: '#8A8680', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseOver={e => (e.currentTarget.style.color = '#252525')}
          onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
        >
          <Settings size={14} strokeWidth={1.5} />
        </button>
      </header>

      {/* Toolbar */}
      <Toolbar />

      {/* Main 3-column layout */}
      <div className="flex-1 flex min-h-0">
        <DiffList />
        <CompareCanvas />
        <DetailPanel />
      </div>

      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}
      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
      {showHelpModal && <WorkbenchGuideModal onClose={() => setShowHelpModal(false)} />}
    </div>
  )
}

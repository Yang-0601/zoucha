'use client'

import { useState } from 'react'
import clsx from 'clsx'
import {
  Columns2, SlidersHorizontal, Layers, CircleDot,
  Lock, Unlock, Ruler, Sparkles, GitCommitHorizontal, Pipette,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { CompareMode } from '@/types'
import { runAnalysis, abortAnalysis } from '@/lib/ai'
import AlignBar from './AlignBar'

const MODES: { mode: CompareMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'side-by-side',    label: '并排',  icon: <Columns2 size={13} strokeWidth={1.5} /> },
  { mode: 'slider',          label: '滑动',  icon: <SlidersHorizontal size={13} strokeWidth={1.5} /> },
  { mode: 'overlay-heatmap', label: '叠加',  icon: <Layers size={13} strokeWidth={1.5} /> },
  { mode: 'overlap',         label: '重叠',  icon: <CircleDot size={13} strokeWidth={1.5} /> },
]

/* Thin icon-text toolbar button */
function TBtn({
  active, disabled, onClick, children, title,
}: {
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
      style={{
        fontSize: 13,
        color: disabled ? '#C4B99A' : active ? '#252525' : '#8A8680',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
      }}
      onMouseOver={e => { if (!disabled) e.currentTarget.style.color = '#252525' }}
      onMouseOut={e => { if (!disabled) e.currentTarget.style.color = active ? '#252525' : '#8A8680' }}
    >
      {children}
    </button>
  )
}

export default function Toolbar() {
  const {
    compareMode, setCompareMode,
    syncLockedMap, setSyncLocked,
    showRuler, toggleRuler,
    showGuides, toggleGuides,
    analysisRunning,
  } = useAppStore()

  const [pickedColor, setPickedColor] = useState<string | null>(null)

  async function handleEyedropper() {
    if (!('EyeDropper' in window)) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dropper = new (window as any).EyeDropper()
      const result: { sRGBHex: string } = await dropper.open()
      await navigator.clipboard.writeText(result.sRGBHex)
      setPickedColor(result.sRGBHex)
      setTimeout(() => setPickedColor(null), 2000)
    } catch {
      // user cancelled
    }
  }

  const syncLocked = (compareMode === 'overlay-heatmap' || compareMode === 'overlap')
    ? syncLockedMap[compareMode]
    : true

  const showAlign = !syncLocked && (compareMode === 'overlay-heatmap' || compareMode === 'overlap')

  return (
    <div
      className="shrink-0 flex items-center gap-1 px-4"
      style={{ height: 40, borderBottom: '1px solid #E5E2DC', background: '#F7F4EE' }}
    >
      {/* Mode switcher — segmented */}
      <div
        className="flex items-center"
        style={{ gap: 1, background: '#EDE9E1', borderRadius: 7, padding: 3 }}
      >
        {MODES.map(({ mode, label, icon }) => {
          const active = compareMode === mode
          return (
            <button
              key={mode}
              title={label}
              onClick={() => setCompareMode(mode)}
              className="flex items-center gap-1 transition-all duration-150 focus-visible:outline focus-visible:outline-2"
              style={{
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? '#252525' : '#8A8680',
                background: active ? '#F7F4EE' : 'transparent',
                border: active ? '1px solid #E5E2DC' : '1px solid transparent',
                borderRadius: 5,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      <div style={{ width: 1, height: 14, background: '#E5E2DC', margin: '0 4px' }} />

      {/* Sync lock */}
      {(() => {
        const forced = compareMode === 'side-by-side' || compareMode === 'slider'
        return (
          <TBtn
            title={forced ? '该模式始终同步' : syncLocked ? '同步锁：开启' : '同步锁：关闭'}
            active={syncLocked || forced}
            disabled={forced}
            onClick={() => !forced && setSyncLocked(!syncLocked)}
          >
            {syncLocked || forced ? <Lock size={12} /> : <Unlock size={12} />}
            <span className="hidden md:inline">同步锁</span>
          </TBtn>
        )
      })()}

      <TBtn title="切换标尺 (Ctrl+R)" active={showRuler} onClick={toggleRuler}>
        <Ruler size={12} />
        <span className="hidden md:inline">标尺</span>
      </TBtn>

      <TBtn title={showGuides ? '隐藏参考线' : '显示参考线'} active={showGuides} onClick={toggleGuides}>
        <GitCommitHorizontal size={12} />
        <span className="hidden md:inline">参考线</span>
      </TBtn>

      <TBtn title="吸色（自动复制色值）" active={!!pickedColor} onClick={handleEyedropper}>
        {pickedColor
          ? <span style={{ width: 10, height: 10, borderRadius: 2, background: pickedColor, border: '1px solid #D7D5D1', flexShrink: 0, display: 'inline-block' }} />
          : <Pipette size={12} />
        }
        <span className="hidden md:inline">{pickedColor ?? '吸色'}</span>
      </TBtn>

      {showAlign && (
        <>
          <div style={{ width: 1, height: 14, background: '#E5E2DC', margin: '0 4px' }} />
          <AlignBar />
        </>
      )}

      <div className="flex-1" />

      {/* AI run */}
      <button
        disabled={false}
        onClick={() => analysisRunning ? abortAnalysis() : runAnalysis()}
        className={clsx(
          'flex items-center gap-1.5 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
        )}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: analysisRunning ? '#8A8680' : '#F7F4EE',
          background: analysisRunning ? '#EDE9E1' : '#252525',
          borderRadius: 7,
          padding: '6px 14px',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseOver={e => { e.currentTarget.style.background = analysisRunning ? '#E0DDD5' : '#3D3A36' }}
        onMouseOut={e => { e.currentTarget.style.background = analysisRunning ? '#EDE9E1' : '#252525' }}
      >
        <Sparkles size={12} strokeWidth={1.5} />
        {analysisRunning ? '停止分析' : 'AI 分析'}
      </button>
    </div>
  )
}

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Settings,
  RotateCcw,
  Printer,
  CheckCircle2,
  AlertCircle,
  Info,
  Lightbulb,
  Loader2,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { generateQuestions, generateReport } from '@/lib/ai/review'
import { saveAuditReport } from '@/lib/db'
import type { AuditFinding, AuditSeverity, ReviewAnswer } from '@/types'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  paper:    '#F7F4EE',
  warm:     '#EDE9E1',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  smoke:    '#D7D5D1',
  border:   '#E5E2DC',
  gold:     '#D9C8A0',
  red:      '#B85C5C',
}

// ── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_ORDER: AuditSeverity[] = ['critical', 'major', 'minor', 'suggestion']

const SEVERITY_LABEL: Record<AuditSeverity, string> = {
  critical:   '严重',
  major:      '重要',
  minor:      '轻微',
  suggestion: '建议',
}

const SEVERITY_COLOR: Record<AuditSeverity, string> = {
  critical:   '#B85C5C',
  major:      '#C4844A',
  minor:      '#8A8680',
  suggestion: '#6B8FA3',
}

const SEVERITY_ICON: Record<AuditSeverity, React.ReactNode> = {
  critical:   <AlertCircle size={13} strokeWidth={1.8} />,
  major:      <AlertCircle size={13} strokeWidth={1.8} />,
  minor:      <Info size={13} strokeWidth={1.8} />,
  suggestion: <Lightbulb size={13} strokeWidth={1.8} />,
}

// ── Base64 helper ─────────────────────────────────────────────────────────────

async function imageFileToBase64(imgFile: import('@/types').ImageFile): Promise<string> {
  if (imgFile.width <= 1200) {
    const res = await fetch(imgFile.url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = 1200 / img.naturalWidth
      const h = Math.round(img.naturalHeight * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, 1200, h)
      resolve(canvas.toDataURL('image/png').split(',')[1])
    }
    img.onerror = reject
    img.src = imgFile.url
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSpinner({ phase, progress }: { phase: string; progress?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: 320 }}>
      <Loader2
        size={32}
        strokeWidth={1.5}
        style={{ color: T.mist, animation: 'spin 1s linear infinite' }}
      />
      <p style={{ fontSize: 13, color: T.mist, letterSpacing: '0.02em' }}>{phase || '处理中…'}</p>
      {progress !== undefined && progress > 0 && (
        <div
          style={{
            width: 200,
            height: 3,
            background: T.border,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: T.charcoal,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  )
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  const color = SEVERITY_COLOR[finding.severity]
  const label = SEVERITY_LABEL[finding.severity]
  const icon  = SEVERITY_ICON[finding.severity]

  return (
    <div
      style={{
        background: T.paper,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Top row: severity badge + heuristic pill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="flex items-center gap-1"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color,
            background: `${color}18`,
            borderRadius: 4,
            padding: '2px 7px',
          }}
        >
          {icon}
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: T.mist,
            background: T.warm,
            borderRadius: 4,
            padding: '2px 7px',
          }}
        >
          H{finding.heuristicIndex} · {finding.heuristic}
        </span>
        {finding.affectedArea && (
          <span
            style={{
              fontSize: 11,
              color: T.mist,
              background: T.warm,
              borderRadius: 4,
              padding: '2px 7px',
            }}
          >
            {finding.affectedArea}
          </span>
        )}
      </div>

      {/* Title */}
      <p style={{ fontSize: 14, fontWeight: 600, color: T.charcoal, lineHeight: 1.4 }}>
        {finding.title}
      </p>

      {/* Description */}
      <p style={{ fontSize: 13, color: T.mist, lineHeight: 1.65 }}>
        {finding.description}
      </p>

      {/* Recommendation */}
      <div
        style={{
          background: `${color}0c`,
          borderLeft: `3px solid ${color}40`,
          borderRadius: 4,
          padding: '8px 12px',
          display: 'flex',
          gap: 6,
          alignItems: 'flex-start',
        }}
      >
        <Lightbulb size={13} strokeWidth={1.5} style={{ color, flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.65 }}>
          <span style={{ fontWeight: 600 }}>建议修复：</span>
          {finding.recommendation}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReviewWorkbench({
  projectId,
  versionId,
}: {
  projectId?: string
  versionId?: string
}) {
  const router = useRouter()

  const {
    reviewImages,
    reviewQuestions,
    reviewAnswers,
    auditReport,
    reviewRunning,
    reviewPhase,
    reviewProgress,
    aiConfigs,
    activeAIConfigId,
    setShowAIConfigModal,
    setReviewQuestions,
    setReviewAnswers,
    updateReviewAnswer,
    setAuditReport,
    setReviewRunning,
    setReviewPhase,
    setReviewProgress,
  } = useAppStore()

  // Flow step: 'questions' | 'analyzing' | 'report'
  const [step, setStep] = useState<'questions' | 'analyzing' | 'report'>('questions')
  const [questionError, setQuestionError] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  // Custom options state for each question id
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({})
  const [customInputVisible, setCustomInputVisible] = useState<Record<string, boolean>>({})
  const [customInputValue, setCustomInputValue] = useState<Record<string, string>>({})

  const abortRef = useRef<AbortController | null>(null)
  const hasStarted = useRef(false)

  const uploadBase = projectId && versionId
    ? `/project/${projectId}/version/${versionId}`
    : '/'

  // Get active AI config
  const aiConfig = aiConfigs.find(c => c.id === activeAIConfigId) ?? aiConfigs[0]

  // On mount: redirect if no images; else start question generation
  useEffect(() => {
    if (reviewImages.length === 0) {
      router.replace(uploadBase)
      return
    }
    if (hasStarted.current) return
    hasStarted.current = true

    // If questions already loaded (e.g. back-navigated), show questionnaire
    if (reviewQuestions.length > 0 && !auditReport) {
      setStep('questions')
      return
    }
    // If report already exists, show it
    if (auditReport) {
      setStep('report')
      return
    }

    // Start generating questions
    startGenerateQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startGenerateQuestions() {
    if (!aiConfig) {
      setShowAIConfigModal(true)
      return
    }

    setReviewRunning(true)
    setReviewPhase('准备图片…')
    setReviewProgress(10)
    setQuestionError(null)

    try {
      setReviewPhase('转换图片…')
      setReviewProgress(20)
      const base64s = await Promise.all(reviewImages.map(imageFileToBase64))

      setReviewPhase('生成问卷…')
      setReviewProgress(40)
      const questions = await generateQuestions(base64s, aiConfig)

      if (!questions || questions.length === 0) {
        throw new Error('AI 未返回有效问卷，请重试')
      }

      setReviewProgress(100)
      setReviewQuestions(questions)
      setReviewAnswers([])
    } catch (err) {
      console.error('[ReviewWorkbench] generateQuestions error:', err)
      setQuestionError((err as Error).message || '问卷生成失败，请重试')
    } finally {
      setReviewRunning(false)
      setReviewPhase('')
      setReviewProgress(0)
    }
  }

  async function startAnalysis() {
    if (!aiConfig) {
      setShowAIConfigModal(true)
      return
    }

    setStep('analyzing')
    setReviewRunning(true)
    setReviewPhase('准备图片…')
    setReviewProgress(5)
    setReportError(null)

    abortRef.current = new AbortController()

    try {
      setReviewPhase('转换图片…')
      setReviewProgress(10)
      const base64s = await Promise.all(reviewImages.map(imageFileToBase64))

      const report = await generateReport(
        base64s,
        reviewQuestions,
        reviewAnswers,
        aiConfig,
        {
          onProgress: (pct, phase) => {
            setReviewProgress(pct)
            setReviewPhase(phase)
          },
          signal: abortRef.current.signal,
        },
      )

      // Attach versionId
      const finalReport = versionId ? { ...report, versionId } : report

      setAuditReport(finalReport)

      // Persist to IndexedDB if we have a versionId
      if (versionId) {
        try {
          await saveAuditReport(finalReport)
        } catch (e) {
          console.warn('[ReviewWorkbench] saveAuditReport failed:', e)
        }
      }

      setStep('report')
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStep('questions')
      } else {
        console.error('[ReviewWorkbench] generateReport error:', err)
        setReportError((err as Error).message || '分析失败，请重试')
        setStep('analyzing') // keep in analyzing step to show error
      }
    } finally {
      setReviewRunning(false)
      setReviewPhase('')
      setReviewProgress(0)
      abortRef.current = null
    }
  }

  function handleRestart() {
    setAuditReport(null)
    setStep('questions')
    setReportError(null)
  }

  // ── Answer helpers ──────────────────────────────────────────────────────────

  function getAnswer(questionId: string): ReviewAnswer {
    return reviewAnswers.find(a => a.questionId === questionId) ?? { questionId, selected: [] }
  }

  function toggleSingle(questionId: string, option: string) {
    updateReviewAnswer(questionId, [option])
  }

  function toggleMulti(questionId: string, option: string) {
    const current = getAnswer(questionId).selected
    const next = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option]
    updateReviewAnswer(questionId, next)
  }

  function handleTextAnswer(questionId: string, value: string) {
    updateReviewAnswer(questionId, value ? [value] : [])
  }

  function addCustomOption(questionId: string) {
    const val = (customInputValue[questionId] ?? '').trim()
    if (!val) return
    setCustomOptions(prev => ({
      ...prev,
      [questionId]: [...(prev[questionId] ?? []), val],
    }))
    setCustomInputValue(prev => ({ ...prev, [questionId]: '' }))
    setCustomInputVisible(prev => ({ ...prev, [questionId]: false }))
    // Auto-select the newly added custom option
    const current = getAnswer(questionId).selected
    updateReviewAnswer(questionId, [...current, val])
  }

  // Validate all required questions answered
  function allAnswered() {
    return reviewQuestions.every(q => {
      const ans = getAnswer(q.id)
      return ans.selected.length > 0
    })
  }

  // ── Grouped findings ────────────────────────────────────────────────────────

  const groupedFindings = SEVERITY_ORDER.reduce<Record<AuditSeverity, AuditFinding[]>>(
    (acc, sev) => {
      acc[sev] = (auditReport?.findings ?? []).filter(f => f.severity === sev)
      return acc
    },
    { critical: [], major: [], minor: [], suggestion: [] },
  )

  // ── Header ──────────────────────────────────────────────────────────────────

  const Header = () => (
    <header
      className="shrink-0 flex items-center justify-between px-10"
      style={{ height: 56, borderBottom: `1px solid ${T.border}`, backgroundColor: T.paper }}
    >
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div
          className="flex items-center justify-center"
          style={{ width: 28, height: 28, background: T.charcoal, borderRadius: 6 }}
        >
          <span style={{ color: T.paper, fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>
            DI
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.charcoal, letterSpacing: '-0.01em' }}>
          设计走查
        </span>
        <span style={{ fontSize: 11, color: T.smoke, marginLeft: 2 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>设计评审</span>

        {/* Back button */}
        <span style={{ fontSize: 11, color: T.smoke, marginLeft: 6 }}>/</span>
        <button
          onClick={() => router.push(uploadBase)}
          className="flex items-center gap-1 transition-colors duration-150"
          style={{ fontSize: 12, color: T.mist, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
          onMouseOut={e => (e.currentTarget.style.color = T.mist)}
        >
          <ChevronLeft size={13} strokeWidth={1.5} />
          返回上传
        </button>
      </div>

      <button
        onClick={() => setShowAIConfigModal(true)}
        aria-label="AI 模型配置"
        className="flex items-center gap-1.5 transition-colors duration-150"
        style={{ fontSize: 12, color: T.mist }}
        onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
        onMouseOut={e => (e.currentTarget.style.color = T.mist)}
      >
        <Settings size={13} strokeWidth={1.5} />
        AI 配置
      </button>
    </header>
  )

  // ── Image preview row ───────────────────────────────────────────────────────

  const ImageStrip = () => (
    <div
      className="flex gap-3 overflow-x-auto shrink-0"
      style={{
        padding: '12px 0 8px',
        borderBottom: `1px solid ${T.border}`,
        scrollbarWidth: 'none',
      }}
    >
      {reviewImages.map((img, i) => (
        <img
          key={i}
          src={img.url}
          alt={`review-image-${i + 1}`}
          style={{
            maxHeight: 80,
            width: 'auto',
            borderRadius: 6,
            border: `1px solid ${T.border}`,
            flexShrink: 0,
            objectFit: 'contain',
          }}
        />
      ))}
    </div>
  )

  // ── Questionnaire ───────────────────────────────────────────────────────────

  const Questionnaire = () => (
    <div className="flex flex-col gap-8" style={{ maxWidth: 680, width: '100%' }}>
      <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.charcoal, letterSpacing: '-0.02em' }}>
          评审问卷
        </h2>
        <p style={{ fontSize: 13, color: T.mist, marginTop: 6, lineHeight: 1.7 }}>
          请回答以下问题，帮助 AI 更准确地评估界面可用性
        </p>
      </div>

      {reviewQuestions.map((q, qi) => {
        const ans = getAnswer(q.id)
        const extras = customOptions[q.id] ?? []
        const allOptions = [...q.options, ...extras]

        return (
          <div key={q.id} className="flex flex-col gap-3">
            <p style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.5 }}>
              <span style={{ color: T.mist, marginRight: 6, fontWeight: 400 }}>{qi + 1}.</span>
              {q.text}
            </p>

            {q.type === 'text' ? (
              <textarea
                rows={3}
                value={ans.selected[0] ?? ''}
                onChange={e => handleTextAnswer(q.id, e.target.value)}
                placeholder="请输入你的回答…"
                style={{
                  width: '100%',
                  resize: 'vertical',
                  background: T.warm,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: T.ink,
                  outline: 'none',
                  lineHeight: 1.6,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = T.charcoal)}
                onBlur={e => (e.currentTarget.style.borderColor = T.border)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {allOptions.map(opt => {
                  const selected = q.type === 'single'
                    ? ans.selected[0] === opt
                    : ans.selected.includes(opt)
                  return (
                    <button
                      key={opt}
                      onClick={() => q.type === 'single' ? toggleSingle(q.id, opt) : toggleMulti(q.id, opt)}
                      style={{
                        fontSize: 12,
                        fontWeight: selected ? 600 : 400,
                        color: selected ? T.paper : T.ink,
                        background: selected ? T.charcoal : T.warm,
                        border: `1px solid ${selected ? T.charcoal : T.border}`,
                        borderRadius: 20,
                        padding: '6px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseOver={e => {
                        if (!selected) {
                          e.currentTarget.style.borderColor = T.charcoal
                        }
                      }}
                      onMouseOut={e => {
                        if (!selected) {
                          e.currentTarget.style.borderColor = T.border
                        }
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}

                {/* Custom option input */}
                {q.allowCustom && (
                  customInputVisible[q.id] ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={customInputValue[q.id] ?? ''}
                        onChange={e => setCustomInputValue(prev => ({ ...prev, [q.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') addCustomOption(q.id)
                          if (e.key === 'Escape') setCustomInputVisible(prev => ({ ...prev, [q.id]: false }))
                        }}
                        placeholder="自定义选项…"
                        style={{
                          fontSize: 12,
                          color: T.ink,
                          background: T.warm,
                          border: `1px solid ${T.charcoal}`,
                          borderRadius: 20,
                          padding: '5px 12px',
                          outline: 'none',
                          width: 120,
                        }}
                      />
                      <button
                        onClick={() => addCustomOption(q.id)}
                        style={{
                          fontSize: 11,
                          color: T.paper,
                          background: T.charcoal,
                          border: 'none',
                          borderRadius: 4,
                          padding: '5px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        确认
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCustomInputVisible(prev => ({ ...prev, [q.id]: true }))}
                      style={{
                        fontSize: 12,
                        color: T.mist,
                        background: 'transparent',
                        border: `1px dashed ${T.smoke}`,
                        borderRadius: 20,
                        padding: '5px 12px',
                        cursor: 'pointer',
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.color = T.ink
                        e.currentTarget.style.borderColor = T.charcoal
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.color = T.mist
                        e.currentTarget.style.borderColor = T.smoke
                      }}
                    >
                      + 添加选项
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* CTA */}
      <div className="flex items-center gap-3 pt-2">
        <button
          disabled={!allAnswered()}
          onClick={startAnalysis}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: allAnswered() ? T.paper : '#C4B99A',
            background: allAnswered() ? T.charcoal : T.smoke,
            border: 'none',
            borderRadius: 8,
            padding: '11px 24px',
            cursor: allAnswered() ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
          onMouseOver={e => { if (allAnswered()) e.currentTarget.style.background = T.ink }}
          onMouseOut={e => { if (allAnswered()) e.currentTarget.style.background = T.charcoal }}
        >
          开始分析
        </button>
        {!allAnswered() && (
          <span style={{ fontSize: 12, color: '#C4B99A' }}>请回答所有问题后继续</span>
        )}
      </div>
    </div>
  )

  // ── Report view ─────────────────────────────────────────────────────────────

  const ReportView = () => {
    if (!auditReport) return null
    const { score, summary, findings } = auditReport

    return (
      <div className="flex flex-col gap-10" style={{ maxWidth: 720, width: '100%' }}>
        {/* Score card */}
        <div
          style={{
            background: T.warm,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 28,
          }}
        >
          <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
            <span style={{ fontSize: 52, fontWeight: 700, color: T.charcoal, lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: 11, color: T.mist, marginTop: 6, letterSpacing: '0.03em' }}>
              可用性评分
            </span>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            {/* Score bar */}
            <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${score}%`,
                  background: score >= 80 ? '#6B8FA3' : score >= 60 ? T.gold : T.red,
                  borderRadius: 3,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
            <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.7 }}>{summary}</p>
          </div>
        </div>

        {/* Severity summary chips */}
        <div className="flex gap-3 flex-wrap">
          {SEVERITY_ORDER.map(sev => {
            const count = groupedFindings[sev].length
            if (count === 0) return null
            const color = SEVERITY_COLOR[sev]
            return (
              <div
                key={sev}
                className="flex items-center gap-1.5"
                style={{
                  fontSize: 12,
                  color,
                  background: `${color}15`,
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontWeight: 500,
                }}
              >
                {SEVERITY_ICON[sev]}
                {SEVERITY_LABEL[sev]} · {count}
              </div>
            )
          })}
          {findings.length === 0 && (
            <div
              className="flex items-center gap-1.5"
              style={{ fontSize: 12, color: '#6B8FA3', padding: '4px 0' }}
            >
              <CheckCircle2 size={13} strokeWidth={1.5} />
              未发现可用性问题
            </div>
          )}
        </div>

        {/* Findings grouped by severity */}
        {SEVERITY_ORDER.map(sev => {
          const group = groupedFindings[sev]
          if (group.length === 0) return null
          return (
            <div key={sev} className="flex flex-col gap-3">
              <div
                className="flex items-center gap-2"
                style={{ paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: SEVERITY_COLOR[sev],
                  }}
                >
                  {SEVERITY_LABEL[sev]}问题
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: SEVERITY_COLOR[sev],
                    background: `${SEVERITY_COLOR[sev]}15`,
                    borderRadius: 10,
                    padding: '1px 7px',
                  }}
                >
                  {group.length}
                </span>
              </div>
              {group.map(finding => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          )
        })}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: T.ink,
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: '10px 18px',
              cursor: 'pointer',
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.borderColor = T.border)}
          >
            <RotateCcw size={13} strokeWidth={1.5} />
            重新分析
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.paper,
              background: T.charcoal,
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              cursor: 'pointer',
            }}
            onMouseOver={e => (e.currentTarget.style.background = T.ink)}
            onMouseOut={e => (e.currentTarget.style.background = T.charcoal)}
          >
            <Printer size={13} strokeWidth={1.5} />
            导出报告
          </button>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          header, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ backgroundColor: T.paper }}>
        <Header />

        <main className="flex-1 flex flex-col items-center px-8 py-10">
          <div className="w-full flex flex-col gap-6" style={{ maxWidth: 760 }}>
            {/* Image strip */}
            <ImageStrip />

            {/* Content area */}
            {step === 'questions' && (
              <>
                {reviewRunning ? (
                  <LoadingSpinner phase={reviewPhase} progress={reviewProgress} />
                ) : questionError ? (
                  <div
                    className="flex flex-col items-center gap-4"
                    style={{ minHeight: 240, justifyContent: 'center' }}
                  >
                    <AlertCircle size={28} strokeWidth={1.5} style={{ color: T.red }} />
                    <p style={{ fontSize: 13, color: T.red, maxWidth: 400, textAlign: 'center' }}>
                      {questionError}
                    </p>
                    <button
                      onClick={() => { hasStarted.current = false; setQuestionError(null); startGenerateQuestions() }}
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.ink,
                        background: T.warm,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '9px 18px',
                        cursor: 'pointer',
                      }}
                    >
                      重新生成
                    </button>
                  </div>
                ) : reviewQuestions.length > 0 ? (
                  <Questionnaire />
                ) : null}
              </>
            )}

            {step === 'analyzing' && (
              <>
                {reportError ? (
                  <div
                    className="flex flex-col items-center gap-4"
                    style={{ minHeight: 240, justifyContent: 'center' }}
                  >
                    <AlertCircle size={28} strokeWidth={1.5} style={{ color: T.red }} />
                    <p style={{ fontSize: 13, color: T.red, maxWidth: 400, textAlign: 'center' }}>
                      {reportError}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('questions')}
                        style={{
                          fontSize: 13,
                          color: T.ink,
                          background: T.warm,
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          padding: '9px 18px',
                          cursor: 'pointer',
                        }}
                      >
                        返回问卷
                      </button>
                      <button
                        onClick={() => { setReportError(null); startAnalysis() }}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: T.paper,
                          background: T.charcoal,
                          border: 'none',
                          borderRadius: 8,
                          padding: '9px 18px',
                          cursor: 'pointer',
                        }}
                      >
                        重新分析
                      </button>
                    </div>
                  </div>
                ) : (
                  <LoadingSpinner phase={reviewPhase} progress={reviewProgress} />
                )}
              </>
            )}

            {step === 'report' && <ReportView />}
          </div>
        </main>
      </div>
    </>
  )
}

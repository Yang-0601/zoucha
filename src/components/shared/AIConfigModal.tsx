'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store'
import { AIModelConfig, AIProvider } from '@/types'

const T = {
  paper:    '#F7F4EE',
  wood:     '#D9C8A0',
  warm:     '#EDE9E1',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  smoke:    '#D7D5D1',
  border:   '#E5E2DC',
  moss:     '#6B7A5E',
}

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai',    label: 'OpenAI' },
  { value: 'google',    label: 'Google' },
  { value: 'zhipu',     label: '智谱 AI' },
  { value: 'custom',    label: '自定义' },
]

const PROVIDER_DEFAULT_BASE_URL: Partial<Record<AIProvider, string>> = {
  google: 'https://generativelanguage.googleapis.com',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
}

const MODEL_PRESETS: Record<AIProvider, string[]> = {
  anthropic: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-3-5-sonnet-20241022'],
  openai:    ['gpt-4o', 'gpt-4-turbo', 'gpt-4-vision-preview'],
  google:    [
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro',
    'gemini-1.0-flash',
  ],
  zhipu:     ['glm-4.6v-flash', 'glm-4v-flash', 'glm-4v-plus', 'glm-4v'],
  custom:    [],
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, color: T.mist, marginBottom: 4, letterSpacing: '0.06em' }}>
      {children}
    </p>
  )
}

function WasiSelect({
  value, onChange, children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', fontSize: 12, color: T.charcoal,
        background: T.warm, border: `1px solid ${T.border}`,
        borderRadius: 6, padding: '6px 10px',
        outline: 'none', cursor: 'pointer',
      }}
    >
      {children}
    </select>
  )
}

function WasiInput({
  value, onChange, placeholder, type = 'text', style: extra,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  style?: React.CSSProperties
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', fontSize: 12, color: T.charcoal,
        background: T.warm, border: `1px solid ${T.border}`,
        borderRadius: 6, padding: '6px 10px', outline: 'none',
        transition: 'border-color 150ms',
        ...extra,
      }}
      onFocus={e => (e.currentTarget.style.borderColor = T.charcoal)}
      onBlur={e => (e.currentTarget.style.borderColor = T.border)}
    />
  )
}

function ConfigCard({
  config, isActive, onActivate, onRemove, onChange,
}: {
  config: AIModelConfig
  isActive: boolean
  onActivate: () => void
  onRemove: () => void
  onChange: (patch: Partial<AIModelConfig>) => void
}) {
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMsg, setTestMsg] = useState('')

  const handleTest = async () => {
    if (!config.apiKey) { setTestStatus('fail'); setTestMsg('请先填写 API Key'); return }
    if (!config.modelName) { setTestStatus('fail'); setTestMsg('请先选择模型'); return }
    setTestStatus('testing')
    setTestMsg('')

    try {
      // 直接从浏览器端测试 Gemini API 连通性
      if (config.provider === 'google') {
        const base = (config.baseUrl?.trim() || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
        const useApiKey = /^AIza[0-9A-Za-z_-]+$/.test(config.apiKey)
        const url = useApiKey
          ? `${base}/v1beta/models/${encodeURIComponent(config.modelName)}?key=${encodeURIComponent(config.apiKey)}`
          : `${base}/v1beta/models/${encodeURIComponent(config.modelName)}`
        const headers: Record<string, string> = {}
        if (!useApiKey) headers.Authorization = `Bearer ${config.apiKey}`

        const res = await fetch(url, { headers })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const msg = data?.error?.message ?? `${res.status}`
          setTestStatus('fail')
          setTestMsg(
            msg.includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('api key') ? 'API Key 无效' :
            msg.includes('403') ? '无权限' :
            `连接失败：${msg}`
          )
          return
        }
        setTestStatus('ok')
        setTestMsg('连接正常')
        return
      }

      // 其他 provider 继续使用服务端测试
      const res = await fetch('/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: config.apiKey,
          modelName: config.modelName,
          baseUrl: config.baseUrl,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.error ?? `${res.status}`
        setTestStatus('fail')
        setTestMsg(
          msg.includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('api key') ? 'API Key 无效' :
          msg.includes('403') ? '无权限' :
          `连接失败：${msg}`
        )
        return
      }
      setTestStatus('ok')
      setTestMsg('连接正常')
    } catch (e: unknown) {
      setTestStatus('fail')
      const msg = e instanceof Error ? e.message : String(e)
      setTestMsg(`连接失败：${msg}`)
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${isActive ? T.charcoal : T.border}`,
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: isActive ? T.warm : T.paper,
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onActivate}
          aria-label="设为当前模型"
          style={{
            width: 14, height: 14,
            borderRadius: '50%',
            border: `2px solid ${isActive ? T.charcoal : T.smoke}`,
            background: isActive ? T.charcoal : 'transparent',
            cursor: 'pointer', flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: T.charcoal }}>
          {PROVIDERS.find(p => p.value === config.provider)?.label ?? '自定义'}
          {config.modelName && (
            <span style={{ color: T.mist, fontWeight: 400 }}> · {config.modelName}</span>
          )}
        </span>
        {isActive && <span style={{ fontSize: 10, color: T.mist }}>当前</span>}
        <button
          onClick={onRemove}
          aria-label="删除配置"
          style={{ color: T.smoke, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
          onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
          onMouseOut={e => (e.currentTarget.style.color = T.smoke)}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Grid: provider + model */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <FieldLabel>提供商</FieldLabel>
          <WasiSelect
            value={config.provider}
            onChange={v => {
                const p = v as AIProvider
                onChange({ provider: p, modelName: '', baseUrl: PROVIDER_DEFAULT_BASE_URL[p] })
              }}
          >
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </WasiSelect>
        </div>
        <div>
          <FieldLabel>模型</FieldLabel>
          {config.provider === 'custom' ? (
            <WasiInput value={config.modelName} onChange={v => onChange({ modelName: v })} placeholder="模型 ID" />
          ) : (
            <>
              <WasiSelect value={config.modelName} onChange={v => onChange({ modelName: v })}>
                <option value="">选择模型</option>
                {MODEL_PRESETS[config.provider].map(m => <option key={m} value={m}>{m}</option>)}
              </WasiSelect>
              {config.provider === 'google' && (
                <p style={{ fontSize: 10, color: T.mist, marginTop: 6, lineHeight: 1.4 }}>
                  Google Gemini 模型请使用官方模型名称，推荐：gemini-2.5-pro-preview-05-06 / gemini-2.5-flash-preview-04-17。
                  API Key 需为 Google Cloud API key（例如以 AIza 开头），也支持 OAuth Bearer token。
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* API Key */}
      <div>
        <FieldLabel>API Key</FieldLabel>
        <div className="flex gap-1.5">
          <WasiInput
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={v => onChange({ apiKey: v })}
            placeholder="sk-..."
            style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{
              fontSize: 11, color: T.mist, whiteSpace: 'nowrap',
              background: T.warm, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: '0 10px', cursor: 'pointer',
            }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.mist)}
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      {/* Base URL — custom only */}
      {config.provider === 'custom' && (
        <div>
          <FieldLabel>Base URL</FieldLabel>
          <WasiInput
            value={config.baseUrl ?? ''}
            onChange={v => onChange({ baseUrl: v })}
            placeholder="https://api.example.com/v1"
          />
        </div>
      )}

      {/* Precision + Language */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <FieldLabel>分析精度</FieldLabel>
          <WasiSelect
            value={config.precision}
            onChange={v => onChange({ precision: v as AIModelConfig['precision'] })}
          >
            <option value="low">低（快）</option>
            <option value="standard">标准</option>
            <option value="high">高（慢）</option>
          </WasiSelect>
        </div>
        <div>
          <FieldLabel>返回语言</FieldLabel>
          <WasiSelect
            value={config.language}
            onChange={v => onChange({ language: v as AIModelConfig['language'] })}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </WasiSelect>
        </div>
      </div>

      {/* Custom prompt */}
      <div>
        <FieldLabel>自定义 Prompt（可选）</FieldLabel>
        <textarea
          rows={7}
          placeholder="如：重点关注按钮颜色一致性…"
          value={config.customPrompt ?? ''}
          onChange={e => onChange({ customPrompt: e.target.value })}
          style={{
            width: '100%', fontSize: 12, color: T.charcoal,
            background: T.warm, border: `1px solid ${T.border}`,
            borderRadius: 6, padding: '6px 10px', outline: 'none',
            resize: 'none', lineHeight: 1.6,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = T.charcoal)}
          onBlur={e => (e.currentTarget.style.borderColor = T.border)}
        />
      </div>

      {/* Test connection */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTest}
          disabled={testStatus === 'testing'}
          className="flex items-center gap-1.5 transition-colors duration-150"
          style={{
            fontSize: 11, color: testStatus === 'ok' ? T.moss : T.mist,
            background: 'none', border: `1px solid ${T.border}`,
            borderRadius: 5, padding: '5px 12px', cursor: 'pointer',
          }}
          onMouseOver={e => (e.currentTarget.style.borderColor = T.mist)}
          onMouseOut={e => (e.currentTarget.style.borderColor = T.border)}
        >
          {testStatus === 'testing' && <Loader2 size={11} className="animate-spin" />}
          {testStatus === 'testing' ? '测试中…' : '测试连接'}
        </button>
        {testMsg && (
          <span style={{ fontSize: 10, color: testStatus === 'ok' ? T.moss : '#B85C5C' }}>
            {testMsg}
          </span>
        )}
      </div>
    </div>
  )
}

export default function AIConfigModal() {
  const {
    showAIConfigModal, setShowAIConfigModal,
    aiConfigs, addAIConfig, updateAIConfig, removeAIConfig,
    activeAIConfigId, setActiveAIConfig,
    confidenceThreshold, setConfidenceThreshold,
  } = useAppStore()

  if (!showAIConfigModal) return null

  const DEFAULT_PROMPT =
`请逐项精细对比两张图片的UI细节，重点分析以下维度：
1. 颜色：提供精确十六进制色值（如 #FF5733），注明设计稿色值 vs 实现色值的差异
2. 间距与位置：以像素为单位描述偏移方向和数值（如"距上边距少6px"、"按钮向右偏移4px"）
3. 字体：字号、字重、行高、字间距的具体数值偏差
4. 尺寸：元素宽高的像素差异（如"宽度多8px"）
5. 圆角与阴影：圆角半径及阴影参数的具体差异
6. 缺失或多余元素：明确说明哪个元素在实现中缺失或多余

要求：每条 description 必须用中文描述，包含具体数值，禁止模糊表达（如"稍微偏移"）。`

  const newConfig = (): AIModelConfig => ({
    id: crypto.randomUUID(),
    provider: 'anthropic',
    modelName: 'claude-sonnet-4-6',
    apiKey: '',
    precision: 'standard',
    language: 'zh',
    customPrompt: DEFAULT_PROMPT,
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(37,37,37,0.35)' }}
    >
      <div
        className="flex flex-col"
        style={{
          background: T.paper,
          width: '100%', maxWidth: 520,
          maxHeight: '88vh',
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          boxShadow: '0 8px 32px rgba(37,37,37,0.12)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center px-6 shrink-0"
          style={{ height: 52, borderBottom: `1px solid ${T.border}` }}
        >
          <h2 style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.charcoal }}>AI 模型配置</h2>
          <button
            onClick={() => setShowAIConfigModal(false)}
            aria-label="关闭"
            style={{ color: T.smoke, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.smoke)}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-5">

          {/* Confidence threshold */}
          <div
            className="flex items-center gap-4"
            style={{ background: T.warm, borderRadius: 8, padding: '12px 14px' }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: T.charcoal }}>置信度阈值</p>
              <p style={{ fontSize: 11, color: T.mist, marginTop: 2, lineHeight: 1.5 }}>
                低于此值的 AI 标注将自动隐藏
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={100}
                value={confidenceThreshold}
                onChange={e => setConfidenceThreshold(+e.target.value)}
                style={{ width: 80, accentColor: T.charcoal }}
              />
              <span style={{ fontSize: 12, color: T.charcoal, width: 32, textAlign: 'right' }}>
                {confidenceThreshold}%
              </span>
            </div>
          </div>

          {/* Model cards */}
          {aiConfigs.length === 0 && (
            <p style={{ fontSize: 12, color: T.mist, textAlign: 'center', padding: '24px 0' }}>
              尚未添加任何 AI 模型
            </p>
          )}
          {aiConfigs.map(c => (
            <ConfigCard
              key={c.id}
              config={c}
              isActive={activeAIConfigId === c.id}
              onActivate={() => setActiveAIConfig(c.id)}
              onRemove={() => removeAIConfig(c.id)}
              onChange={patch => updateAIConfig(c.id, patch)}
            />
          ))}

          {/* Add new */}
          {aiConfigs.length < 3 && (
            <button
              onClick={() => {
                const c = newConfig()
                addAIConfig(c)
                if (!activeAIConfigId) setActiveAIConfig(c.id)
              }}
              className="flex items-center justify-center gap-1.5 w-full transition-colors duration-150"
              style={{
                fontSize: 12, color: T.mist,
                border: `1px dashed ${T.smoke}`,
                borderRadius: 8, padding: '10px 0',
                background: 'transparent', cursor: 'pointer',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = T.mist; e.currentTarget.style.color = T.charcoal }}
              onMouseOut={e => { e.currentTarget.style.borderColor = T.smoke; e.currentTarget.style.color = T.mist }}
            >
              <Plus size={13} strokeWidth={1.5} />
              添加模型（最多 3 个）
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end px-6 py-4 shrink-0"
          style={{ borderTop: `1px solid ${T.border}` }}
        >
          <button
            onClick={() => setShowAIConfigModal(false)}
            className="transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              fontSize: 12, fontWeight: 500,
              color: T.paper, background: T.charcoal,
              borderRadius: 7, padding: '8px 22px',
              border: 'none', cursor: 'pointer',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#3D3A36')}
            onMouseOut={e => (e.currentTarget.style.background = T.charcoal)}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}

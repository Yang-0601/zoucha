'use client'

import { useState } from 'react'
import { X, Zap, Columns2, PenLine, Keyboard, Sparkles } from 'lucide-react'

const T = {
  paper:    '#F7F4EE',
  warm:     '#EDE9E1',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  smoke:    '#D7D5D1',
  border:   '#E5E2DC',
  gold:     '#D9C8A0',
  amber:    '#C49A45',
  moss:     '#6B7A5E',
  blue:     '#6B8FA3',
  red:      '#B85C5C',
}

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10,
      fontWeight: 700,
      color: T.mist,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: 10,
    }}>
      {children}
    </p>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.warm,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: '12px 14px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: T.charcoal,
      color: T.paper,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.02em',
      borderRadius: 4,
      padding: '2px 7px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// ── Tab contents ─────────────────────────────────────────────────────────────

function TabQuickStart() {
  const steps = [
    { n: '01', title: '上传图片', desc: '在上传页分别上传设计稿与线上截图，两张图会自动缩放至相同宽度确保对比一致。' },
    { n: '02', title: '选择比对模式', desc: '通过工具栏切换并排、滑动、叠加、重叠四种模式，找到最适合当前检查需求的视角。' },
    { n: '03', title: '标注差异', desc: '点击「AI 分析」自动识别差异并生成标注；或开启标注模式在画布上手动点击创建标注点。' },
    { n: '04', title: '核对详情', desc: '在右侧详情面板查看每处差异的类型、严重程度、设计值与实现值，并可手动修正。' },
    { n: '05', title: '导出报告', desc: '确认所有差异后，点击顶栏「导出报告」生成 PDF 格式的完整走查报告。' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.charcoal, lineHeight: 1.4 }}>五步完成一次走查</p>
        <p style={{ fontSize: 12, color: T.mist, marginTop: 4, lineHeight: 1.6 }}>从上传到导出报告，全流程只需几分钟</p>
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((s) => (
          <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: T.charcoal, color: T.paper,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              flexShrink: 0,
            }}>
              {s.n}
            </div>
            <div style={{ paddingTop: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 3 }}>{s.title}</p>
              <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabCompare() {
  const modes = [
    {
      name: '并排', tag: 'side-by-side',
      color: T.blue,
      desc: '左右并列显示设计稿与截图，适合整体布局、内容顺序和元素对比。两图始终同步滚动与缩放。',
      tips: ['同步锁在此模式下始终开启', '适合宽屏环境全局检查'],
    },
    {
      name: '滑动', tag: 'slider',
      color: T.moss,
      desc: '用竖向分割线逐步揭示两张图，左右拖动滑块可精准查看任意位置的差异。',
      tips: ['适合检查局部细节叠加区域', '分割线可拖到任意位置'],
    },
    {
      name: '叠加', tag: 'overlay-heatmap',
      color: T.amber,
      desc: '将两图透明叠加，通过调整不透明度和混合模式（差值/热图）快速定位偏移与色差。',
      tips: ['解锁同步锁可独立移动图层', '差值模式下纯黑区域表示完全一致'],
    },
    {
      name: '重叠', tag: 'overlap',
      color: T.red,
      desc: '两图完全重叠，可分别调整每层透明度，用方向键微调图层位置实现像素级对齐。',
      tips: ['方向键微移，Shift + 方向键 步进 10px', '适合精准校准间距与圆角'],
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.charcoal }}>四种比对视角</p>
        <p style={{ fontSize: 12, color: T.mist, marginTop: 4, lineHeight: 1.6 }}>按需切换，覆盖从宏观到像素级的所有检查场景</p>
      </div>

      {modes.map((m) => (
        <Card key={m.name}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: m.color,
              background: `${m.color}18`,
              borderRadius: 4, padding: '2px 8px',
            }}>
              {m.name}
            </span>
            <span style={{ fontSize: 10, color: T.smoke }}>#{m.tag}</span>
          </div>
          <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.65, marginBottom: 8 }}>{m.desc}</p>
          <div className="flex flex-col gap-1">
            {m.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: T.gold, fontSize: 12, lineHeight: '18px', flexShrink: 0 }}>·</span>
                <span style={{ fontSize: 11, color: T.mist, lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function TabAnnotation() {
  return (
    <div className="flex flex-col gap-5">
      <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.charcoal }}>标注与差异管理</p>
        <p style={{ fontSize: 12, color: T.mist, marginTop: 4, lineHeight: 1.6 }}>支持手动标注与 AI 自动标注，可在详情面板完整编辑每条差异</p>
      </div>

      {/* Annotation styles */}
      <div>
        <SectionTitle>标注样式</SectionTitle>
        <div className="flex flex-col gap-2">
          {[
            { style: 'A', bg: T.charcoal, title: '序号气泡', desc: '默认样式，点位序号气泡，不干扰画面内容，适合快速标记。' },
            { style: 'B', bg: T.amber,    title: '气泡 + 边框', desc: '在序号气泡基础上为差异区域绘制彩色边框，适合标注区域范围。' },
            { style: 'C', bg: '#9CA3AF',  title: '气泡 + 填充', desc: '在差异区域叠加半透明色块高亮，视觉影响最强，适合重点问题。' },
          ].map(({ style, bg, title, desc }) => (
            <Card key={style} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: bg, color: T.paper,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {style}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 3 }}>{title}</p>
                <p style={{ fontSize: 11, color: T.mist, lineHeight: 1.6 }}>{desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Manual annotation */}
      <div>
        <SectionTitle>手动标注</SectionTitle>
        <Card>
          <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.65 }}>
            在左侧差异列表顶部点击 <strong>「标注模式」</strong> 按钮激活，画布变为可点击状态。
            在设计稿上点击差异位置即可创建标注点；点亮后再次点击「标注模式」或按 <Key>Esc</Key> 退出。
          </p>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['标注模式中鼠标变为十字准星', '支持拖拽标注点调整位置', '支持框选差异区域（拖拽创建矩形框）'].map((t, i) => (
              <span key={i} style={{
                fontSize: 11, color: T.mist,
                background: T.paper, border: `1px solid ${T.border}`,
                borderRadius: 4, padding: '2px 8px',
              }}>
                {t}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Diff list features */}
      <div>
        <SectionTitle>差异列表操作</SectionTitle>
        <div className="flex flex-col gap-2">
          {[
            { name: '拖拽排序', desc: '拖动每行左侧手柄调整差异顺序，影响最终报告排序。' },
            { name: '筛选标签', desc: '顶部 全部 / AI / 手动 三个 Tab 快速过滤差异来源。' },
            { name: '批量删除', desc: '勾选多条差异后点击删除按钮一键清除。' },
            { name: '修复状态', desc: '对每条差异标记"已修复"或"忽略"，便于跟踪修复进度。' },
            { name: '置信度筛选', desc: '拖动工具栏置信度滑块，只显示高于阈值的 AI 差异。' },
          ].map((item) => (
            <div key={item.name} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              paddingBottom: 8, borderBottom: `1px solid ${T.border}`,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: T.ink,
                background: T.paper, border: `1px solid ${T.border}`,
                borderRadius: 4, padding: '2px 8px', flexShrink: 0,
              }}>
                {item.name}
              </span>
              <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.6, paddingTop: 2 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TabShortcuts() {
  const groups = [
    {
      title: '画布操作',
      items: [
        { keys: ['Space', '+ 拖拽'], desc: '自由平移画布' },
        { keys: ['滚轮'], desc: '缩放视图（以鼠标为中心）' },
        { keys: ['Ctrl', '+ R'], desc: '切换标尺显示' },
      ],
    },
    {
      title: '叠加 / 重叠模式',
      items: [
        { keys: ['↑ ↓ ← →'], desc: '微移上层图 1px' },
        { keys: ['Shift', '+ 方向键'], desc: '步进移动 10px' },
        { keys: ['Alt', '（按住）'], desc: '显示间距参考辅助线' },
      ],
    },
    {
      title: '标注操作',
      items: [
        { keys: ['Esc'], desc: '退出标注模式 / 取消选中' },
        { keys: ['Delete'], desc: '删除当前选中标注' },
      ],
    },
    {
      title: '全局',
      items: [
        { keys: ['?'], desc: '打开使用手册（本弹窗）' },
        { keys: ['Ctrl', '+ R'], desc: '切换标尺' },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.charcoal }}>键盘快捷键</p>
        <p style={{ fontSize: 12, color: T.mist, marginTop: 4, lineHeight: 1.6 }}>熟悉这些快捷键可大幅提升走查效率</p>
      </div>

      {groups.map((g) => (
        <div key={g.title}>
          <SectionTitle>{g.title}</SectionTitle>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {g.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: i < g.items.length - 1 ? `1px solid ${T.border}` : 'none',
                  gap: 16,
                }}
              >
                <p style={{ fontSize: 12, color: T.ink, flex: 1 }}>{item.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {item.keys.map((k, ki) => (
                    k.startsWith('+') || k.startsWith('（')
                      ? <span key={ki} style={{ fontSize: 11, color: T.mist }}>{k}</span>
                      : <Key key={ki}>{k}</Key>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  )
}

function TabAI() {
  return (
    <div className="flex flex-col gap-5">
      <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.charcoal }}>AI 分析</p>
        <p style={{ fontSize: 12, color: T.mist, marginTop: 4, lineHeight: 1.6 }}>
          多模型支持，自动扫描像素级差异并输出结构化标注
        </p>
      </div>

      {/* How it works */}
      <div>
        <SectionTitle>工作原理</SectionTitle>
        <Card>
          <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.7 }}>
            点击工具栏 <strong>「AI 分析」</strong> 后，系统将原始分辨率的设计稿与截图（上限 1200px）
            发送给配置的 AI 模型，模型按区域逐一比对后返回差异 JSON，
            自动在画布上生成标注点并填充详情面板。分析过程中可随时点击 <strong>「停止分析」</strong> 中断。
          </p>
        </Card>
      </div>

      {/* Precision levels */}
      <div>
        <SectionTitle>精度档位</SectionTitle>
        <div className="flex flex-col gap-2">
          {[
            { level: '低', badge: '#6B8FA3', title: '低精度', range: '1–5 条', desc: '仅报告 high / mid 严重差异，置信度 ≥ 80，速度最快。适合快速粗扫。' },
            { level: '标', badge: T.moss,   title: '标准精度', range: '最多 15 条', desc: '报告所有明显差异，置信度 ≥ 65，兼顾质量与速度，日常推荐。' },
            { level: '高', badge: T.amber,  title: '高精度', range: '不限条数', desc: '报告全部差异，置信度 ≥ 50，每条附带 CSS 修复建议，适合深度走查。' },
          ].map((p) => (
            <Card key={p.level} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: p.badge, color: T.paper,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {p.level}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{p.title}</p>
                  <span style={{ fontSize: 10, color: T.mist, background: T.paper, border: `1px solid ${T.border}`, borderRadius: 3, padding: '1px 6px' }}>{p.range}</span>
                </div>
                <p style={{ fontSize: 11, color: T.mist, lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Supported providers */}
      <div>
        <SectionTitle>支持的模型</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            'Claude 3.5 / 3.7', 'GPT-4o', 'Gemini 2.5 Pro',
            'Gemini 2.0 Flash', '智谱 GLM-4V', '自定义 API',
          ].map((m) => (
            <span key={m} style={{
              fontSize: 11, color: T.ink,
              background: T.warm, border: `1px solid ${T.border}`,
              borderRadius: 4, padding: '4px 10px',
            }}>
              {m}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 11, color: T.mist, marginTop: 8, lineHeight: 1.6 }}>
          在顶栏「AI 配置」中添加 API Key 并选择模型；支持自定义 Base URL 接入兼容 OpenAI 格式的本地或第三方接口。
        </p>
      </div>

      {/* Custom prompt */}
      <div>
        <SectionTitle>自定义提示词</SectionTitle>
        <Card>
          <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.65 }}>
            在 AI 配置弹窗的「自定义 Prompt」区域，可追加专属指令让模型聚焦特定检查维度，
            例如「只关注文字排版」「针对移动端 Touch 目标尺寸」等。
            内置四个场景模板可一键填入。
          </p>
        </Card>
      </div>
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'start',      label: '快速上手', icon: <Zap size={14} strokeWidth={1.5} />,      content: <TabQuickStart /> },
  { id: 'compare',   label: '比对模式', icon: <Columns2 size={14} strokeWidth={1.5} />,  content: <TabCompare /> },
  { id: 'annotate',  label: '标注工具', icon: <PenLine size={14} strokeWidth={1.5} />,   content: <TabAnnotation /> },
  { id: 'shortcuts', label: '快捷键',   icon: <Keyboard size={14} strokeWidth={1.5} />,  content: <TabShortcuts /> },
  { id: 'ai',        label: 'AI 分析',  icon: <Sparkles size={14} strokeWidth={1.5} />,  content: <TabAI /> },
]

// ── Main modal ────────────────────────────────────────────────────────────────

export default function WorkbenchGuideModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('start')
  const active = TABS.find(t => t.id === activeTab)!

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(37,37,37,0.5)', padding: 20 }}
        onMouseDown={onClose}
      >
        {/* Dialog */}
        <div
          style={{
            width: '100%',
            maxWidth: 700,
            height: '86vh',
            maxHeight: 680,
            background: T.paper,
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            boxShadow: '0 24px 60px rgba(0,0,0,0.14)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 18px',
              borderBottom: `1px solid ${T.border}`,
              background: T.warm,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: T.charcoal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: T.paper, fontSize: 8, fontWeight: 700, letterSpacing: '0.04em' }}>DI</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.charcoal }}>使用手册</span>
              <span style={{ fontSize: 11, color: T.smoke }}>·</span>
              <span style={{ fontSize: 12, color: T.mist }}>走查工作台</span>
            </div>
            <button
              onClick={onClose}
              aria-label="关闭"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
              onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
              onMouseOut={e => (e.currentTarget.style.color = T.mist)}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Body: sidebar + content */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Sidebar */}
            <nav
              style={{
                width: 120,
                flexShrink: 0,
                borderRight: `1px solid ${T.border}`,
                background: T.warm,
                display: 'flex',
                flexDirection: 'column',
                padding: '12px 8px',
                gap: 2,
              }}
            >
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      padding: '10px 6px',
                      borderRadius: 7,
                      border: isActive ? `1px solid ${T.border}` : '1px solid transparent',
                      background: isActive ? T.paper : 'transparent',
                      cursor: 'pointer',
                      color: isActive ? T.charcoal : T.mist,
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.12s',
                    }}
                    onMouseOver={e => { if (!isActive) e.currentTarget.style.color = T.ink }}
                    onMouseOut={e => { if (!isActive) e.currentTarget.style.color = T.mist }}
                  >
                    {tab.icon}
                    <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, lineHeight: 1.2, textAlign: 'center' }}>
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </nav>

            {/* Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 24px 32px',
              }}
            >
              {active.content}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useState } from 'react'
import { X, Zap, LayoutTemplate, PenLine, Keyboard, Sparkles } from 'lucide-react'

const T = {
  paper:    '#F7F4EE',
  warm:     '#EDE9E1',
  warmer:   '#E8E4DC',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  smoke:    '#D7D5D1',
  border:   '#E5E2DC',
  moss:     '#4E6E4E',
  red:      '#B85C5C',
  amber:    '#A07830',
  blue:     '#4A6E8A',
}

// ── Reusable primitives ───────────────────────────────────────────────────────

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, color: T.mist, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, ...style }}>
      {children}
    </p>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.warm, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', ...style }}>
      {children}
    </div>
  )
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 500, color, background: color + '18', border: `1px solid ${color}30`, borderRadius: 4, padding: '1px 6px' }}>
      {children}
    </span>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 24, height: 20, padding: '0 5px',
      background: T.charcoal, color: T.paper,
      fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-geist-mono, monospace)',
      borderRadius: 4, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// ── Tab content ───────────────────────────────────────────────────────────────

function TabStart() {
  const steps = [
    { num: '01', title: '上传图片', desc: '在项目版本页上传设计稿和线上截图，支持 PNG / JPG 格式。每个版本的图片和标注数据相互独立。' },
    { num: '02', title: '选择比对模式', desc: '在工具栏选择并排、滑动、叠加或重叠四种模式，找到最适合当前对比任务的视角。' },
    { num: '03', title: '标注差异', desc: '点击 AI 分析 自动扫描，或切换到手动标注在画布上点击创建差异点。两种方式可以混合使用。' },
    { num: '04', title: '核对与编辑', desc: '在右侧详情面板调整差异描述、严重程度、修复状态，也可拖拽调整序号顺序。' },
    { num: '05', title: '导出报告', desc: '确认所有差异后点击「导出报告」，生成包含标注截图与差异列表的 PNG 或 PDF 报告。' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionTitle>基本流程</SectionTitle>
      {steps.map(s => (
        <Card key={s.num} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.smoke, fontFamily: 'var(--font-geist-mono, monospace)', flexShrink: 0, paddingTop: 1 }}>
            {s.num}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.charcoal, marginBottom: 3 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: T.mist, lineHeight: 1.6 }}>{s.desc}</div>
          </div>
        </Card>
      ))}

      <SectionTitle style={{ marginTop: 16 }}>差异严重程度</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { color: '#E5404A', label: '必须修复', tag: '高', desc: '视觉一致性严重破坏' },
          { color: '#F0A020', label: '建议修复', tag: '中', desc: '影响设计还原度' },
          { color: '#6E8FAD', label: '可接受偏差', tag: '低', desc: '细微差异可暂缓' },
        ].map(s => (
          <Card key={s.tag} style={{ textAlign: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, margin: '0 auto 6px' }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: T.charcoal }}>{s.tag} · {s.label}</div>
            <div style={{ fontSize: 10, color: T.mist, marginTop: 3, lineHeight: 1.5 }}>{s.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function TabModes() {
  const modes = [
    {
      name: '并排',
      tag: '默认',
      tagColor: T.blue,
      desc: '设计稿与线上截图左右并排显示，两侧视图同步缩放和平移，适合整体布局与模块对比。',
      tips: ['拖动画布任意一侧，另一侧同步跟随', '适合检查模块排列与整体结构'],
    },
    {
      name: '滑动',
      tag: '推荐',
      tagColor: T.moss,
      desc: '通过可拖拽的分界线左右切换两张图，同一区域在同一屏幕位置显示，对比精准。',
      tips: ['拖动中间分隔线控制显示比例', '适合检查颜色、文字、图标等细节'],
    },
    {
      name: '叠加',
      tag: '精细',
      tagColor: T.amber,
      desc: '将线上截图叠加在设计稿上，可调整透明度进行对比，用热力图高亮差异区域。',
      tips: ['解锁同步后可单独拖动线上层', '按 Alt 查看元素间距参考线', '按 ↑↓←→ 微调图层位置'],
    },
    {
      name: '重叠',
      tag: '像素级',
      tagColor: T.red,
      desc: '两张图完全重叠，通过透明度和颜色通道差异找出像素级别的偏差。',
      tips: ['解锁同步后可精确对齐两图', '对齐工具可快速吸附边缘', '适合检查字号、间距的精确差异'],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionTitle>四种比对模式</SectionTitle>
      {modes.map(m => (
        <Card key={m.name}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.charcoal }}>{m.name}</span>
            <Tag color={m.tagColor}>{m.tag}</Tag>
          </div>
          <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.6, margin: '0 0 8px' }}>{m.desc}</p>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {m.tips.map((tip, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: T.mist }}>
                <span style={{ color: T.smoke, flexShrink: 0, marginTop: 1 }}>·</span>
                {tip}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <SectionTitle style={{ marginTop: 16 }}>同步锁</SectionTitle>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.charcoal, marginBottom: 4 }}>🔒 锁定状态</div>
            <div style={{ fontSize: 11, color: T.mist, lineHeight: 1.6 }}>两张图同步缩放、平移，适合整体对比。并排和滑动模式下强制锁定。</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.charcoal, marginBottom: 4 }}>🔓 解锁状态</div>
            <div style={{ fontSize: 11, color: T.mist, lineHeight: 1.6 }}>仅限叠加/重叠模式。解锁后可单独拖动线上层，配合对齐工具精确定位。</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function TabAnnotate() {
  const styles = [
    { s: 'A', bg: T.charcoal, title: '序号气泡', desc: '最基础的标注样式，仅显示带序号的圆形气泡，适合快速标记位置，不遮挡画面内容。' },
    { s: 'B', bg: T.amber,    title: '气泡 + 边框', desc: '在气泡基础上增加矩形边框，清晰框出差异区域的范围，适合强调位置与尺寸问题。' },
    { s: 'C', bg: T.blue,     title: '气泡 + 色块', desc: '差异区域填充半透明色块，视觉冲击最强，适合标注颜色、背景等大面积视觉差异。' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionTitle>标注样式</SectionTitle>
      {styles.map(s => (
        <Card key={s.s} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16,
            background: s.bg, color: T.paper,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            {s.s}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.charcoal, marginBottom: 3 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: T.mist, lineHeight: 1.6 }}>{s.desc}</div>
          </div>
        </Card>
      ))}

      <SectionTitle style={{ marginTop: 16 }}>手动标注</SectionTitle>
      <Card>
        <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: T.ink, lineHeight: 1.8 }}>
          <li>在左侧差异列表顶部选择标注样式（序号 / 边框 / 填充）</li>
          <li>点击「＋ 手动标注」进入标注模式，光标变为十字</li>
          <li>在画布上<strong>单击</strong>放置气泡，或<strong>拖拽</strong>绘制边框区域</li>
          <li>标注完成后在右侧详情面板填写差异描述</li>
        </ol>
      </Card>

      <SectionTitle style={{ marginTop: 16 }}>差异列表操作</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { title: '筛选', desc: '按来源（全部 / AI / 手动）过滤差异列表' },
          { title: '拖拽排序', desc: '拖动每行左侧把手可调整差异序号顺序' },
          { title: '批量删除', desc: '勾选多条后点击顶部删除按钮一次清除' },
          { title: '修复状态', desc: '在详情面板将差异标为「已修复」或「忽略」' },
        ].map(op => (
          <Card key={op.title}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.charcoal, marginBottom: 3 }}>{op.title}</div>
            <div style={{ fontSize: 11, color: T.mist, lineHeight: 1.5 }}>{op.desc}</div>
          </Card>
        ))}
      </div>

      <SectionTitle style={{ marginTop: 16 }}>工具栏工具</SectionTitle>
      {[
        { name: '标尺', desc: '在画布上显示刻度标尺，辅助测量元素间距与位置偏移。快捷键 Ctrl/⌘+R 切换。' },
        { name: '参考线', desc: '拖拽标尺区域创建水平/垂直参考线，帮助对齐检查。可在设置中单独开关显示。' },
        { name: '吸色', desc: '点击后在屏幕任意位置取色，色值自动复制到剪贴板，方便与设计稿色值对比。' },
        { name: '对齐', desc: '叠加/重叠模式解锁后出现，可将线上层快速对齐到设计层的顶/底/左/右边缘。' },
      ].map(tool => (
        <Card key={tool.name} style={{ display: 'flex', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.charcoal, minWidth: 40, flexShrink: 0 }}>{tool.name}</div>
          <div style={{ fontSize: 11, color: T.mist, lineHeight: 1.6 }}>{tool.desc}</div>
        </Card>
      ))}
    </div>
  )
}

function TabShortcuts() {
  const groups: { title: string; rows: { keys: string[]; desc: string }[] }[] = [
    {
      title: '画布导航',
      rows: [
        { keys: ['Space', '拖拽'], desc: '平移画布（可配合在任意模式下使用）' },
        { keys: ['滚轮'], desc: '以鼠标位置为中心缩放画布（10% ~ 400%）' },
        { keys: ['Shift', '拖拽'], desc: '轴向约束平移，拖动方向锁定为水平或垂直' },
      ],
    },
    {
      title: '视图与工具',
      rows: [
        { keys: ['Ctrl/⌘', 'R'], desc: '切换显示 / 隐藏标尺' },
        { keys: ['Alt', '悬停'], desc: '显示悬停元素与相邻元素之间的间距参考线' },
      ],
    },
    {
      title: '叠加 / 重叠模式（解锁后）',
      rows: [
        { keys: ['↑', '↓', '←', '→'], desc: '微调线上图层位置，每次移动 1px' },
        { keys: ['Shift', '↑↓←→'], desc: '大步移动图层，每次移动 10px' },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map(g => (
        <div key={g.title}>
          <SectionTitle>{g.title}</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {g.rows.map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: T.warm, borderRadius: 6, border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                  {row.keys.map((k, j) => (
                    <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {j > 0 && <span style={{ fontSize: 9, color: T.smoke }}>+</span>}
                      <Key>{k}</Key>
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 12, color: T.ink }}>{row.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div>
        <SectionTitle>温馨提示</SectionTitle>
        <Card style={{ fontSize: 12, color: T.mist, lineHeight: 1.7 }}>
          在文本输入框（搜索框、描述编辑框等）获得焦点时，快捷键自动失效，避免冲突。<br />
          在非输入状态下快捷键始终生效，无需额外设置。
        </Card>
      </div>
    </div>
  )
}

function TabAI() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <SectionTitle>配置模型</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.charcoal, marginBottom: 6 }}>支持的模型提供商</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { name: 'Anthropic', desc: 'Claude 系列，支持扩展思考（claude-3-7 / claude-4）' },
                { name: 'Google', desc: 'Gemini 系列，支持内部推理（gemini-2.5）' },
                { name: '智谱 AI', desc: 'GLM-4V 系列，中文理解能力强' },
                { name: 'OpenAI / 自定义', desc: 'GPT-4o 及兼容 OpenAI 格式的服务' },
              ].map(p => (
                <div key={p.name} style={{ padding: '8px 10px', background: T.warmer, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.charcoal }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: T.mist, marginTop: 2, lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div>
        <SectionTitle>分析精度</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { level: '低', badge: '快', badgeColor: T.moss, desc: '仅输出 1–5 个高/中严重度差异（置信度 ≥ 80）。适合快速扫描。' },
            { level: '标准', badge: '推荐', badgeColor: T.blue, desc: '输出所有明显差异，最多 15 条（置信度 ≥ 65）。日常走查首选。' },
            { level: '高', badge: '慢', badgeColor: T.amber, desc: '不限数量，每条必须包含 CSS 修复建议（置信度 ≥ 50）。精细走查使用。' },
          ].map(p => (
            <Card key={p.level} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 72, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.charcoal }}>{p.level}</span>
                <Tag color={p.badgeColor}>{p.badge}</Tag>
              </div>
              <div style={{ fontSize: 11, color: T.mist, lineHeight: 1.6 }}>{p.desc}</div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>置信度阈值</SectionTitle>
        <Card style={{ fontSize: 12, color: T.ink, lineHeight: 1.7 }}>
          在 AI 模型配置中可设置全局置信度阈值，低于该值的差异自动隐藏（不删除）。
          建议设置在 <strong>65–75</strong> 之间，过低会引入大量误报，过高可能遗漏真实差异。
        </Card>
      </div>

      <div>
        <SectionTitle>自定义 Prompt</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Card style={{ fontSize: 12, color: T.ink, lineHeight: 1.7 }}>
            在模型配置中可选择场景模板或自由填写补充指令，追加到系统提示词之后发送给模型。
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { name: '通用精细', desc: '要求输出精确色值、px 数值，禁止模糊描述' },
              { name: '移动端', desc: '关注触控区域、8pt 网格、安全区域等移动端规范' },
              { name: '组件一致性', desc: '以设计系统为基准对比按钮、卡片、图标等组件' },
              { name: '文字排版', desc: '聚焦字号、字重、行高、字间距等排版细节' },
            ].map(t => (
              <div key={t.name} style={{ padding: '8px 10px', background: T.warmer, borderRadius: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.charcoal }}>{t.name}</div>
                <div style={{ fontSize: 10, color: T.mist, marginTop: 2, lineHeight: 1.5 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>提升准确率建议</SectionTitle>
        <Card>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              '使用原始分辨率截图，系统自动以最高 1200px 分辨率发送给模型',
              '优先选用 Gemini 2.5 Pro 或 Claude 3.7+ 等支持内部推理的模型',
              '使用「高精度」模式搭配场景模板可显著减少误报',
              '如结果不理想，可在差异列表手动补充，AI 和手动标注可混合使用',
            ].map((tip, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: T.ink }}>
                <span style={{ color: T.moss, fontSize: 11, fontWeight: 700, flexShrink: 0, paddingTop: 1 }}>✓</span>
                <span style={{ lineHeight: 1.6 }}>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'start',     label: '快速上手', icon: <Zap size={13} strokeWidth={1.5} /> },
  { id: 'modes',     label: '比对模式', icon: <LayoutTemplate size={13} strokeWidth={1.5} /> },
  { id: 'annotate',  label: '标注工具', icon: <PenLine size={13} strokeWidth={1.5} /> },
  { id: 'shortcuts', label: '快捷键',   icon: <Keyboard size={13} strokeWidth={1.5} /> },
  { id: 'ai',        label: 'AI 分析',  icon: <Sparkles size={13} strokeWidth={1.5} /> },
]

export default function WorkbenchGuideModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('start')

  const content: Record<string, React.ReactNode> = {
    start:     <TabStart />,
    modes:     <TabModes />,
    annotate:  <TabAnnotate />,
    shortcuts: <TabShortcuts />,
    ai:        <TabAI />,
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(37,37,37,0.4)', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: T.paper,
          width: '100%', maxWidth: 720,
          maxHeight: '86vh',
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center',
            padding: '14px 20px',
            borderBottom: `1px solid ${T.border}`,
            background: T.warm,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.charcoal }}>使用手册</h2>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: T.mist }}>走查工作台功能说明</p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.smoke, padding: 4, borderRadius: 4 }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.smoke)}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Sidebar tabs */}
          <div
            style={{
              width: 120, flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              padding: '12px 8px',
              display: 'flex', flexDirection: 'column', gap: 2,
              background: T.warm,
            }}
          >
            {TABS.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: active ? T.paper : 'transparent',
                    color: active ? T.charcoal : T.mist,
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: active ? `0 1px 3px rgba(0,0,0,0.06), inset 0 0 0 1px ${T.border}` : 'none',
                    transition: 'all 120ms',
                  }}
                  onMouseOver={e => { if (!active) e.currentTarget.style.color = T.charcoal }}
                  onMouseOut={e => { if (!active) e.currentTarget.style.color = T.mist }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px' }}>
            {content[activeTab]}
          </div>
        </div>
      </div>
    </div>
  )
}

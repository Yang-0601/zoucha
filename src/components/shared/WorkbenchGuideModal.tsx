'use client'

import { useState } from 'react'
import { X, Zap, Columns2, PenLine, Keyboard, Sparkles, ArrowRight } from 'lucide-react'

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
  moss:     '#5E7A53',
  blue:     '#5A7FA0',
  red:      '#B85C5C',
  surface:  '#FDFAF5',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: T.mist,
        letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}

function InfoCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderLeft: accent ? `3px solid ${accent}` : `1px solid ${T.border}`,
      borderRadius: 8,
      padding: '12px 16px',
    }}>
      {children}
    </div>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: T.charcoal,
      color: T.paper,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.02em',
      borderRadius: 5,
      padding: '3px 8px',
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 0 rgba(0,0,0,0.35)',
      fontFamily: 'inherit',
    }}>
      {children}
    </kbd>
  )
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color, background: `${color}18`,
      borderRadius: 4, padding: '2px 8px',
      border: `1px solid ${color}30`,
      letterSpacing: '0.02em',
    }}>
      {children}
    </span>
  )
}

// ── Tab: 快速上手 ─────────────────────────────────────────────────────────────

function TabQuickStart() {
  const steps = [
    {
      n: '1', color: '#6B8FA3',
      title: '上传图片',
      desc: '在上传页分别上传设计稿与线上截图，两张图自动缩放至相同宽度，确保对比基准一致。',
    },
    {
      n: '2', color: T.moss,
      title: '选择比对模式',
      desc: '通过工具栏切换并排、滑动、叠加、重叠四种视角，覆盖宏观到像素级的所有检查需求。',
    },
    {
      n: '3', color: T.amber,
      title: '标注差异',
      desc: '点击「AI 分析」自动识别差异并批量生成标注；或开启标注模式在画布上手动点击添加标注点。',
    },
    {
      n: '4', color: '#A07BC4',
      title: '核对详情',
      desc: '在右侧详情面板查看每处差异的类型、严重程度、设计值与实现值，可手动修正任何字段。',
    },
    {
      n: '5', color: T.red,
      title: '导出报告',
      desc: '确认所有差异后，点击顶栏「导出报告」一键生成 PDF 格式的完整走查报告。',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: T.charcoal, letterSpacing: '-0.02em', marginBottom: 4 }}>
          五步完成一次走查
        </h2>
        <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.7 }}>
          从上传到导出报告，全流程只需几分钟，支持 AI 自动分析与手动标注双模式。
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display: 'flex', gap: 0 }}>
            {/* Timeline column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: s.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                boxShadow: `0 2px 6px ${s.color}50`,
              }}>
                {s.n}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 16, background: T.border, margin: '3px 0' }} />
              )}
            </div>
            {/* Content */}
            <div style={{ paddingLeft: 12, paddingBottom: i < steps.length - 1 ? 16 : 0, paddingTop: 3 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{s.title}</p>
              <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <InfoCard accent={T.gold}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>💡</span>
          <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.7 }}>
            走查中遇到问题，查阅对应标签页即可快速定位。
          </p>
        </div>
      </InfoCard>
    </div>
  )
}

// ── Tab: 比对模式 ─────────────────────────────────────────────────────────────

function TabCompare() {
  const modes = [
    {
      name: '并排', color: '#5A7FA0',
      icon: '⧈',
      desc: '左右并列显示设计稿与截图，两图同步滚动与缩放，适合整体布局和内容顺序对比。',
      tips: ['同步锁在此模式下始终开启', '适合宽屏环境做全局检查'],
    },
    {
      name: '滑动', color: T.moss,
      icon: '⇔',
      desc: '用竖向分割线渐进揭示两张图，左右拖动滑块可精准查看任意位置的差异细节。',
      tips: ['适合检查局部区域的精细差异', '分割线可拖动到任意百分比位置'],
    },
    {
      name: '叠加', color: T.amber,
      icon: '◫',
      desc: '两图透明叠加，通过调整不透明度和差值/热图混合模式，快速定位偏移与颜色偏差。',
      tips: ['差值模式下纯黑区域表示完全一致', '解锁同步锁可独立平移图层'],
    },
    {
      name: '重叠', color: T.red,
      icon: '⊡',
      desc: '两图完全重叠，可分别调整每层透明度，配合方向键微移实现像素级对齐校准。',
      tips: ['↑↓←→ 微移 1px，Shift + 方向键 步进 10px', '适合精准校准间距与圆角误差'],
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: T.charcoal, letterSpacing: '-0.02em', marginBottom: 4 }}>
          四种比对视角
        </h2>
        <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.7 }}>
          按需切换，从宏观布局到像素级对齐一站式覆盖。
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {modes.map((m) => (
          <div key={m.name} style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Mode header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: `${m.color}0C`,
              borderBottom: `1px solid ${m.color}20`,
            }}>
              <span style={{ fontSize: 18, lineHeight: 1, color: m.color }}>{m.icon}</span>
              <Tag color={m.color}>{m.name}模式</Tag>
            </div>
            {/* Mode body */}
            <div style={{ padding: '10px 14px' }}>
              <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.7, marginBottom: 8 }}>{m.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {m.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ color: m.color, fontSize: 14, lineHeight: '16px', flexShrink: 0 }}>›</span>
                    <span style={{ fontSize: 11, color: T.mist, lineHeight: 1.6 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: 标注工具 ─────────────────────────────────────────────────────────────

function TabAnnotation() {
  const styles = [
    { id: 'A', bg: T.charcoal, title: '序号气泡', desc: '默认样式。圆形序号气泡，不干扰画面内容，适合快速标记。' },
    { id: 'B', bg: T.amber,    title: '气泡 + 边框', desc: '在气泡基础上为差异区域绘制彩色描边框，适合标注范围。' },
    { id: 'C', bg: '#9CA3AF',  title: '气泡 + 填充', desc: '叠加半透明色块高亮差异区域，视觉最强，适合重点问题。' },
  ]

  const listFeatures = [
    { name: '拖拽排序', desc: '拖动每行左侧手柄调整差异顺序，影响最终报告排序。' },
    { name: '来源筛选', desc: '顶部「全部 / AI / 手动」三个 Tab 快速过滤差异来源。' },
    { name: '批量删除', desc: '勾选多条后点击删除按钮一键清除，支持全选。' },
    { name: '修复状态', desc: '对每条差异标记「待修复 / 修复中 / 已修复」，验收人员和开发者均可操作，版本列表实时汇总状态数量。' },
    { name: '置信度筛选', desc: '拖动置信度滑块，只显示高于阈值的 AI 差异。' },
    { name: '复制链接', desc: '顶栏「复制链接」一键复制当前版本地址，粘贴给他人可直接进入该版本工作台，无需重新上传。' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: T.charcoal, letterSpacing: '-0.02em', marginBottom: 4 }}>
          标注与差异管理
        </h2>
        <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.7 }}>
          支持手动与 AI 双模式标注，可在详情面板完整编辑每条差异记录。
        </p>
      </div>

      {/* Annotation styles */}
      <div>
        <SectionLabel>标注样式</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {styles.map(({ id, bg, title, desc }) => (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: bg, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                boxShadow: `0 2px 6px ${bg}40`,
              }}>
                {id}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 2 }}>{title}</p>
                <p style={{ fontSize: 11, color: T.mist, lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual annotation */}
      <div>
        <SectionLabel>手动标注流程</SectionLabel>
        <InfoCard accent={T.moss}>
          <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.75 }}>
            点击左侧差异列表顶部的 <strong>「标注模式」</strong> 按钮激活，画布鼠标变为十字准星。
            在设计稿上点击差异位置即创建标注点，拖拽可创建矩形框选区域。
            再次点击「标注模式」或按 <Key>Esc</Key> 退出。
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {['鼠标变为十字准星', '支持拖拽调整标注位置', '拖拽创建矩形框选区域'].map((t) => (
              <span key={t} style={{
                fontSize: 11, color: T.mist,
                background: T.warm, border: `1px solid ${T.border}`,
                borderRadius: 4, padding: '2px 9px',
              }}>
                {t}
              </span>
            ))}
          </div>
        </InfoCard>
      </div>

      {/* Role system */}
      <div>
        <SectionLabel>角色权限</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { name: '验收人员', color: T.amber, desc: '完整编辑权限：新建 / 删除差异、手动标注、AI 分析、修改所有字段、导出报告。' },
            { name: '开发者', color: T.blue, desc: '只读模式：查看所有差异与标注，可操作「验收状态」标记修复进度，无法编辑其他内容。' },
          ].map(r => (
            <div key={r.name} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: T.surface, border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${r.color}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              <Tag color={r.color}>{r.name}</Tag>
              <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.65, paddingTop: 1 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: T.mist, lineHeight: 1.7, marginTop: 8 }}>
          角色在首次进入时选择，可通过顶栏右侧角色徽章随时切换。
        </p>
      </div>

      {/* List features */}
      <div>
        <SectionLabel>差异列表操作</SectionLabel>
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 8, overflow: 'hidden',
        }}>
          {listFeatures.map((item, i) => (
            <div key={item.name} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 14px',
              borderBottom: i < listFeatures.length - 1 ? `1px solid ${T.border}` : 'none',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: T.ink,
                background: T.warm, border: `1px solid ${T.border}`,
                borderRadius: 4, padding: '2px 9px', flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {item.name}
              </span>
              <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.65, paddingTop: 1 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab: 快捷键 ───────────────────────────────────────────────────────────────

function TabShortcuts() {
  const groups = [
    {
      title: '画布操作',
      color: '#5A7FA0',
      items: [
        { keys: [['Space'], ['拖拽']], desc: '自由平移画布' },
        { keys: [['滚轮']], desc: '缩放（以鼠标为中心）' },
        { keys: [['Ctrl'], ['R']], desc: '切换标尺显示' },
        { keys: [['Alt']], desc: '查看辅助线之间间距' },
        { keys: [['双击辅助线']], desc: '删除该条辅助线' },
      ],
    },
    {
      title: '叠加 / 重叠模式',
      color: T.amber,
      items: [
        { keys: [['↑'], ['↓'], ['←'], ['→']], desc: '微移上层图 1px' },
        { keys: [['Shift'], ['+'], ['方向键']], desc: '步进移动 10px' },
      ],
    },
    {
      title: '标注操作',
      color: T.moss,
      items: [
        { keys: [['Esc']], desc: '退出标注模式 / 取消选中' },
        { keys: [['Delete']], desc: '删除当前选中标注' },
      ],
    },
    {
      title: '全局',
      color: T.red,
      items: [
        { keys: [['Ctrl'], ['R']], desc: '切换标尺' },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: T.charcoal, letterSpacing: '-0.02em', marginBottom: 4 }}>
          键盘快捷键
        </h2>
        <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.7 }}>
          熟悉这些快捷键可大幅提升走查效率。
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.map((g) => (
          <div key={g.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: g.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ink, letterSpacing: '0.04em' }}>{g.title}</span>
            </div>
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              {g.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 14px',
                    borderBottom: i < g.items.length - 1 ? `1px solid ${T.border}` : 'none',
                    gap: 16,
                  }}
                >
                  <p style={{ fontSize: 12, color: T.ink }}>{item.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {item.keys.map((group, gi) => (
                      <span key={gi} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {gi > 0 && <span style={{ fontSize: 10, color: T.smoke, margin: '0 1px' }}>+</span>}
                        {group.map((k, ki) => (
                          <Key key={ki}>{k}</Key>
                        ))}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: AI 分析 ──────────────────────────────────────────────────────────────

function TabAI() {
  const precisions = [
    { level: '低', badge: '#5A7FA0', title: '低精度', range: '1–5 条', desc: '仅报告 high / mid 严重差异，置信度 ≥ 80，速度最快，适合快速粗扫。' },
    { level: '标', badge: T.moss,    title: '标准精度', range: '最多 15 条', desc: '报告所有明显差异，置信度 ≥ 65，兼顾质量与速度，日常推荐。' },
    { level: '高', badge: T.amber,   title: '高精度', range: '不限条数', desc: '报告全部差异，置信度 ≥ 50，每条附带 CSS 修复建议，适合深度走查。' },
  ]

  const providers = [
    { name: 'Claude 3.5 / 3.7', color: '#C9956A' },
    { name: 'GPT-4o',           color: '#74AA9C' },
    { name: 'Gemini 2.5 Pro',   color: '#5A7FA0' },
    { name: 'Gemini 2.0 Flash', color: '#4A9FA8' },
    { name: '智谱 GLM-4V',      color: '#7A6FC4' },
    { name: '自定义 API',        color: T.mist   },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: T.charcoal, letterSpacing: '-0.02em', marginBottom: 4 }}>
          AI 智能分析
        </h2>
        <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.7 }}>
          多模型支持，自动扫描像素级差异并输出结构化标注，支持流式进度与随时中止。
        </p>
      </div>

      {/* How it works */}
      <InfoCard accent={T.charcoal}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.mist, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          工作原理
        </p>
        <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.75 }}>
          点击工具栏 <strong>「AI 分析」</strong> 后，系统将原始分辨率的设计稿与截图（上限 1200 px）发送给配置的 AI 模型，模型按区域逐一比对后返回差异 JSON，自动在画布上生成标注点并填充详情面板。分析过程中可随时点击 <strong>「停止分析」</strong> 中断。
        </p>
      </InfoCard>

      {/* Precision */}
      <div>
        <SectionLabel>精度档位</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {precisions.map((p) => (
            <div key={p.level} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: T.surface, border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${p.badge}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: p.badge, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, flexShrink: 0,
                letterSpacing: '-0.01em',
              }}>
                {p.level}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{p.title}</p>
                  <span style={{
                    fontSize: 10, color: p.badge,
                    background: `${p.badge}15`, border: `1px solid ${p.badge}30`,
                    borderRadius: 3, padding: '1px 6px', fontWeight: 600,
                  }}>
                    {p.range}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: T.mist, lineHeight: 1.65 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Providers */}
      <div>
        <SectionLabel>支持的模型</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {providers.map((m) => (
            <span key={m.name} style={{
              fontSize: 11, fontWeight: 500,
              color: m.color,
              background: `${m.color}12`,
              border: `1px solid ${m.color}28`,
              borderRadius: 5, padding: '4px 10px',
            }}>
              {m.name}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 11, color: T.mist, lineHeight: 1.7 }}>
          在顶栏「AI 配置」中添加 API Key 并选择模型；支持自定义 Base URL 接入兼容 OpenAI 格式的本地或第三方接口。
        </p>
      </div>

      {/* Custom prompt tip */}
      <InfoCard accent={T.amber}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.mist, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          自定义提示词
        </p>
        <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.75 }}>
          在 AI 配置弹窗的「追加提示词」区域，可追加专属指令让模型聚焦特定检查维度，
          例如「只关注文字排版」「针对移动端 Touch 目标尺寸」等。内置四个场景模板可一键填入。
        </p>
      </InfoCard>
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'start',      label: '快速上手', icon: Zap,      content: <TabQuickStart /> },
  { id: 'compare',   label: '比对模式', icon: Columns2,  content: <TabCompare /> },
  { id: 'annotate',  label: '标注工具', icon: PenLine,   content: <TabAnnotation /> },
  { id: 'shortcuts', label: '快捷键',   icon: Keyboard,  content: <TabShortcuts /> },
  { id: 'ai',        label: 'AI 分析',  icon: Sparkles,  content: <TabAI /> },
]

// ── Main modal ────────────────────────────────────────────────────────────────

export default function WorkbenchGuideModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('start')
  const active = TABS.find(t => t.id === activeTab)!

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(20,18,15,0.55)', padding: 20, backdropFilter: 'blur(2px)' }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          height: '88vh',
          maxHeight: 700,
          background: T.paper,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: `1px solid ${T.border}`,
          background: T.warm,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 5,
              background: T.charcoal,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: T.paper, fontSize: 8, fontWeight: 800, letterSpacing: '0.06em' }}>DI</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.charcoal, letterSpacing: '-0.01em' }}>
              使用手册
            </span>
            <span style={{ fontSize: 11, color: T.smoke, margin: '0 2px' }}>—</span>
            <span style={{ fontSize: 12, color: T.mist }}>走查工作台</span>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: T.mist, padding: 6, borderRadius: 6,
              display: 'flex', alignItems: 'center',
              transition: 'color 0.1s',
            }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.mist)}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* Sidebar */}
          <nav style={{
            width: 128,
            flexShrink: 0,
            borderRight: `1px solid ${T.border}`,
            background: T.warm,
            display: 'flex',
            flexDirection: 'column',
            padding: '10px 10px',
            gap: 3,
          }}>
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 10px',
                    borderRadius: 7,
                    border: 'none',
                    background: isActive ? T.paper : 'transparent',
                    cursor: 'pointer',
                    color: isActive ? T.charcoal : T.mist,
                    boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                    transition: 'all 0.12s',
                    textAlign: 'left',
                    position: 'relative',
                  }}
                  onMouseOver={e => { if (!isActive) e.currentTarget.style.color = T.ink }}
                  onMouseOut={e => { if (!isActive) e.currentTarget.style.color = T.mist }}
                >
                  {/* Active accent bar */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: 3, borderRadius: '0 2px 2px 0',
                      background: T.charcoal,
                    }} />
                  )}
                  <Icon size={13} strokeWidth={isActive ? 2 : 1.5} style={{ flexShrink: 0 }} />
                  <span style={{
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: 1.2,
                    letterSpacing: isActive ? '-0.01em' : 0,
                  }}>
                    {tab.label}
                  </span>
                </button>
              )
            })}

            <div style={{ flex: 1 }} />
          </nav>

          {/* Content area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 28px 36px',
            scrollbarWidth: 'thin',
          }}>
            {active.content}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { X } from 'lucide-react'

// Color palette matching app design
const T = {
  paper:    '#F7F4EE',
  warm:     '#EDE9E1',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  smoke:    '#D7D5D1',
  border:   '#E5E2DC',
  moss:     '#6B7A5E',
  red:      '#B85C5C',
  amber:    '#C49A45',
  gray:     '#9CA3AF',
}

export default function WorkbenchGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(37,37,37,0.45)', padding: 20 }}
    >
      <div
        className="w-full max-w-3xl overflow-hidden"
        style={{ background: T.paper, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.border}`, background: T.warm }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.charcoal }}>走查工作台使用手册</h2>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: T.mist }}>快速上手指南 · 完整功能说明</p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 4 }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.mist)}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px' }}>
          {/* Section 1: Basic Flow */}
          <section style={{ marginBottom: 28 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.charcoal, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, background: T.amber, borderRadius: '50%' }} />
              基本流程
            </h3>
            <ol style={{ margin: 0, paddingLeft: 28, color: T.ink, fontSize: 13, lineHeight: 1.8, listStyleType: 'decimal' }}>
              <li>上传文件：先上传或选择设计稿和实景截图。</li>
              <li>检查视图：选择合适的对比模式并校准画布显示。</li>
              <li>标注差异：通过 AI 分析或手动创建差异标注。</li>
              <li>确认结果：在右侧详情面板核对差异内容和置信度。</li>
              <li>导出报告：确认差异后点击"导出报告"生成报告。</li>
            </ol>
          </section>

          {/* Section 2: Compare Modes */}
          <section style={{ marginBottom: 28 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.charcoal, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, background: T.moss, borderRadius: '50%' }} />
              比对模式
            </h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { name: '并排', desc: '将设计与实现并列显示，适合整体布局和内容对比。' },
                { name: '滑动', desc: '通过滑块逐步揭示两张图，适合检查局部差异。' },
                { name: '叠加', desc: '将两图透明叠加，用于快速定位位置偏移和重叠问题。' },
                { name: '重叠', desc: '图像完全重叠显示，适合精准对齐与像素级对比。' },
              ].map(mode => (
                <div key={mode.name} style={{ padding: '10px 12px', background: T.warm, borderRadius: 6, border: `1px solid ${T.border}` }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: T.charcoal, marginBottom: 4 }}>{mode.name}</div>
                  <div style={{ fontSize: 12, color: T.mist }}>{mode.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Annotation Styles */}
          <section style={{ marginBottom: 28 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.charcoal, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, background: T.red, borderRadius: '50%' }} />
              标注样式
            </h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { style: 'A', color: T.charcoal, desc: '基础序号样式，适合快速标记差异点位置。' },
                { style: 'B', color: T.amber, desc: '边框式标注，适合强调差异区域边界和位置。' },
                { style: 'C', color: T.gray, desc: '填充式高亮，适合突出重点差异区域和视觉影响较大的问题。' },
              ].map(anno => (
                <div key={anno.style} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', background: T.warm, borderRadius: 6, border: `1px solid ${T.border}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: 14, background: anno.color, color: T.paper, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {anno.style}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: T.charcoal, marginBottom: 3 }}>样式 {anno.style}</div>
                    <div style={{ fontSize: 12, color: T.mist }}>{anno.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Keyboard Shortcuts */}
          <section style={{ marginBottom: 28 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.charcoal, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, background: T.moss, borderRadius: '50%' }} />
              键盘快捷键
            </h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { key: 'Ctrl/Cmd + R', desc: '显示 / 隐藏标尺，帮助测量距离与间距。' },
                { key: 'Space + 拖拽', desc: '按住空格后拖动可以自由移动画布。' },
                { key: 'Shift + 拖拽', desc: '按住 Shift 后拖动可实现更大步进的画布移动。' },
                { key: '鼠标滚轮', desc: '在画布上滚动可缩放视图，便于查看细节。' },
                { key: 'Alt', desc: '按住 Alt 时显示间距参考线，便于对比间隔与对齐。' },
                { key: '方向键', desc: '在叠加模式下微调图层位置，按住 Shift 为 10px 步进。' },
              ].map(kb => (
                <div key={kb.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 12 }}>
                  <div style={{ background: T.charcoal, color: T.paper, padding: '4px 8px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap', minWidth: 90, textAlign: 'center' }}>
                    {kb.key}
                  </div>
                  <div style={{ color: T.ink, flex: 1, paddingTop: 2 }}>{kb.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Tools */}
          <section>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.charcoal, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, background: T.amber, borderRadius: '50%' }} />
              工具说明
            </h3>
            <ul style={{ margin: 0, paddingLeft: 0, color: T.ink, fontSize: 12, lineHeight: 1.8 }}>
              {[
                { name: '同步锁', desc: '开启后对比视图保持一致移动，关闭后可单独调整当前图层。' },
                { name: '参考线', desc: '添加水平/垂直参考线，辅助定位和对齐检查。' },
                { name: '吸色', desc: '快速提取画布上颜色值，便于检查色彩是否一致。' },
                { name: '对齐', desc: '将两张图的边缘对齐到顶部/底部/左侧/右侧，快速校准视图。' },
                { name: 'AI 分析', desc: '自动扫描差异并生成标注，节省人工检查时间。' },
                { name: '置信度筛选', desc: '根据 AI 差异置信度过滤结果，只显示高可信差异。' },
                { name: '拖拽排序', desc: '在差异列表中拖拽调整顺序，优化报告展示顺序。' },
                { name: '批量删除', desc: '选择多个差异后一次性删除，提高清理效率。' },
              ].map((tool, i) => (
                <li key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < 7 ? `1px solid ${T.border}` : 'none' }}>
                  <strong style={{ color: T.charcoal }}>{tool.name}</strong>
                  <div style={{ fontSize: 11, color: T.mist, marginTop: 2 }}>{tool.desc}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

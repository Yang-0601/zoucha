'use client'

import { useAppStore } from '@/store'

const T = {
  paper:    '#F7F4EE',
  warm:     '#EDE9E1',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  border:   '#E5E2DC',
  gold:     '#D9C8A0',
}

export default function RoleSelectPage() {
  const setRole = useAppStore(s => s.setRole)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: T.paper }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-16">
        <div
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, background: T.charcoal, borderRadius: 8 }}
        >
          <span style={{ color: T.paper, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>DI</span>
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 600, color: T.charcoal, letterSpacing: '-0.02em' }}>设计走查</p>
          <p style={{ fontSize: 11, color: T.mist }}>Design Inspection</p>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: T.charcoal, letterSpacing: '-0.02em' }}>
          请选择你的身份
        </h1>
        <p style={{ fontSize: 13, color: T.mist, marginTop: 8 }}>
          不同身份对应不同的操作权限，进入后可随时切换
        </p>
      </div>

      {/* Role cards */}
      <div className="flex gap-5">
        {/* 验收人员 */}
        <button
          onClick={() => setRole('reviewer')}
          style={{
            width: 220,
            background: T.warm,
            border: `1.5px solid ${T.border}`,
            borderRadius: 14,
            padding: '28px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = T.gold
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = T.border
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div
            style={{
              width: 40, height: 40,
              background: T.charcoal,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z"
                stroke="#F7F4EE" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: T.charcoal, marginBottom: 8 }}>验收人员</p>
          <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.6 }}>
            创建项目与版本<br/>
            上传图片、添加标注<br/>
            AI 分析、导出报告
          </p>
        </button>

        {/* 开发者 */}
        <button
          onClick={() => setRole('developer')}
          style={{
            width: 220,
            background: T.warm,
            border: `1.5px solid ${T.border}`,
            borderRadius: 14,
            padding: '28px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = T.gold
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = T.border
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div
            style={{
              width: 40, height: 40,
              background: '#5A6A7A',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6 7L2 10L6 13M14 7L18 10L14 13M11 4L9 16"
                stroke="#F7F4EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: T.charcoal, marginBottom: 8 }}>开发者</p>
          <p style={{ fontSize: 12, color: T.mist, lineHeight: 1.6 }}>
            查看项目与验收版本<br/>
            在工作台查看标注<br/>
            只读模式，不可编辑
          </p>
        </button>
      </div>
    </div>
  )
}

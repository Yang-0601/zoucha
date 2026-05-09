'use client'

import { useState } from 'react'
import { useAppStore } from '@/store'

const ROLE_LABEL = { reviewer: '验收人员', developer: '开发者' }
const ROLE_COLOR = { reviewer: '#252525', developer: '#5A6A7A' }

export default function RoleBadge() {
  const { role, setRole } = useAppStore(s => ({ role: s.role, setRole: s.setRole }))
  const [open, setOpen] = useState(false)

  if (!role) return null

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 500,
          color: '#F7F4EE',
          background: ROLE_COLOR[role],
          border: 'none', borderRadius: 6,
          padding: '4px 10px', cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: role === 'reviewer' ? '#D9C8A0' : '#8BAFC4',
          flexShrink: 0,
        }} />
        {ROLE_LABEL[role]}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ opacity: 0.7 }}>
          <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
            background: '#F7F4EE', border: '1px solid #E5E2DC',
            borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            minWidth: 160, overflow: 'hidden',
          }}>
            <p style={{ fontSize: 11, color: '#8A8680', padding: '10px 14px 6px', letterSpacing: '0.04em' }}>
              切换身份
            </p>
            {(['reviewer', 'developer'] as const).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', textAlign: 'left',
                  fontSize: 13, color: role === r ? '#252525' : '#8A8680',
                  fontWeight: role === r ? 600 : 400,
                  background: role === r ? '#EDE9E1' : 'none',
                  border: 'none', cursor: 'pointer',
                  padding: '8px 14px',
                }}
                onMouseOver={e => { if (role !== r) e.currentTarget.style.background = '#F2EFE9' }}
                onMouseOut={e => { if (role !== r) e.currentTarget.style.background = 'none' }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: r === 'reviewer' ? '#252525' : '#5A6A7A',
                }} />
                {ROLE_LABEL[r]}
                {role === r && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto' }}>
                    <path d="M2 6L5 9L10 3" stroke="#252525" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

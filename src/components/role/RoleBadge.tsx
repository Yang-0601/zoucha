'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function RoleBadge() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Not logged in — static read-only badge
  if (!user) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 500, color: '#F7F4EE',
        background: '#5A6A7A', borderRadius: 6,
        padding: '4px 10px', letterSpacing: '0.02em',
        userSelect: 'none',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8BAFC4', flexShrink: 0 }} />
        开发者 · 只读
      </div>
    )
  }

  // Logged in — reviewer badge with logout dropdown
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 500, color: '#F7F4EE',
          background: '#252525', border: 'none', borderRadius: 6,
          padding: '4px 10px', cursor: 'pointer',
          letterSpacing: '0.02em', outline: 'none',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D9C8A0', flexShrink: 0 }} />
        验收人员
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ opacity: 0.7 }}>
          <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
            background: '#F7F4EE', border: '1px solid #E5E2DC',
            borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            minWidth: 200, overflow: 'hidden',
          }}>
            <p style={{
              fontSize: 11, color: '#8A8680',
              padding: '10px 14px 8px', letterSpacing: '0.02em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user.email}
            </p>
            <div style={{ height: 1, background: '#E5E2DC' }} />
            <button
              onClick={async () => {
                setOpen(false)
                await supabase.auth.signOut()
                router.replace('/login')
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                fontSize: 13, color: '#B85C5C',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '9px 14px', outline: 'none',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#FEF2F2')}
              onMouseOut={e => (e.currentTarget.style.background = 'none')}
            >
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  )
}

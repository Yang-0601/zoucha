'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const T = {
  paper:   '#F7F4EE',
  warm:    '#EDE9E1',
  charcoal:'#252525',
  ink:     '#3D3A36',
  mist:    '#8A8680',
  border:  '#E5E2DC',
  gold:    '#D9C8A0',
  red:     '#B85C5C',
  green:   '#5E7A53',
  surface: '#FDFAF5',
}

function Input({
  label, type, value, onChange, placeholder, autoComplete,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label style={{ fontSize: 12, color: T.ink, fontWeight: 500, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%', padding: '9px 12px', fontSize: 13,
          background: T.paper, border: `1px solid ${T.border}`,
          borderRadius: 7, outline: 'none', color: T.charcoal,
          boxSizing: 'border-box', transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
        onBlur={e => (e.currentTarget.style.borderColor = T.border)}
      />
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function switchMode(m: 'login' | 'register') {
    setMode(m); setError(null); setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(null); setSubmitting(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('注册成功！请查收确认邮件，点击链接后返回此处登录。')
        switchMode('login')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Invalid login credentials')) setError('邮箱或密码错误')
      else if (msg.includes('already registered')) setError('该邮箱已注册，请直接登录')
      else if (msg.includes('Password should be')) setError('密码至少需要 6 位')
      else if (msg.includes('Unable to validate')) setError('邮箱格式不正确')
      else setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: T.paper, padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: '40px 36px',
        boxShadow: '0 4px 24px rgba(37,37,37,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 32, height: 32, background: T.charcoal, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color: T.paper, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>DI</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.charcoal, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              设计走查
            </p>
            <p style={{ fontSize: 11, color: T.mist, lineHeight: 1.3 }}>Design Review Tool</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: T.warm, borderRadius: 8, padding: 4, marginBottom: 28,
        }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: '7px 0', fontSize: 13,
                fontWeight: mode === m ? 600 : 400,
                color: mode === m ? T.charcoal : T.mist,
                background: mode === m ? T.paper : 'transparent',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                transition: 'all 0.15s', outline: 'none',
              }}
            >
              {m === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="邮箱" type="email" value={email} onChange={setEmail}
            placeholder="your@email.com" autoComplete="email"
          />
          <Input
            label="密码" type="password" value={password} onChange={setPassword}
            placeholder="至少 6 位" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && (
            <div style={{
              fontSize: 12, color: T.red, background: `${T.red}12`,
              border: `1px solid ${T.red}28`, borderRadius: 6, padding: '8px 12px',
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              fontSize: 12, color: T.green, background: `${T.green}12`,
              border: `1px solid ${T.green}28`, borderRadius: 6, padding: '8px 12px',
            }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 4, padding: '10px 0', fontSize: 13, fontWeight: 600,
              color: T.paper,
              background: submitting ? T.mist : T.charcoal,
              border: 'none', borderRadius: 8,
              cursor: submitting ? 'not-allowed' : 'pointer',
              outline: 'none', transition: 'background 0.15s',
            }}
            onMouseOver={e => { if (!submitting) e.currentTarget.style.background = T.ink }}
            onMouseOut={e => { if (!submitting) e.currentTarget.style.background = submitting ? T.mist : T.charcoal }}
          >
            {submitting ? '处理中…' : mode === 'login' ? '登录' : '注册账号'}
          </button>
        </form>
      </div>
    </div>
  )
}

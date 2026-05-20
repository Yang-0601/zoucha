'use client'

import dynamic from 'next/dynamic'

const AuthPage = dynamic(() => import('@/components/auth/AuthPage'), { ssr: false })

export default function LoginPage() {
  return <AuthPage />
}

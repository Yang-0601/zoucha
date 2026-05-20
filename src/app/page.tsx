'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store'
import AIConfigModal from '@/components/shared/AIConfigModal'

const ProjectListPage = dynamic(() => import('@/components/projects/ProjectListPage'), { ssr: false })

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#F7F4EE',
    }}>
      <span style={{ fontSize: 13, color: '#8A8680' }}>加载中…</span>
    </div>
  )
}

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const setRole = useAppStore(s => s.setRole)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    setRole('reviewer')
  }, [user, loading, router, setRole])

  if (loading || !user) return <LoadingScreen />

  return (
    <>
      <ProjectListPage />
      <AIConfigModal />
    </>
  )
}

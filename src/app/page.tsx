'use client'

import dynamic from 'next/dynamic'
import { useAppStore } from '@/store'
import AIConfigModal from '@/components/shared/AIConfigModal'

const ProjectListPage = dynamic(() => import('@/components/projects/ProjectListPage'), { ssr: false })
const RoleSelectPage  = dynamic(() => import('@/components/role/RoleSelectPage'),  { ssr: false })

export default function Home() {
  const role = useAppStore(s => s.role)

  if (role === null) return <RoleSelectPage />

  return (
    <>
      <ProjectListPage />
      <AIConfigModal />
    </>
  )
}

'use client'

import { use } from 'react'
import dynamic from 'next/dynamic'
import AIConfigModal from '@/components/shared/AIConfigModal'

const VersionListPage = dynamic(() => import('@/components/projects/VersionListPage'), { ssr: false })

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <>
      <VersionListPage projectId={id} />
      <AIConfigModal />
    </>
  )
}

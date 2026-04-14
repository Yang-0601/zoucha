'use client'

import { use } from 'react'
import dynamic from 'next/dynamic'
import AIConfigModal from '@/components/shared/AIConfigModal'

const UploadPage = dynamic(() => import('@/components/upload/UploadPage'), { ssr: false })

export default function VersionUploadPage({ params }: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = use(params)
  return (
    <>
      <UploadPage projectId={id} versionId={vid} />
      <AIConfigModal />
    </>
  )
}

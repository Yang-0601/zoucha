'use client'

import { use } from 'react'
import dynamic from 'next/dynamic'
import AIConfigModal from '@/components/shared/AIConfigModal'

const ReviewWorkbench = dynamic(
  () => import('@/components/review/ReviewWorkbench'),
  { ssr: false },
)

export default function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>
}) {
  const { id, vid } = use(params)
  return (
    <>
      <ReviewWorkbench projectId={id} versionId={vid} />
      <AIConfigModal />
    </>
  )
}

'use client'

import dynamic from 'next/dynamic'
import AIConfigModal from '@/components/shared/AIConfigModal'

const ReviewWorkbench = dynamic(
  () => import('@/components/review/ReviewWorkbench'),
  { ssr: false },
)

export default function AnalysisPage() {
  return (
    <>
      <ReviewWorkbench />
      <AIConfigModal />
    </>
  )
}

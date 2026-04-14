'use client'

import dynamic from 'next/dynamic'
import AIConfigModal from '@/components/shared/AIConfigModal'

const Workbench = dynamic(() => import('@/components/workbench/Workbench'), { ssr: false })

export default function VersionWorkbenchPage() {
  return (
    <>
      <Workbench />
      <AIConfigModal />
    </>
  )
}

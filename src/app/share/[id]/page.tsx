import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ShareView from './ShareView'
import type { Annotation, DiffRecord } from '@/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `设计走查分享 · ${id}` }
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('share_snapshots')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  // 如果已过期
  if (data.expires_at && new Date(data.expires_at) < new Date()) notFound()

  return (
    <ShareView
      id={id}
      designUrl={data.design_url}
      liveUrl={data.live_url}
      annotations={data.annotations as Annotation[]}
      diffs={data.diffs as DiffRecord[]}
      createdAt={data.created_at}
    />
  )
}

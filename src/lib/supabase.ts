import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** 浏览器端客户端（匿名权限，用于读取分享快照） */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** 服务端客户端（service_role，用于 API Route 写入） */
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量')
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
}

export const STORAGE_BUCKET = 'share-images'

export interface ShareSnapshot {
  id: string
  design_url: string
  live_url: string
  annotations: unknown[]
  diffs: unknown[]
  created_at: string
  expires_at: string | null
}

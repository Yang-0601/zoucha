import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { createServerClient, STORAGE_BUCKET } from '@/lib/supabase'

// POST /api/share
// Body: { designDataUrl, liveDataUrl, annotations, diffs }
// Returns: { id, url }
export async function POST(req: NextRequest) {
  try {
    const { designDataUrl, liveDataUrl, annotations, diffs } = await req.json()

    if (!designDataUrl || !liveDataUrl) {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 })
    }

    const supabase = createServerClient()
    const id = nanoid(8)

    // ── 上传两张图到 Storage ──────────────────────────────────────────────
    async function uploadDataUrl(dataUrl: string, filename: string): Promise<string> {
      // dataUrl = "data:image/png;base64,..."
      const [meta, b64] = dataUrl.split(',')
      const mime = meta.split(':')[1].split(';')[0]
      const buf = Buffer.from(b64, 'base64')
      const path = `${id}/${filename}`

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, buf, { contentType: mime, upsert: false })

      if (error) throw new Error(`上传失败: ${error.message}`)

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      return data.publicUrl
    }

    const [designUrl, liveUrl] = await Promise.all([
      uploadDataUrl(designDataUrl, 'design.png'),
      uploadDataUrl(liveDataUrl, 'live.png'),
    ])

    // ── 写入快照表 ────────────────────────────────────────────────────────
    const { error: dbError } = await supabase
      .from('share_snapshots')
      .insert({ id, design_url: designUrl, live_url: liveUrl, annotations, diffs })

    if (dbError) throw new Error(`数据库写入失败: ${dbError.message}`)

    const origin = req.headers.get('origin') ?? ''
    return NextResponse.json({ id, url: `${origin}/share/${id}` })
  } catch (err) {
    console.error('[/api/share POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

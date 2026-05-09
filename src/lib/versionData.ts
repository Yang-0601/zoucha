import { supabase } from './supabase'
import { Annotation, DiffRecord, ImageFile } from '@/types'

export const VERSION_IMAGES_BUCKET = 'version-images'

export interface VersionDataSnapshot {
  designImage: ImageFile | null
  liveImage: ImageFile | null
  annotations: Annotation[]
  diffs: DiffRecord[]
}

/**
 * Upload a blob URL to Supabase Storage and return the permanent public URL.
 */
export async function uploadVersionImage(
  versionId: string,
  type: 'design' | 'live',
  blobUrl: string,
): Promise<string> {
  const res = await fetch(blobUrl)
  const blob = await res.blob()
  const ext =
    blob.type === 'image/png'
      ? 'png'
      : blob.type === 'image/webp'
        ? 'webp'
        : 'jpg'
  const path = `${versionId}/${type}.${ext}`
  const { error } = await supabase.storage
    .from(VERSION_IMAGES_BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type })
  if (error) throw error
  const { data } = supabase.storage.from(VERSION_IMAGES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Upsert annotations, diffs and image URLs for a version.
 */
export async function saveVersionData(
  versionId: string,
  snapshot: {
    designImage: ImageFile | null
    liveImage: ImageFile | null
    annotations: Annotation[]
    diffs: DiffRecord[]
  },
): Promise<void> {
  const row = {
    version_id: versionId,
    design_url: snapshot.designImage?.storedUrl ?? snapshot.designImage?.url ?? null,
    design_width: snapshot.designImage?.width ?? null,
    design_height: snapshot.designImage?.height ?? null,
    live_url: snapshot.liveImage?.storedUrl ?? snapshot.liveImage?.url ?? null,
    live_width: snapshot.liveImage?.width ?? null,
    live_height: snapshot.liveImage?.height ?? null,
    annotations: snapshot.annotations,
    diffs: snapshot.diffs,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('version_data')
    .upsert(row, { onConflict: 'version_id' })
  if (error) throw error
}

/**
 * Load version data from Supabase. Returns null when no row exists yet.
 */
export async function loadVersionData(
  versionId: string,
): Promise<VersionDataSnapshot | null> {
  const { data, error } = await supabase
    .from('version_data')
    .select('*')
    .eq('version_id', versionId)
    .maybeSingle()
  if (error || !data) return null
  return {
    designImage: data.design_url
      ? {
          url: data.design_url,
          storedUrl: data.design_url,
          width: data.design_width ?? 0,
          height: data.design_height ?? 0,
        }
      : null,
    liveImage: data.live_url
      ? {
          url: data.live_url,
          storedUrl: data.live_url,
          width: data.live_width ?? 0,
          height: data.live_height ?? 0,
        }
      : null,
    annotations: (data.annotations as Annotation[]) ?? [],
    diffs: (data.diffs as DiffRecord[]) ?? [],
  }
}

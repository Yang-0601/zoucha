'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { loadVersionData, saveVersionData, uploadVersionImage } from '@/lib/versionData'
import { supabase } from '@/lib/supabase'

/**
 * Syncs version data between Supabase and the Zustand store.
 *
 * - On mount (or when versionId changes): if no images are loaded, pull from Supabase.
 * - If images exist (just uploaded), upload blobs to Storage then immediately save.
 * - Auto-saves annotations + diffs (debounced 1.5 s) whenever they change.
 * - Sets versionSynced=true once the initial load attempt completes (even if empty).
 * - targetWidth is stored in DB and restored on load so all devices render at the same scale.
 */
export function useVersionSync(versionId: string | null) {
  const {
    designImage,
    liveImage,
    annotations,
    diffs,
    guidelinesMap,
    setDesignImage,
    setLiveImage,
    setAnnotations,
    setDiffs,
    setGuidelinesMap,
    setTargetWidth,
    setVersionLoading,
    setVersionSynced,
  } = useAppStore()

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedKeyRef = useRef<string>('')
  const loadingRef = useRef(false)

  // ── Load or persist images on mount / version change ──────────────────────
  useEffect(() => {
    if (!versionId) {
      setVersionSynced(true)   // no version = nothing to sync
      return
    }

    // Reset sync flag whenever we switch to a new version
    setVersionSynced(false)

    const currentDesign = useAppStore.getState().designImage
    const currentLive = useAppStore.getState().liveImage

    // Only use the "upload blobs" path when images are fresh blobs not yet in Storage.
    // If images already have storedUrls (restored from in-memory snapshot), load fresh
    // data from Supabase so we always get the latest annotations/diffs/guidelines.
    const hasUnuploadedBlobs =
      (currentDesign && !currentDesign.storedUrl && currentDesign.url.startsWith('blob:')) ||
      (currentLive && !currentLive.storedUrl && currentLive.url.startsWith('blob:'))

    if (!currentDesign || !currentLive || !hasUnuploadedBlobs) {
      // No images in store, or images already stored — load fresh from Supabase
      if (loadingRef.current) return
      loadingRef.current = true
      setVersionLoading(true)
      loadVersionData(versionId)
        .then(snapshot => {
          if (snapshot) {
            if (snapshot.designImage) setDesignImage(snapshot.designImage)
            if (snapshot.liveImage) setLiveImage(snapshot.liveImage)
            setAnnotations(snapshot.annotations)
            setDiffs(snapshot.diffs)
            setGuidelinesMap(snapshot.guidelinesMap)
            // Restore the targetWidth that was selected at upload time so all devices
            // render at the same scale. Fall back to the design image's pixel width
            // for versions saved before this field was introduced.
            if (snapshot.targetWidth && snapshot.targetWidth > 0) {
              setTargetWidth(snapshot.targetWidth)
            } else if (snapshot.designImage && snapshot.designImage.width > 0) {
              setTargetWidth(snapshot.designImage.width)
            }
            lastSavedKeyRef.current = JSON.stringify({
              a: snapshot.annotations,
              d: snapshot.diffs,
              g: snapshot.guidelinesMap,
            })
          }
          // Set synced inside .then() so it batches with setDesignImage in the same
          // React render — prevents a brief window where versionSynced=true but
          // designImage=null that could trigger a false redirect to the upload page.
          setVersionLoading(false)
          setVersionSynced(true)
          loadingRef.current = false
        })
        .catch(err => {
          console.error('[useVersionSync] load error', err)
          setVersionLoading(false)
          setVersionSynced(true)
          loadingRef.current = false
        })
    } else {
      // Images exist — came from upload page. Upload blobs if not yet stored.
      const ensureStored = async () => {
        let design = currentDesign
        let live = currentLive

        if (!design.storedUrl && design.url.startsWith('blob:')) {
          try {
            const url = await uploadVersionImage(versionId, 'design', design.url)
            design = { ...design, storedUrl: url }
            setDesignImage(design)
          } catch (err) {
            console.error('[useVersionSync] design image upload error', err)
          }
        }

        if (!live.storedUrl && live.url.startsWith('blob:')) {
          try {
            const url = await uploadVersionImage(versionId, 'live', live.url)
            live = { ...live, storedUrl: url }
            setLiveImage(live)
          } catch (err) {
            console.error('[useVersionSync] live image upload error', err)
          }
        }

        const state = useAppStore.getState()
        await saveVersionData(versionId, {
          designImage: design,
          liveImage: live,
          annotations: state.annotations,
          diffs: state.diffs,
          guidelinesMap: state.guidelinesMap,
          targetWidth: state.targetWidth,
        })
        lastSavedKeyRef.current = JSON.stringify({
          a: state.annotations,
          d: state.diffs,
          g: state.guidelinesMap,
        })
      }

      ensureStored()
        .catch(err => console.error('[useVersionSync] initial save error', err))
        .finally(() => setVersionSynced(true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId])

  // ── Debounced auto-save when annotations / diffs / guidelines change ─────
  useEffect(() => {
    if (!versionId || !designImage || !liveImage) return

    const key = JSON.stringify({ a: annotations, d: diffs, g: guidelinesMap })
    if (key === lastSavedKeyRef.current) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      // Skip writes for unauthenticated users (developers using shared links)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const state = useAppStore.getState()
        await saveVersionData(versionId, {
          designImage,
          liveImage,
          annotations,
          diffs,
          guidelinesMap,
          targetWidth: state.targetWidth,
        })
        lastSavedKeyRef.current = key
      } catch (err) {
        console.error('[useVersionSync] auto-save error', err instanceof Error ? err.message : err)
      }
    }, 1500)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
        // Flush unsaved changes immediately when leaving the page
        const s = useAppStore.getState()
        if (s.designImage && s.liveImage) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) return
            saveVersionData(versionId, {
              designImage: s.designImage!,
              liveImage: s.liveImage!,
              annotations: s.annotations,
              diffs: s.diffs,
              guidelinesMap: s.guidelinesMap,
              targetWidth: s.targetWidth,
            }).catch(err => console.error('[useVersionSync] flush save error', err))
          })
        }
      }
    }
  }, [versionId, annotations, diffs, guidelinesMap, designImage, liveImage])
}

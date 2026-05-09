'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { loadVersionData, saveVersionData, uploadVersionImage } from '@/lib/versionData'

/**
 * Syncs version data between Supabase and the Zustand store.
 *
 * - On mount (or when versionId changes): if no images are loaded, pull from Supabase.
 * - If images exist (just uploaded), upload blobs to Storage then immediately save.
 * - Auto-saves annotations + diffs (debounced 1.5 s) whenever they change.
 */
export function useVersionSync(versionId: string | null) {
  const {
    designImage,
    liveImage,
    annotations,
    diffs,
    setDesignImage,
    setLiveImage,
    setAnnotations,
    setDiffs,
    setVersionLoading,
  } = useAppStore()

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track what we last saved so we don't spam identical saves
  const lastSavedKeyRef = useRef<string>('')
  // Guard against running two loads simultaneously
  const loadingRef = useRef(false)

  // ── Load or persist images on mount / version change ──────────────────────
  useEffect(() => {
    if (!versionId) return

    const currentDesign = useAppStore.getState().designImage
    const currentLive = useAppStore.getState().liveImage

    if (!currentDesign || !currentLive) {
      // No images in store — try loading from Supabase
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
            // Mark as saved so auto-save doesn't fire immediately
            lastSavedKeyRef.current = JSON.stringify({
              a: snapshot.annotations,
              d: snapshot.diffs,
            })
          }
        })
        .catch(err => console.error('[useVersionSync] load error', err))
        .finally(() => {
          setVersionLoading(false)
          loadingRef.current = false
        })
    } else {
      // Images exist — came from upload page. Upload blobs if they aren't stored yet.
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

        // Save immediately with current annotations/diffs
        const state = useAppStore.getState()
        await saveVersionData(versionId, {
          designImage: design,
          liveImage: live,
          annotations: state.annotations,
          diffs: state.diffs,
        })
        lastSavedKeyRef.current = JSON.stringify({
          a: state.annotations,
          d: state.diffs,
        })
      }

      ensureStored().catch(err => console.error('[useVersionSync] initial save error', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId])

  // ── Debounced auto-save when annotations / diffs change ───────────────────
  useEffect(() => {
    if (!versionId || !designImage || !liveImage) return

    const key = JSON.stringify({ a: annotations, d: diffs })
    if (key === lastSavedKeyRef.current) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveVersionData(versionId, { designImage, liveImage, annotations, diffs })
        lastSavedKeyRef.current = key
      } catch (err) {
        console.error('[useVersionSync] auto-save error', err)
      }
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [versionId, annotations, diffs, designImage, liveImage])
}

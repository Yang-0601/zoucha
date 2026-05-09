import { ImageFile } from '@/types'

/**
 * Scale an image file to a target width (proportionally) using OffscreenCanvas.
 * Returns a new ImageFile with scaledUrl, scaledWidth, scaledHeight set.
 */
export async function scaleImageToWidth(
  imgFile: ImageFile,
  targetWidth: number
): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Set crossOrigin for https URLs so canvas.toDataURL() works without tainting
    if (imgFile.url.startsWith('http://') || imgFile.url.startsWith('https://')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => {
      const ratio = targetWidth / img.naturalWidth
      const scaledHeight = Math.round(img.naturalHeight * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = scaledHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, targetWidth, scaledHeight)
      try {
        const scaledUrl = canvas.toDataURL('image/png')
        resolve({
          ...imgFile,
          scaledUrl,
          scaledWidth: targetWidth,
          scaledHeight,
        })
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${imgFile.url}`))
    img.src = imgFile.url
  })
}

/** Read a File and return an ImageFile with natural dimensions */
export async function readImageFile(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ file, url, width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => reject(new Error(`Failed to read image file: ${file.name}`))
    img.src = url
  })
}

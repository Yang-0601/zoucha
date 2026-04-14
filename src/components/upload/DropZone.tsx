'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import clsx from 'clsx'
import { readImageFile } from '@/lib/imageUtils'
import { ImageFile } from '@/types'

interface DropZoneProps {
  label: string
  image: ImageFile | null
  onImage: (img: ImageFile) => void
  onClear: () => void
}

export default function DropZone({ label, image, onImage, onClear }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.match(/^image\/(png|jpeg|webp)$/)) return
      if (file.size > 20 * 1024 * 1024) { alert('文件大小不能超过 20MB'); return }
      const img = await readImageFile(file)
      onImage(img)
    },
    [onImage]
  )

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) { const file = item.getAsFile(); if (file) handleFile(file) }
  }, [handleFile])

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      {/* Label */}
      <p style={{ fontSize: 11, fontWeight: 500, color: '#8A8680', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </p>

      {image ? (
        /* Filled state */
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{ minHeight: 280, background: '#F0EDE6', border: '1px solid #E5E2DC' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.scaledUrl ?? image.url}
            alt={label}
            className="max-w-full max-h-72 object-contain"
          />
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <span style={{
              fontSize: 10, color: '#8A8680',
              background: 'rgba(247,244,238,0.9)',
              border: '1px solid #E5E2DC',
              padding: '2px 7px',
            }}>
              {image.scaledWidth ?? image.width} × {image.scaledHeight ?? image.height}
            </span>
            <button
              onClick={onClear}
              aria-label="移除图片"
              className="flex items-center justify-center transition-colors duration-150"
              style={{
                width: 22, height: 22,
                background: 'rgba(247,244,238,0.9)',
                border: '1px solid #E5E2DC',
                color: '#8A8680',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#252525')}
              onMouseOut={e => (e.currentTarget.style.color = '#8A8680')}
            >
              <X size={11} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : (
        /* Empty drop state */
        <div
          tabIndex={0}
          role="button"
          aria-label={`上传${label}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onPaste={onPaste}
          onClick={() => inputRef.current?.click()}
          className={clsx('flex flex-col items-center justify-center gap-4 select-none outline-none transition-colors duration-200')}
          style={{
            minHeight: 280,
            padding: 32,
            border: `1px dashed ${dragging ? '#D9C8A0' : '#D7D5D1'}`,
            background: dragging ? '#F3F0E8' : 'transparent',
            cursor: 'pointer',
          }}
        >
          <Upload
            size={20}
            strokeWidth={1.5}
            style={{ color: dragging ? '#D9C8A0' : '#C4B99A' }}
          />
          <div className="text-center">
            <p style={{ fontSize: 13, color: '#3D3A36', lineHeight: 1.6 }}>
              拖拽、点击或 Ctrl+V 粘贴
            </p>
            <p style={{ fontSize: 11, color: '#C4B99A', marginTop: 4 }}>
              PNG · JPG · WebP · 最大 20 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}

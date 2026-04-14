'use client'

import clsx from 'clsx'
import { useAppStore, PRESET_WIDTHS_LIST } from '@/store'

const PRESET_LABELS: Record<number, string> = {
  375: '375 · iOS',
  390: '390 · iPhone 14/15',
  750: '750 · 2×',
  768: '768 · 平板',
  1280: '1280 · PC 中',
  1440: '1440 · PC 标准',
  1920: '1920 · 大屏',
}

export default function WidthSelector() {
  const { targetWidth, setTargetWidth, customWidth, setCustomWidth } = useAppStore()

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setCustomWidth(v)
    const n = parseInt(v, 10)
    if (!isNaN(n) && n >= 240 && n <= 3840) setTargetWidth(n)
  }

  return (
    <div className="flex flex-col gap-3">
      <p style={{ fontSize: 11, fontWeight: 500, color: '#8A8680', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        规格宽度
      </p>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_WIDTHS_LIST.map((w) => {
          const active = targetWidth === w && customWidth === ''
          return (
            <button
              key={w}
              onClick={() => { setTargetWidth(w); setCustomWidth('') }}
              className="transition-colors duration-150"
              style={{
                fontSize: 12,
                fontWeight: active ? 500 : 400,
                color: active ? '#F7F4EE' : '#3D3A36',
                background: active ? '#252525' : 'transparent',
                border: `1px solid ${active ? '#252525' : '#D7D5D1'}`,
                borderRadius: 6,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
              onMouseOver={e => { if (!active) e.currentTarget.style.borderColor = '#8A8680' }}
              onMouseOut={e => { if (!active) e.currentTarget.style.borderColor = '#D7D5D1' }}
            >
              {PRESET_LABELS[w] ?? `${w}px`}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <span style={{ fontSize: 12, color: '#8A8680' }}>自定义</span>
        <input
          type="number"
          min={240}
          max={3840}
          placeholder="240–3840"
          value={customWidth}
          onChange={handleCustomChange}
          className={clsx('outline-none transition-colors duration-150')}
          style={{
            width: 88,
            fontSize: 12,
            color: '#252525',
            background: 'transparent',
            border: `1px solid ${customWidth !== '' ? '#252525' : '#D7D5D1'}`,
            borderRadius: 6,
            padding: '6px 10px',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#252525')}
          onBlur={e => (e.currentTarget.style.borderColor = customWidth !== '' ? '#252525' : '#D7D5D1')}
        />
        <span style={{ fontSize: 12, color: '#8A8680' }}>px</span>
      </div>
    </div>
  )
}

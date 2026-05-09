'use client'

import React from 'react'
import { useAppStore } from '@/store'

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#8A8680', whiteSpace: 'nowrap' }}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{
          width: 88,
          accentColor: '#252525',
          cursor: 'pointer',
        }}
      />
      <span style={{ fontSize: 11, color: '#3D3A36', width: 30, textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  )
}

export default function OverlapControls() {
  const {
    designOpacity,
    liveOpacity,
    setDesignOpacity,
    setLiveOpacity,
    differenceBlend,
    setDifferenceBlend,
    liveOffsetX,
    liveOffsetY,
  } = useAppStore()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 14px',
      background: '#F7F4EE',
      border: '1px solid #E5E2DC',
      borderRadius: 10,
      boxShadow: '0 2px 12px rgba(37,37,37,0.08)',
    }}>
      <Slider label="设计稿" value={designOpacity} onChange={setDesignOpacity} />

      <div style={{ width: 1, height: 14, background: '#E5E2DC', flexShrink: 0 }} />

      <Slider label="线上稿" value={liveOpacity} onChange={setLiveOpacity} />

      <div style={{ width: 1, height: 14, background: '#E5E2DC', flexShrink: 0 }} />

      <button
        onClick={() => setDifferenceBlend(!differenceBlend)}
        style={{
          fontSize: 11,
          fontWeight: differenceBlend ? 600 : 400,
          color: differenceBlend ? '#252525' : '#8A8680',
          background: differenceBlend ? '#EDE9E1' : 'transparent',
          border: `1px solid ${differenceBlend ? '#D7D5D1' : 'transparent'}`,
          borderRadius: 5,
          padding: '3px 9px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          outline: 'none',
          transition: 'all 0.15s',
        }}
        onMouseOver={e => { if (!differenceBlend) e.currentTarget.style.color = '#3D3A36' }}
        onMouseOut={e => { if (!differenceBlend) e.currentTarget.style.color = '#8A8680' }}
      >
        差值混合
      </button>

      <div style={{ width: 1, height: 14, background: '#E5E2DC', flexShrink: 0 }} />

      <span style={{ fontSize: 10, color: '#C4B99A', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
        X {liveOffsetX} · Y {liveOffsetY}
      </span>
    </div>
  )
}

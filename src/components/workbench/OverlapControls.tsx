'use client'

import React from 'react'
import { useAppStore } from '@/store'

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
    <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg px-4 py-3 flex items-center gap-5 text-xs">
      {/* Design opacity */}
      <div className="flex items-center gap-2">
        <span className="text-gray-600 w-14 text-right">设计稿</span>
        <input
          type="range"
          min={0}
          max={100}
          value={designOpacity}
          onChange={(e) => setDesignOpacity(+e.target.value)}
          className="w-24 accent-blue-600"
        />
        <span className="text-gray-500 w-8">{designOpacity}%</span>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* Live opacity */}
      <div className="flex items-center gap-2">
        <span className="text-gray-600 w-14 text-right">线上稿</span>
        <input
          type="range"
          min={0}
          max={100}
          value={liveOpacity}
          onChange={(e) => setLiveOpacity(+e.target.value)}
          className="w-24 accent-blue-600"
        />
        <span className="text-gray-500 w-8">{liveOpacity}%</span>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* Blend mode */}
      <button
        onClick={() => setDifferenceBlend(!differenceBlend)}
        className={`px-2 py-1 rounded-md border text-xs transition-all ${
          differenceBlend
            ? 'bg-purple-600 text-white border-purple-600'
            : 'border-gray-200 text-gray-600 hover:border-purple-400'
        }`}
      >
        差值混合
      </button>

      {/* Offset display */}
      <div className="text-gray-400 text-[10px]">
        X {liveOffsetX} · Y {liveOffsetY}
      </div>
    </div>
  )
}

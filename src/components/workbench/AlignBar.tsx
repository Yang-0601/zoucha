'use client'

import React from 'react'
import { useAppStore } from '@/store'
import { AlignStartVertical, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal } from 'lucide-react'
import clsx from 'clsx'

const ALIGNS = [
  { key: 'top' as const, label: '顶对齐', icon: <AlignStartHorizontal size={13} /> },
  { key: 'bottom' as const, label: '底对齐', icon: <AlignEndHorizontal size={13} /> },
  { key: 'left' as const, label: '左对齐', icon: <AlignStartVertical size={13} /> },
  { key: 'right' as const, label: '右对齐', icon: <AlignEndVertical size={13} /> },
]

export default function AlignBar() {
  const { alignViews } = useAppStore()

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-400 mr-1">对齐</span>
      {ALIGNS.map(({ key, label, icon }) => (
        <button
          key={key}
          title={label}
          onClick={() => alignViews(key)}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-gray-600',
            'hover:bg-blue-50 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-200'
          )}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

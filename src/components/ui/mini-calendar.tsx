'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Compact inline month calendar for picking a single future date.
 * Past dates are disabled. Returns dates as `YYYY-MM-DD` strings.
 */
export function MiniCalendar({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' })

  function dayStr(d: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function isPast(d: number) {
    return dayStr(d) < todayStr
  }

  function prev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }

  function next() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="p-1 rounded hover:bg-white/10 text-[#71717a] hover:text-white transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-[#e4e4e7]">{monthLabel}</span>
        <button onClick={next} className="p-1 rounded hover:bg-white/10 text-[#71717a] hover:text-white transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <span key={d} className="text-[9px] font-medium text-[#52525b] py-1">{d}</span>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const ds = dayStr(d)
          const isSelected = ds === value
          const isToday = ds === todayStr
          const past = isPast(d)
          return (
            <button
              key={d}
              type="button"
              onClick={() => !past && onChange(ds)}
              disabled={past}
              className={`text-[11px] font-medium rounded-md py-1 transition-all ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                  : isToday
                    ? 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/25'
                    : past
                      ? 'text-[#3f3f46] cursor-not-allowed'
                      : 'text-[#a1a1aa] hover:bg-white/10 hover:text-white'
              }`}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

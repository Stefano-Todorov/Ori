'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  className?: string
  placeholder?: string
  /** Renders a smaller pill-sized trigger (for inline use next to other controls). */
  compact?: boolean
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function DatePicker({ value, onChange, className = '', placeholder = 'Select date', compact = false }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const today = new Date()
  const selected = value ? new Date(value + 'T00:00:00') : null
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // When value changes externally, sync view
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const todayKey = toDateKey(today)
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function prev() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function next() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function selectDate(day: number) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setOpen(false)
  }

  function goToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    selectDate(today.getDate())
  }

  function clear() {
    onChange('')
    setOpen(false)
  }

  // Build weeks grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const displayValue = selected
    ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center text-left bg-muted dark:bg-[#1e1e2e] border border-border focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all rounded-lg ${
          compact
            ? 'gap-1.5 h-7 px-2.5 text-[11px] font-medium'
            : 'gap-2 w-full h-9 px-3 text-sm'
        }`}
      >
        <Calendar size={compact ? 12 : 14} className="text-muted-foreground shrink-0" />
        <span className={displayValue ? 'text-foreground' : 'text-muted-foreground'}>
          {displayValue || placeholder}
        </span>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-[280px] bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/10 rounded-xl shadow-xl shadow-black/20 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={prev} className="p-1 rounded-md hover:bg-muted/50 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
            <button type="button" onClick={next} className="p-1 rounded-md hover:bg-muted/50 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} className="h-8" />

              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = dateKey === todayKey
              const isSelected = dateKey === value

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`h-8 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all
                    ${isSelected
                      ? 'bg-purple-600 text-white font-bold'
                      : isToday
                        ? 'ring-1 ring-purple-500 text-purple-600 dark:text-purple-400 font-bold'
                        : 'text-foreground hover:bg-muted/60 dark:hover:bg-white/5'
                    }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <button type="button" onClick={clear} className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5">
              Clear
            </button>
            <button type="button" onClick={goToday} className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors px-1 py-0.5">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

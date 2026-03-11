'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ScheduledPost, RecordingDay } from '@/lib/types'

interface Props {
  scheduledPosts: ScheduledPost[]
  recordingDays: RecordingDay[]
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

export function ScheduleCalendar({ scheduledPosts, recordingDays }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const todayKey = toDateKey(today)

  // Build lookup sets
  const scheduledDates = new Set(scheduledPosts.map(p => p.scheduled_date))
  const recordingDates = new Set(recordingDays.map(r => r.recording_date))

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">Calendar</p>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={next} className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
            {d}
          </div>
        ))}

        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="h-10" />

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateKey === todayKey
          const hasScheduled = scheduledDates.has(dateKey)
          const isRecording = recordingDates.has(dateKey)

          return (
            <div
              key={dateKey}
              className={`h-10 flex flex-col items-center justify-center rounded-lg text-xs transition-all relative ${
                isToday ? 'ring-2 ring-purple-500 font-bold text-foreground' : 'text-muted-foreground'
              } ${isRecording ? 'bg-amber-500/10' : ''}`}
            >
              <span>{day}</span>
              {hasScheduled && (
                <div className="flex gap-0.5 mt-0.5">
                  <div className="w-1 h-1 rounded-full bg-purple-500" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <span>Scheduled post</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
          <span>Recording day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded ring-2 ring-purple-500" />
          <span>Today</span>
        </div>
      </div>
    </div>
  )
}

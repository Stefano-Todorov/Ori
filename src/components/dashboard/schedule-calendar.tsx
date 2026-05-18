'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import type { ScheduledPost } from '@/lib/types'

type CalendarView = 'month' | 'week' | 'day'

interface PostWithIdea extends ScheduledPost {
  content_idea?: { id: string; idea: string } | null
}

interface Props {
  scheduledPosts: PostWithIdea[]
  recordingDays?: { id: string; recording_date: string }[]
  /** Enable dropping pipeline ideas onto day cells. Must be inside a DndContext. */
  droppable?: boolean
  /** Whether a drag is currently in progress (highlights drop targets). */
  dragActive?: boolean
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function getWeekStart(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500',
  instagram: 'bg-purple-500',
}

const VIEW_LABELS: { key: CalendarView; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
]

/* ─── Droppable day wrapper ─── */
function DroppableDay({ dateKey, disabled, dragActive, className, children }: {
  dateKey: string
  disabled?: boolean
  dragActive?: boolean
  className: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cal:${dateKey}`, disabled })
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        !disabled && dragActive
          ? isOver
            ? 'ring-2 ring-purple-500 bg-purple-500/20 scale-[1.04]'
            : 'ring-1 ring-purple-500/25'
          : ''
      }`}
    >
      {children}
    </div>
  )
}

export function ScheduleCalendar({ scheduledPosts, droppable = false, dragActive = false }: Props) {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(today)
  const [view, setView] = useState<CalendarView>('month')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const todayKey = toDateKey(today)

  // Group posts by date
  const postsByDate = useMemo(() => {
    const map: Record<string, PostWithIdea[]> = {}
    for (const post of scheduledPosts) {
      const key = post.scheduled_date
      if (!map[key]) map[key] = []
      map[key].push(post)
    }
    return map
  }, [scheduledPosts])

  function prev() {
    if (view === 'month') {
      setCurrentDate(new Date(year, month - 1, 1))
    } else if (view === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1))
    }
  }

  function next() {
    if (view === 'month') {
      setCurrentDate(new Date(year, month + 1, 1))
    } else if (view === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1))
    }
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  // Navigation label
  const navLabel = useMemo(() => {
    if (view === 'month') {
      return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (view === 'week') {
      const ws = getWeekStart(currentDate)
      const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6)
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `${fmt(ws)} – ${fmt(we)}, ${we.getFullYear()}`
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
  }, [view, year, month, currentDate])

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">Calendar</p>
        <div className="flex items-center gap-1 bg-muted/50 dark:bg-white/[0.04] rounded-lg p-0.5">
          {VIEW_LABELS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                view === v.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={goToToday} className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors">
          Today
        </button>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[180px] text-center">{navLabel}</span>
          <button onClick={next} className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="w-10" />
      </div>

      {droppable && dragActive && (
        <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium text-center">
          Drop on a day to schedule it
        </p>
      )}

      {view === 'month' && <MonthView year={year} month={month} todayKey={todayKey} postsByDate={postsByDate} droppable={droppable} dragActive={dragActive} />}
      {view === 'week' && <WeekView currentDate={currentDate} todayKey={todayKey} postsByDate={postsByDate} droppable={droppable} dragActive={dragActive} />}
      {view === 'day' && <DayView currentDate={currentDate} todayKey={todayKey} postsByDate={postsByDate} droppable={droppable} dragActive={dragActive} />}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded ring-2 ring-purple-500" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
          <span>TikTok</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <span>Instagram</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Month View ─── */
function MonthView({ year, month, todayKey, postsByDate, droppable, dragActive }: {
  year: number; month: number; todayKey: string; postsByDate: Record<string, PostWithIdea[]>
  droppable: boolean; dragActive: boolean
}) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  return (
    <div className="grid grid-cols-7 gap-px">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
        <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
          {d}
        </div>
      ))}
      {weeks.flat().map((day, i) => {
        if (day === null) return <div key={`empty-${i}`} className="h-16" />
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const isToday = dateKey === todayKey
        const posts = postsByDate[dateKey] ?? []
        const cellClass = `h-16 flex flex-col items-center rounded-lg text-xs transition-all relative pt-1 ${
          isToday ? 'ring-2 ring-purple-500 font-bold text-foreground' : 'text-muted-foreground'
        } ${posts.length > 0 ? 'bg-purple-500/5' : ''}`

        const content = (
          <>
            <span>{day}</span>
            {posts.length > 0 && (
              <div className="flex flex-col items-center gap-0.5 mt-1">
                <div className="flex gap-0.5">
                  {posts.slice(0, 3).map((p, pi) => (
                    <div key={pi} className={`w-1.5 h-1.5 rounded-full ${PLATFORM_COLORS[p.platform ?? ''] ?? 'bg-purple-500'}`} />
                  ))}
                </div>
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400">
                  {posts.length} post{posts.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </>
        )

        return droppable ? (
          <DroppableDay key={dateKey} dateKey={dateKey} disabled={dateKey < todayKey} dragActive={dragActive} className={cellClass}>
            {content}
          </DroppableDay>
        ) : (
          <div key={dateKey} className={cellClass}>{content}</div>
        )
      })}
    </div>
  )
}

/* ─── Week View ─── */
function WeekView({ currentDate, todayKey, postsByDate, droppable, dragActive }: {
  currentDate: Date; todayKey: string; postsByDate: Record<string, PostWithIdea[]>
  droppable: boolean; dragActive: boolean
}) {
  const weekStart = getWeekStart(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
    return { date: d, key: toDateKey(d) }
  })

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(({ date, key }) => {
        const isToday = key === todayKey
        const posts = postsByDate[key] ?? []
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' })
        const dayNum = date.getDate()
        const cellClass = `rounded-xl p-2 min-h-[120px] border transition-all ${
          isToday
            ? 'ring-2 ring-purple-500 border-purple-500/30 bg-purple-500/5'
            : 'border-border/50 dark:border-white/5'
        }`

        const content = (
          <>
            <div className="text-center mb-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">{dayLabel}</div>
              <div className={`text-sm font-bold ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-foreground'}`}>{dayNum}</div>
            </div>
            <div className="space-y-1">
              {posts.map((post, pi) => (
                <div
                  key={pi}
                  className="px-1.5 py-1 rounded-md bg-muted/40 dark:bg-white/[0.04] border border-border/30 dark:border-white/5"
                >
                  {post.platform && (
                    <div className={`w-1.5 h-1.5 rounded-full ${PLATFORM_COLORS[post.platform] ?? 'bg-purple-500'} mb-0.5 inline-block mr-1`} />
                  )}
                  <span className="text-[10px] font-medium text-foreground line-clamp-2">
                    {post.title || post.content_idea?.idea || 'Untitled'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )

        return droppable ? (
          <DroppableDay key={key} dateKey={key} disabled={key < todayKey} dragActive={dragActive} className={cellClass}>
            {content}
          </DroppableDay>
        ) : (
          <div key={key} className={cellClass}>{content}</div>
        )
      })}
    </div>
  )
}

/* ─── Day View ─── */
function DayView({ currentDate, todayKey, postsByDate, droppable, dragActive }: {
  currentDate: Date; todayKey: string; postsByDate: Record<string, PostWithIdea[]>
  droppable: boolean; dragActive: boolean
}) {
  const key = toDateKey(currentDate)
  const isToday = key === todayKey
  const posts = postsByDate[key] ?? []
  const cellClass = `rounded-xl p-4 min-h-[200px] border transition-all ${
    isToday ? 'ring-2 ring-purple-500 border-purple-500/30 bg-purple-500/5' : 'border-border/50 dark:border-white/5'
  }`

  const content = (
    <>
      <div className="text-center mb-4">
        <div className={`text-lg font-bold ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-foreground'}`}>
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        {isToday && <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase">Today</span>}
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No posts scheduled for this day</p>
      ) : (
        <div className="space-y-2">
          {posts.map((post, pi) => (
            <div
              key={pi}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-muted/30 dark:bg-white/[0.03] border border-border/50 dark:border-white/5"
            >
              {post.platform && (
                <div className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[post.platform] ?? 'bg-purple-500'} mt-1 shrink-0`} />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {post.title || post.content_idea?.idea || 'Untitled'}
                </p>
                {post.platform && (
                  <span className="text-[10px] text-muted-foreground capitalize">{post.platform}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  return droppable ? (
    <DroppableDay dateKey={key} disabled={key < todayKey} dragActive={dragActive} className={cellClass}>
      {content}
    </DroppableDay>
  ) : (
    <div className={cellClass}>{content}</div>
  )
}

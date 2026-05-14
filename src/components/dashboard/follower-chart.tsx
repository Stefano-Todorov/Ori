'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { FollowerSnapshot, Platform } from '@/lib/types'

interface Props {
  snapshots: FollowerSnapshot[]
  activePlatforms?: Platform[]
}

const ALL_PLATFORMS: { key: Platform | 'all'; label: string; color: string; darkColor?: string }[] = [
  { key: 'all', label: 'All', color: '#7c3aed' },
  { key: 'tiktok', label: 'TikTok', color: '#000000', darkColor: '#ffffff' },
  { key: 'instagram', label: 'Instagram', color: '#E1306C' },
]

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function FollowerChart({ snapshots, activePlatforms }: Props) {
  const PLATFORMS = activePlatforms?.length
    ? ALL_PLATFORMS.filter(p => p.key === 'all' || activePlatforms.includes(p.key as Platform))
    : ALL_PLATFORMS
  const [active, setActive] = useState<Set<Platform | 'all'>>(new Set(['all']))

  const toggle = (key: Platform | 'all') => {
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        if (next.size === 0) next.add('all')
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Group by date
  const byDate: Record<string, Record<string, number>> = {}
  for (const s of snapshots) {
    if (!byDate[s.recorded_at]) byDate[s.recorded_at] = {}
    byDate[s.recorded_at][s.platform] = s.count
  }

  // Build data with carry-forward: if a platform wasn't synced on a date,
  // use its most recent known value so "All" doesn't drop artificially.
  const sortedDates = Object.keys(byDate).sort()
  const lastKnown: Record<string, number> = {}
  const data = sortedDates.map(date => {
    const platforms = byDate[date]
    // Update last known values for platforms present on this date
    for (const [p, v] of Object.entries(platforms)) {
      lastKnown[p] = v
    }
    // "All" uses last known value for every platform we've ever seen
    const all = Object.values(lastKnown).reduce((sum, v) => sum + v, 0)
    return {
      date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      all,
      ...platforms,
    }
  })

  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

  // Zoom Y-axis to fit only the currently-visible lines so variation looks bigger.
  const visibleKeys = PLATFORMS.filter(p => active.has(p.key)).map(p => p.key)
  const visibleValues = data.flatMap(d =>
    visibleKeys.map(k => d[k as keyof typeof d]).filter((v): v is number => typeof v === 'number')
  )
  const minValue = visibleValues.length ? Math.min(...visibleValues) : 0
  const maxValue = visibleValues.length ? Math.max(...visibleValues) : 0
  const range = maxValue - minValue
  const padding = range > 0 ? range * 0.25 : Math.max(maxValue * 0.05, 1)
  const yDomain: [number, number] = [
    Math.max(0, Math.floor(minValue - padding)),
    Math.ceil(maxValue + padding),
  ]

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">Follower Growth</p>
        <div className="flex gap-1.5">
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              onClick={() => toggle(p.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 ${
                active.has(p.key)
                  ? 'text-white shadow-sm'
                  : 'bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground hover:text-foreground'
              }`}
              style={active.has(p.key) ? { backgroundColor: (isDark && p.darkColor) ? p.darkColor : p.color, color: (isDark && p.darkColor) ? '#000' : '#fff' } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Add follower data to see the chart.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis
              tickFormatter={formatNumber}
              tick={{ fontSize: 11 }}
              width={45}
              className="fill-muted-foreground"
              domain={yDomain}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(v: number | undefined) => v != null ? v.toLocaleString() : ''}
              contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', fontSize: '13px' }}
            />
            {PLATFORMS.filter(p => active.has(p.key)).map(p => (
              <Line
                key={p.key}
                type="monotone"
                dataKey={p.key}
                stroke={(isDark && p.darkColor) ? p.darkColor : p.color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: (isDark && p.darkColor) ? p.darkColor : p.color }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

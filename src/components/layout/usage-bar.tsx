'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'

interface UsageData {
  tier: string
  limits: Record<string, number>
  usage: Record<string, number>
}

const FEATURE_LABELS: Record<string, string> = {
  coach_messages: 'Coach',
  script_generations: 'Scripts',
  idea_generations: 'Ideas',
  competitor_analyze: 'Analysis',
  competitor_ideas: 'Comp Ideas',
  downloads: 'Downloads',
}

function barColor(ratio: number): string {
  if (ratio >= 0.9) return 'bg-red-500'
  if (ratio >= 0.7) return 'bg-amber-500'
  return 'bg-purple-500'
}

export function UsageBar() {
  const [data, setData] = useState<UsageData | null>(null)

  useEffect(() => {
    fetch('/api/usage')
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
  }, [])

  if (!data || data.tier === 'starter') {
    // Free tier: show upgrade prompt
    return (
      <div className="p-3 border-t border-border">
        <Link
          href="/dashboard/settings?tab=billing"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 border border-border hover:border-purple-500/30 transition-colors group"
        >
          <Sparkles size={14} className="text-purple-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Want more AI?</p>
            <p className="text-[10px] text-muted-foreground">Upgrade from $4.17/mo</p>
          </div>
        </Link>
      </div>
    )
  }

  // Build usage items for features that have limits (not unlimited, not 0)
  const items = Object.entries(FEATURE_LABELS)
    .map(([key, label]) => {
      const limit = data.limits[key] ?? 0
      const used = data.usage[key] ?? 0
      if (limit === 0) return null // disabled feature
      if (limit === -1) return null // unlimited, no bar needed
      return { key, label, used, limit }
    })
    .filter(Boolean) as { key: string; label: string; used: number; limit: number }[]

  if (items.length === 0) {
    // Studio tier — everything unlimited
    return (
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
          <Zap size={12} className="text-purple-500" />
          <span className="text-[11px] font-semibold text-purple-500">Max</span>
          <span className="text-[10px] text-muted-foreground ml-auto">Unlimited</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 border-t border-border space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Usage</span>
        <Link href="/dashboard/settings?tab=billing" className="text-[10px] font-semibold text-purple-500 hover:text-purple-400 transition-colors capitalize">
          {data.tier}
        </Link>
      </div>
      {items.map(({ key, label, used, limit }) => {
        const ratio = used / limit
        const width = Math.min(ratio * 100, 100)
        return (
          <div key={key} className="space-y-0.5 px-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className={`text-[10px] font-semibold ${ratio >= 0.9 ? 'text-red-500' : ratio >= 0.7 ? 'text-amber-500' : 'text-foreground'}`}>
                {used}/{limit}
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted dark:bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor(ratio)}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

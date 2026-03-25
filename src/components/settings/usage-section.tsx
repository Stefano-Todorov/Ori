'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp } from 'lucide-react'
import { TIER_LIST, type TierSlug } from '@/lib/tiers'

interface UsageData {
  tier: string
  limits: Record<string, number>
  usage: Record<string, number>
}

const FEATURE_ROWS: { key: string; label: string }[] = [
  { key: 'coach_messages', label: 'AI Coach messages' },
  { key: 'script_generations', label: 'Script generations' },
  { key: 'idea_generations', label: 'Idea generations' },
  { key: 'competitor_analyze', label: 'Post analysis' },
  { key: 'competitor_ideas', label: 'Competitor ideas' },
  { key: 'competitors', label: 'Competitors tracked' },
  { key: 'downloads', label: 'Video downloads' },
  { key: 'swipe_saves', label: 'Saved inspo videos' },
]

export function UsageSection() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setUsageData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!usageData) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Unable to load usage data
      </div>
    )
  }

  const currentTier = (usageData.tier ?? 'starter') as TierSlug
  const tierConfig = TIER_LIST.find(t => t.slug === currentTier)
  const periodLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <TrendingUp size={18} className="text-purple-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {periodLabel} usage
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="capitalize">{currentTier}</span> plan
              {tierConfig && tierConfig.price > 0 && ` — $${tierConfig.price}/mo`}
            </p>
          </div>
        </div>
      </div>

      {/* Usage bars */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {FEATURE_ROWS.map(({ key, label }) => {
          const limit = usageData.limits[key] ?? 0
          const used = usageData.usage[key] ?? 0
          const unlimited = limit === -1
          const disabled = limit === 0
          const ratio = unlimited || disabled ? 0 : used / limit

          return (
            <div key={key} className={`space-y-1.5 ${disabled ? 'opacity-40' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{label}</span>
                <span className={`text-xs font-semibold ${
                  disabled ? 'text-muted-foreground' :
                  ratio >= 0.9 ? 'text-red-500' :
                  ratio >= 0.7 ? 'text-amber-500' :
                  'text-muted-foreground'
                }`}>
                  {disabled ? 'Not available' :
                   unlimited ? `${used} used — Unlimited` :
                   `${used} / ${limit}`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted dark:bg-white/5 overflow-hidden">
                {disabled ? null : unlimited ? (
                  <div className="h-full rounded-full bg-purple-500/30 w-full" />
                ) : (
                  <div
                    className={`h-full rounded-full transition-all ${
                      ratio >= 0.9 ? 'bg-red-500' :
                      ratio >= 0.7 ? 'bg-amber-500' :
                      'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Upgrade nudge for starter/plus */}
      {(currentTier === 'starter' || currentTier === 'plus') && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.03] p-4">
          <p className="text-xs text-muted-foreground">
            Need more?{' '}
            <a href="/dashboard/settings?tab=billing" className="text-purple-500 font-semibold hover:underline">
              Upgrade your plan
            </a>
            {' '}to unlock higher limits.
          </p>
        </div>
      )}
    </div>
  )
}

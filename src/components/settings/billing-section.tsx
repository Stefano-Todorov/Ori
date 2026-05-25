'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Sparkles, Loader2, ExternalLink, Crown } from 'lucide-react'
import { TIER_LIST, type TierConfig, type TierSlug } from '@/lib/tiers'

interface UsageData {
  tier: string
  limits: Record<string, number>
  usage: Record<string, number>
}

const FEATURE_ROWS: { key: string; label: string }[] = [
  { key: 'coach_messages', label: 'AI Coach messages' },
  { key: 'script_generations', label: 'Script generations' },
  { key: 'competitors', label: 'Competitors tracked' },
  { key: 'downloads', label: 'Video downloads' },
  { key: 'swipe_saves', label: 'Saved inspiration videos' },
]

function formatLimit(val: number): string {
  if (val === -1) return 'Unlimited'
  if (val === 0) return '—'
  return String(val)
}

function tierAccent(slug: TierSlug): string {
  switch (slug) {
    case 'starter': return 'border-border dark:border-white/10'
    case 'plus': return 'border-blue-500/30'
    case 'pro': return 'border-purple-500/30'
    case 'max': return 'border-amber-500/30'
  }
}

function tierBadgeColor(slug: TierSlug): string {
  switch (slug) {
    case 'starter': return 'bg-muted text-muted-foreground'
    case 'plus': return 'bg-blue-500/15 text-blue-500'
    case 'pro': return 'bg-purple-500/15 text-purple-500'
    case 'max': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  }
}

export function BillingSection() {
  const searchParams = useSearchParams()
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const yearly = false
  const autoCheckoutDone = useRef(false)

  useEffect(() => {
    fetch('/api/usage')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setUsageData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Auto-trigger checkout if redirected from signup with a plan
  useEffect(() => {
    if (autoCheckoutDone.current || loading || !usageData) return
    const planParam = searchParams.get('plan') as TierSlug | null
    if (!planParam) return
    const tier = TIER_LIST.find(t => t.slug === planParam)
    if (!tier || tier.price === 0) return
    // Only auto-checkout if user is on starter (not already subscribed)
    if (usageData.tier !== 'starter') return
    autoCheckoutDone.current = true
    handleCheckout(tier)
  }, [loading, usageData, searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCheckout(tier: TierConfig) {
    if (tier.price === 0) return
    setCheckoutLoading(tier.slug)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierSlug: tier.slug, yearly }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setCheckoutLoading(null)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setPortalLoading(false)
    }
  }

  const currentTier = (usageData?.tier ?? 'starter') as TierSlug

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <Crown size={18} className={currentTier === 'max' ? 'text-amber-500' : currentTier === 'pro' ? 'text-purple-500' : currentTier === 'plus' ? 'text-blue-500' : 'text-muted-foreground'} />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Current plan: <span className="capitalize">{currentTier}</span>
            </p>
            {currentTier !== 'starter' && (
              <p className="text-xs text-muted-foreground">
                ${TIER_LIST.find(t => t.slug === currentTier)?.price}/month
              </p>
            )}
          </div>
        </div>
        {currentTier !== 'starter' && (
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            {portalLoading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
            Manage subscription
          </button>
        )}
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TIER_LIST.map(tier => {
          const isCurrent = tier.slug === currentTier
          return (
            <div
              key={tier.slug}
              className={`rounded-xl border p-4 space-y-3 transition-all ${tierAccent(tier.slug)} ${
                isCurrent ? 'ring-2 ring-purple-500/30 bg-purple-500/[0.03]' : 'bg-card'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierBadgeColor(tier.slug)}`}>
                    {tier.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-500">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {tier.price === 0 ? 'Free' : `$${tier.price}`}
                  {tier.price > 0 && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-1.5">
                {FEATURE_ROWS.map(({ key, label }) => {
                  const val = tier.limits[key as keyof typeof tier.limits]
                  const isDisabled = val === 0
                  return (
                    <div key={key} className="flex items-center justify-between text-[11px]">
                      <span className={isDisabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}>{label}</span>
                      <span className={`font-semibold ${isDisabled ? 'text-muted-foreground/30' : val === -1 ? 'text-purple-500' : 'text-foreground'}`}>
                        {formatLimit(val)}
                      </span>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Sorting limit</span>
                  <span className={`font-semibold ${tier.slug === 'starter' ? 'text-foreground' : 'text-purple-500'}`}>
                    {tier.slug === 'starter' ? '20 posts' : 'Unlimited'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Sorting metrics</span>
                  <span className={`font-semibold ${tier.slug === 'starter' ? 'text-muted-foreground' : 'text-purple-500'}`}>
                    {tier.slug === 'starter' ? 'Likes only' : 'All metrics'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Ideas board</span>
                  <span className="font-semibold text-purple-500">Unlimited</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Content calendar</span>
                  <span className="font-semibold text-green-500">
                    <Check size={12} />
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Auto-import your posts</span>
                  <span className="font-semibold text-green-500">
                    <Check size={12} />
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Chrome extension</span>
                  <span className="font-semibold text-green-500">
                    <Check size={12} />
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Scheduling</span>
                  <span className="font-semibold text-green-500">
                    <Check size={12} />
                  </span>
                </div>
              </div>

              {/* Action button */}
              {isCurrent ? (
                <div className="h-9 flex items-center justify-center rounded-lg bg-muted/50 text-xs font-medium text-muted-foreground">
                  Current plan
                </div>
              ) : tier.price === 0 ? (
                <div className="h-9" /> // no button for free tier
              ) : (
                <button
                  onClick={() => handleCheckout(tier)}
                  disabled={checkoutLoading === tier.slug}
                  className={`w-full h-9 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                    tier.slug === 'max'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:brightness-110'
                      : tier.slug === 'pro'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20 hover:bg-purple-700'
                      : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  {checkoutLoading === tier.slug ? (
                    <Loader2 size={14} className="animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <Sparkles size={12} />
                      {currentTier === 'starter' ? 'Upgrade' : 'Switch'}
                    </span>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Current usage */}
      {usageData && currentTier !== 'starter' && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">This month&apos;s usage</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FEATURE_ROWS.map(({ key, label }) => {
              const limit = usageData.limits[key] ?? 0
              if (limit === 0) return null
              const used = usageData.usage[key] ?? 0
              const unlimited = limit === -1
              const ratio = unlimited ? 0 : used / limit
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                    <span className={`text-[10px] font-semibold ${ratio >= 0.9 ? 'text-red-500' : 'text-foreground'}`}>
                      {unlimited ? `${used} used` : `${used}/${limit}`}
                    </span>
                  </div>
                  {!unlimited && (
                    <div className="h-1.5 rounded-full bg-muted dark:bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${ratio >= 0.9 ? 'bg-red-500' : ratio >= 0.7 ? 'bg-amber-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

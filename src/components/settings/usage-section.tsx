'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TIER_LIST, type TierSlug } from '@/lib/tiers'

interface UsageData {
  tier: string
  limits: Record<string, number>
  usage: Record<string, number>
}

const ICONS: Record<string, string> = {
  coach_messages: '\u{1F916}',
  script_generations: '\u{270D}\uFE0F',
  competitors: '\u{1F50D}',
  downloads: '\u{1F4E5}',
  swipe_saves: '\u{1F516}',
}

interface Section {
  label: string
  rows: { key: string; label: string }[]
}

const SECTIONS: Section[] = [
  {
    label: 'AI Features',
    rows: [
      { key: 'coach_messages', label: 'AI Coach messages' },
      { key: 'script_generations', label: 'Script generations' },
    ],
  },
  {
    label: 'Research',
    rows: [
      { key: 'competitors', label: 'Competitors tracked' },
    ],
  },
  {
    label: 'Content',
    rows: [
      { key: 'downloads', label: 'Video downloads' },
      { key: 'swipe_saves', label: 'Saved inspo videos' },
    ],
  },
]

function tierPillColor(slug: TierSlug) {
  switch (slug) {
    case 'starter': return { bg: 'rgba(217,119,6,0.15)', border: 'rgba(217,119,6,0.3)', text: '#d97706' }
    case 'plus': return { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', text: '#3b82f6' }
    case 'pro': return { bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.3)', text: '#a855f7' }
    case 'max': return { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' }
  }
}

function UsageBar({ ratio, animated }: { ratio: number; animated: boolean }) {
  const pct = Math.min(ratio * 100, 100)
  const color =
    ratio >= 0.86 ? '#dc2626' :
    ratio >= 0.61 ? '#d97706' :
    'url(#purple-grad)'

  return (
    <div className="h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <svg width="100%" height="6" className="block">
        <defs>
          <linearGradient id="purple-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          height="6"
          rx="3"
          ry="3"
          fill={color}
          style={{
            width: animated ? `${pct}%` : '0%',
            transition: 'width 0.6s ease',
          }}
        />
      </svg>
    </div>
  )
}

function ActiveRow({ icon, label, used, limit, animated }: { icon: string; label: string; used: number; limit: number; animated: boolean }) {
  const ratio = used / limit
  return (
    <div className="mb-[14px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-white flex items-center gap-1.5">
          <span>{icon}</span> {label}
        </span>
        <span className="text-[13px]">
          <span className="font-bold text-white">{used}</span>
          <span className="text-[#6b7280]"> / {limit}</span>
        </span>
      </div>
      <UsageBar ratio={ratio} animated={animated} />
    </div>
  )
}

function LockedRow({ label }: { label: string }) {
  const router = useRouter()
  return (
    <div
      className="mb-[14px] cursor-pointer rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-white/[0.03]"
      onClick={() => router.push('/dashboard/settings?tab=billing')}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: '#4b5563' }}>
          <span>{'\u{1F512}'}</span> {label}
        </span>
        <span
          className="text-[10px] font-semibold rounded-full px-2 py-[2px]"
          style={{
            background: 'rgba(217,119,6,0.1)',
            border: '1px solid rgba(217,119,6,0.2)',
            color: '#d97706',
          }}
        >
          {'\u26A1'} Upgrade
        </span>
      </div>
      <div className="h-[6px] rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

function UnlimitedRow({ icon, label, used }: { icon: string; label: string; used: number }) {
  return (
    <div className="mb-[14px]">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[13px] font-medium text-white flex items-center gap-1.5">
            <span>{icon}</span> {label}
          </span>
          <p className="text-[11px] mt-0.5 ml-[26px]" style={{ color: '#6b7280' }}>{used} used</p>
        </div>
        <span
          className="text-[11px] font-semibold rounded-full px-2.5 py-[2px]"
          style={{
            background: 'rgba(45,212,191,0.1)',
            border: '1px solid rgba(45,212,191,0.2)',
            color: '#2dd4bf',
          }}
        >
          {'\u2713'} Unlimited
        </span>
      </div>
    </div>
  )
}

export function UsageSection() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [animated, setAnimated] = useState(false)
  const animRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/usage')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setUsageData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Trigger bar animation after mount
  useEffect(() => {
    if (!loading && usageData && !animRef.current) {
      animRef.current = true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimated(true))
      })
    }
  }, [loading, usageData])

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
  const pill = tierPillColor(currentTier)
  const showUpgrade = currentTier === 'starter' || currentTier === 'plus'

  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: '#12121a',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[13px] font-bold text-white">
          {'\u{1F4CA}'} Usage
        </span>
        <span
          className="text-[11px] font-semibold rounded-full px-2.5 py-[3px] capitalize"
          style={{
            background: pill.bg,
            border: `1px solid ${pill.border}`,
            color: pill.text,
          }}
        >
          {tierConfig?.name ?? currentTier} Plan
        </span>
      </div>

      {/* Sections */}
      {SECTIONS.map((section, si) => (
        <div key={section.label}>
          {/* Divider between sections */}
          {si > 0 && (
            <div className="my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
          )}

          {/* Section label */}
          <p
            className="text-[10px] font-semibold uppercase mb-2"
            style={{ color: '#6b7280', letterSpacing: '0.08em' }}
          >
            {section.label}
          </p>

          {/* Rows */}
          {section.rows.map(({ key, label }) => {
            const limit = usageData.limits[key] ?? 0
            const used = usageData.usage[key] ?? 0
            const icon = ICONS[key] ?? ''

            if (limit === 0) return <LockedRow key={key} label={label} />
            if (limit === -1) return <UnlimitedRow key={key} icon={icon} label={label} used={used} />
            return <ActiveRow key={key} icon={icon} label={label} used={used} limit={limit} animated={animated} />
          })}
        </div>
      ))}

      {/* Upgrade CTA */}
      {showUpgrade && (
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[11px] text-center mb-2.5" style={{ color: '#6b7280' }}>
            Unlock all features with Pro
          </p>
          <button
            onClick={() => router.push('/dashboard/settings?tab=billing')}
            className="w-full h-10 rounded-[10px] text-[13px] font-bold text-white transition-all hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            }}
          >
            {'\u26A1'} Upgrade Plan
          </button>
        </div>
      )}
    </div>
  )
}

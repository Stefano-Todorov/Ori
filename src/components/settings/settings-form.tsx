'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { refreshKeepScroll } from '@/lib/router-utils'
import { useTheme } from 'next-themes'
import type { Profile, Platform } from '@/lib/types'
import { updateProfile, updateSocialHandles } from '@/app/actions'
import { Sun, Moon, Monitor, RefreshCw } from 'lucide-react'

const PLATFORMS: { id: Platform; label: string; dotColor: string; placeholder: string }[] = [
  { id: 'tiktok', label: 'TikTok', dotColor: 'bg-pink-500', placeholder: 'your_tiktok' },
  { id: 'instagram', label: 'Instagram', dotColor: 'bg-purple-500', placeholder: 'your_instagram' },
]

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon }

interface Props {
  profile: Profile | null
  socialAccounts: { platform: string; username: string | null }[]
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function SettingsForm({ profile, socialAccounts }: Props) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(profile?.name ?? '')
  const [niche, setNiche] = useState(profile?.niche ?? '')
  const [subNiche, setSubNiche] = useState(profile?.sub_niche ?? '')
  const [goals, setGoals] = useState(profile?.goals ?? '')
  const [platforms, setPlatforms] = useState<string[]>(profile?.platforms ?? [])
  const [postingTarget, setPostingTarget] = useState(profile?.posting_target ?? 3)
  const [batchSize, setBatchSize] = useState(profile?.batch_size ?? profile?.posting_target ?? 3)
  const [handles, setHandles] = useState<Record<string, string>>({
    tiktok: socialAccounts.find(a => a.platform === 'tiktok')?.username ?? '',
    instagram: socialAccounts.find(a => a.platform === 'instagram')?.username ?? '',
  })
  const [autoSync, setAutoSync] = useState(profile?.auto_sync_own_profile ?? true)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastSyncedAt = (profile?.last_synced_at ?? {}) as Record<string, string>

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function updateHandle(platform: string, value: string) {
    setHandles(prev => ({ ...prev, [platform]: value }))
  }

  async function handleSave() {
    setLoading(true)
    setError(null)

    // Save profile first (creates row if needed), then social handles (FK depends on profile.id)
    const profileResult = await updateProfile({
      name: name || null,
      niche: niche || null,
      sub_niche: subNiche || null,
      goals: goals || null,
      platforms,
      posting_target: postingTarget,
      batch_size: batchSize,
      auto_sync_own_profile: autoSync,
    })
    if (profileResult?.error) {
      setError(profileResult.error)
      setLoading(false)
      return
    }

    const handlesResult = await updateSocialHandles(
      PLATFORMS.map(p => ({ platform: p.id, username: handles[p.id] ?? '' }))
    )

    const err = handlesResult?.error
    if (err) {
      setError(err)
      setLoading(false)
      return
    }

    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 2000)
    refreshKeepScroll(router)
  }

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  return (
    <div className="space-y-5">
      {/* Appearance */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <p className="text-sm font-bold text-foreground">Appearance</p>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Theme</label>
          <div className="flex gap-2">
            {(['system', 'light', 'dark'] as const).map((t) => {
              const Icon = THEME_ICONS[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all duration-150 ${
                    theme === t
                      ? 'bg-purple-500/10 border-2 border-purple-500 text-foreground shadow-md shadow-purple-500/10'
                      : 'border border-border text-muted-foreground hover:border-purple-500/40 hover:text-foreground'
                  }`}
                >
                  <Icon size={14} />
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <p className="text-sm font-bold text-foreground">Profile</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Display name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Main niche</label>
              <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Fitness, Comedy" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Sub-niche</label>
              <Input value={subNiche} onChange={(e) => setSubNiche(e.target.value)} placeholder="e.g. Calisthenics" className={inputClass} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Goals</label>
            <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} placeholder="Your content goals..." className={inputClass} />
          </div>
        </div>
      </div>

      {/* Platforms & Accounts */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div>
          <p className="text-sm font-bold text-foreground">Platforms & Accounts</p>
          <p className="text-xs text-muted-foreground mt-0.5">Select your platforms and enter your usernames for extension sync</p>
        </div>

        <div className="space-y-3">
          {PLATFORMS.map((p) => {
            const isActive = platforms.includes(p.id)
            const synced = lastSyncedAt[p.id]

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 transition-all duration-150 ${
                  isActive
                    ? 'border-purple-500/30 bg-purple-500/[0.03]'
                    : 'border-border bg-muted/30 dark:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Platform toggle */}
                  <button
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${isActive ? 'bg-purple-600' : 'bg-muted border border-border'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-4' : ''}`} />
                  </button>

                  {/* Platform name + dot */}
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <div className={`w-2 h-2 rounded-full ${p.dotColor}`} />
                    <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {p.label}
                    </span>
                  </div>

                  {/* Handle input (only when active) */}
                  {isActive && (
                    <div className="relative flex-1 max-w-[220px]">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">@</span>
                      <Input
                        value={handles[p.id] ?? ''}
                        onChange={(e) => updateHandle(p.id, e.target.value)}
                        placeholder={p.placeholder}
                        className={`${inputClass} pl-6 h-8 text-xs`}
                      />
                    </div>
                  )}

                  {/* Last synced badge */}
                  {isActive && synced && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto shrink-0">
                      <RefreshCw size={10} />
                      {timeAgo(synced)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Posting target */}
        <div className="space-y-2.5 pt-1">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Posts per week target</label>
          <div className="flex gap-2">
            {[1, 3, 5, 7, 14].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPostingTarget(t)}
                className={`w-12 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                  postingTarget === t
                    ? 'bg-purple-600 text-white border border-transparent'
                    : 'border border-border text-muted-foreground hover:border-purple-500/40 hover:text-foreground'
                }`}
              >
                {t}x
              </button>
            ))}
          </div>
        </div>

        {/* Comfortable batch size */}
        <div className="space-y-2.5 pt-1">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Comfortable batch size</label>
          <p className="text-xs text-muted-foreground -mt-1">Max videos to focus on in Recording or Editing at once</p>
          <div className="flex gap-2">
            {[1, 2, 3, 5, 7].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setBatchSize(t)}
                className={`w-12 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                  batchSize === t
                    ? 'bg-purple-600 text-white border border-transparent'
                    : 'border border-border text-muted-foreground hover:border-purple-500/40 hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-sync toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="pt-3">
            <p className="text-sm text-foreground">Auto-sync on profile visit</p>
            <p className="text-xs text-muted-foreground">Sync your videos automatically when you visit your own profile</p>
          </div>
          <button
            type="button"
            onClick={() => setAutoSync(!autoSync)}
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-3 ${autoSync ? 'bg-purple-600' : 'bg-muted border border-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoSync ? 'translate-x-4' : ''}`} />
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        onClick={handleSave}
        disabled={loading}
        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
          saved
            ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
      </button>
    </div>
  )
}

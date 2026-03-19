'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import type { Profile } from '@/lib/types'
import { updateProfile, updateSocialHandles } from '@/app/actions'
import type { Platform } from '@/lib/types'
import { Sun, Moon, Monitor } from 'lucide-react'

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube Shorts' },
]

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon }

interface Props {
  profile: Profile | null
  socialAccounts: { platform: string; username: string | null }[]
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
  const [tiktokHandle, setTiktokHandle] = useState(socialAccounts.find(a => a.platform === 'tiktok')?.username ?? '')
  const [instagramHandle, setInstagramHandle] = useState(socialAccounts.find(a => a.platform === 'instagram')?.username ?? '')
  const [youtubeHandle, setYoutubeHandle] = useState(socialAccounts.find(a => a.platform === 'youtube')?.username ?? '')
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

  async function handleSave() {
    setLoading(true)
    setError(null)

    const [profileResult, handlesResult] = await Promise.all([
      updateProfile({
        name: name || null,
        niche: niche || null,
        sub_niche: subNiche || null,
        goals: goals || null,
        platforms,
        posting_target: postingTarget,
        auto_sync_own_profile: autoSync,
      }),
      updateSocialHandles([
        { platform: 'tiktok' as Platform, username: tiktokHandle },
        { platform: 'instagram' as Platform, username: instagramHandle },
        { platform: 'youtube' as Platform, username: youtubeHandle },
      ]),
    ])

    const err = profileResult?.error || handlesResult?.error
    if (err) {
      setError(err)
      setLoading(false)
      return
    }

    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
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
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Main niche</label>
            <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Fitness, Comedy, Finance" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Sub-niche</label>
            <Input value={subNiche} onChange={(e) => setSubNiche(e.target.value)} placeholder="e.g. Calisthenics" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Goals</label>
            <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} placeholder="Your content goals..." className={inputClass} />
          </div>
        </div>
      </div>

      {/* Your Accounts */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-sm font-bold text-foreground">Your Accounts</p>
          <p className="text-xs text-muted-foreground mt-0.5">Enter your usernames so the extension knows which profiles are yours</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">TikTok</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input value={tiktokHandle} onChange={(e) => setTiktokHandle(e.target.value)} placeholder="your_tiktok" className={`${inputClass} pl-7`} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Instagram</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="your_instagram" className={`${inputClass} pl-7`} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">YouTube</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input value={youtubeHandle} onChange={(e) => setYoutubeHandle(e.target.value)} placeholder="your_channel" className={`${inputClass} pl-7`} />
            </div>
          </div>
        </div>
      </div>

      {/* Content preferences */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <p className="text-sm font-bold text-foreground">Content preferences</p>
        <div className="space-y-4">
          <div className="space-y-2.5">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Active platforms</label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                    platforms.includes(p.id)
                      ? 'bg-purple-600 text-white border border-transparent'
                      : 'bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground hover:border-purple-500 hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
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
        </div>
      </div>

      {/* Sync */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <p className="text-sm font-bold text-foreground">Extension Sync</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Auto-sync on profile visit</p>
              <p className="text-xs text-muted-foreground">Automatically sync your videos when you visit your own profile page</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoSync(!autoSync)}
              className={`relative w-11 h-6 rounded-full transition-colors ${autoSync ? 'bg-purple-600' : 'bg-muted border border-border'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${autoSync ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {Object.entries(lastSyncedAt).length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Last synced</label>
              {Object.entries(lastSyncedAt).map(([platform, timestamp]) => (
                <p key={platform} className="text-sm text-muted-foreground">
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}: {new Date(timestamp).toLocaleString()}
                </p>
              ))}
            </div>
          )}
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

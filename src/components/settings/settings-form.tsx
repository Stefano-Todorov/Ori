'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import type { Profile } from '@/lib/types'
import { updateProfile } from '@/app/actions'
import { Sun, Moon, Monitor } from 'lucide-react'

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube Shorts' },
]

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon }

interface Props {
  profile: Profile | null
}

export function SettingsForm({ profile }: Props) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(profile?.name ?? '')
  const [niche, setNiche] = useState(profile?.niche ?? '')
  const [subNiche, setSubNiche] = useState(profile?.sub_niche ?? '')
  const [goals, setGoals] = useState(profile?.goals ?? '')
  const [platforms, setPlatforms] = useState<string[]>(profile?.platforms ?? [])
  const [postingTarget, setPostingTarget] = useState(profile?.posting_target ?? 3)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    setLoading(true)
    setError(null)

    const result = await updateProfile({
      name: name || null,
      niche: niche || null,
      sub_niche: subNiche || null,
      goals: goals || null,
      platforms,
      posting_target: postingTarget,
    })

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  return (
    <div className="space-y-5">
      {/* Appearance */}
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
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
                      : 'border border-border dark:border-white/8 text-muted-foreground hover:border-purple-500/40 hover:text-foreground'
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
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
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

      {/* Content preferences */}
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
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
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20 border border-transparent'
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
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20 border border-transparent'
                      : 'border border-border dark:border-white/8 text-muted-foreground hover:border-purple-500/40 hover:text-foreground'
                  }`}
                >
                  {t}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        onClick={handleSave}
        disabled={loading}
        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
          saved
            ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30'
            : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20 hover:brightness-110 hover:-translate-y-0.5'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
      </button>
    </div>
  )
}

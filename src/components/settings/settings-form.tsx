'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import type { Profile } from '@/lib/types'
import { updateProfile } from '@/app/actions'

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube Shorts' },
]

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
  const [telegramChatId, setTelegramChatId] = useState(profile?.telegram_chat_id ?? '')
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
      telegram_chat_id: telegramChatId || null,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`px-4 py-2 rounded-md border-2 text-sm font-medium capitalize transition-colors ${
                    theme === t
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Main niche</Label>
            <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Fitness, Comedy, Finance" />
          </div>
          <div className="space-y-2">
            <Label>Sub-niche</Label>
            <Input value={subNiche} onChange={(e) => setSubNiche(e.target.value)} placeholder="e.g. Calisthenics" />
          </div>
          <div className="space-y-2">
            <Label>Goals</Label>
            <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} placeholder="Your content goals..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Content preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Active platforms</Label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
                    platforms.includes(p.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {p.label}
                  {platforms.includes(p.id) && <Badge className="ml-2 text-xs" variant="default">✓</Badge>}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Posts per week target</Label>
            <div className="flex gap-2">
              {[1, 3, 5, 7, 14].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPostingTarget(t)}
                  className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
                    postingTarget === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  }`}
                >
                  {t}x
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Telegram Chat ID</Label>
            <Input
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="e.g. 123456789"
            />
            <p className="text-xs text-muted-foreground">
              Start a chat with <strong>@OriannaBot</strong> on Telegram and send /start to get your Chat ID.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
      </Button>
    </div>
  )
}

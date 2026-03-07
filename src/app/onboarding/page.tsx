'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube Shorts' },
]

const POSTING_TARGETS = [1, 3, 5, 7, 14]

const STEPS = [
  { title: 'Your niche', description: 'What kind of content do you create?' },
  { title: 'Your goals', description: 'What do you want to achieve?' },
  { title: 'Your platforms', description: 'Where do you post content?' },
  { title: 'Posting frequency', description: 'How often do you want to post?' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [niche, setNiche] = useState('')
  const [subNiche, setSubNiche] = useState('')
  const [goals, setGoals] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [postingTarget, setPostingTarget] = useState(3)

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleFinish() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        email: user.email ?? '',
        niche,
        sub_niche: subNiche || null,
        goals,
        platforms,
        posting_target: postingTarget,
        onboarding_completed: true,
      }, { onConflict: 'user_id' })

    router.push('/dashboard')
  }

  const canProceed = [
    niche.trim().length > 0,
    goals.trim().length > 0,
    platforms.length > 0,
    true,
  ][step]

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Orianna</h1>
          <p className="text-muted-foreground mt-1">Let&apos;s set up your profile</p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step].title}</CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="niche">Main niche *</Label>
                  <Input
                    id="niche"
                    placeholder="e.g. Fitness, Comedy, Finance, Gaming..."
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-niche">Sub-niche (optional)</Label>
                  <Input
                    id="sub-niche"
                    placeholder="e.g. Calisthenics, Dark humor, Crypto..."
                    value={subNiche}
                    onChange={(e) => setSubNiche(e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <div className="space-y-2">
                <Label htmlFor="goals">What are your content goals?</Label>
                <Textarea
                  id="goals"
                  placeholder="e.g. Reach 100k followers in 6 months, monetize through brand deals, grow my personal brand..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={5}
                />
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-3">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors text-left ${
                      platforms.includes(p.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium">{p.label}</span>
                    {platforms.includes(p.id) && (
                      <Badge variant="default">Selected</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <Label>Posts per week target</Label>
                <div className="grid grid-cols-5 gap-2">
                  {POSTING_TARGETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPostingTarget(t)}
                      className={`py-3 rounded-lg border-2 font-medium transition-colors ${
                        postingTarget === t
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {t}x
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {postingTarget >= 7
                    ? 'Elite level — consistency is king!'
                    : postingTarget >= 5
                    ? 'Great cadence for rapid growth'
                    : postingTarget >= 3
                    ? 'Good starting point for building momentum'
                    : 'Start slow and build up the habit'}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed}
                  className="flex-1"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Setting up...' : "Let's go!"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { updateProfile } from '@/app/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
]

const POSTING_TARGETS = [1, 3, 5, 7, 14]

const STEPS = [
  { title: 'Your niche', description: 'What kind of content do you create?' },
  { title: 'Your goals', description: 'What do you want to achieve?' },
  { title: 'Your platforms', description: 'Where do you post content?' },
  { title: 'Posting frequency', description: 'How often do you want to post?' },
]

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  )
}

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')
  const billing = searchParams.get('billing')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [niche, setNiche] = useState('')
  const [subNiche, setSubNiche] = useState('')
  const [goals, setGoals] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [postingTarget, setPostingTarget] = useState(3)

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleFinish() {
    setLoading(true)

    const result = await updateProfile({
      niche,
      sub_niche: subNiche || null,
      goals,
      platforms,
      posting_target: postingTarget,
      onboarding_completed: true,
    })

    if (result?.error) {
      setLoading(false)
      return
    }

    if (plan) {
      router.push(`/dashboard/settings?tab=billing&plan=${plan}${billing ? `&billing=${billing}` : ''}`)
    } else {
      router.push('/dashboard')
    }
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent">Orianna</h1>
          <p className="text-muted-foreground mt-1">Let&apos;s set up your profile</p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2.5 bg-muted dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div>
            <p className="text-lg font-bold text-foreground">{STEPS[step].title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{STEPS[step].description}</p>
          </div>

          <div className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
                    Main niche <span className="text-purple-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Fitness, Comedy, Finance, Gaming..."
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
                    Sub-niche
                    <span className="text-[10px] font-medium normal-case tracking-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground/60">optional</span>
                  </label>
                  <Input
                    placeholder="e.g. Calisthenics, Dark humor, Crypto..."
                    value={subNiche}
                    onChange={(e) => setSubNiche(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
                  Content goals <span className="text-purple-500">*</span>
                </label>
                <Textarea
                  placeholder="e.g. Reach 100k followers in 6 months, monetize through brand deals, grow my personal brand..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={5}
                  className={inputClass}
                />
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-2.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all duration-150 text-left ${
                      platforms.includes(p.id)
                        ? 'bg-purple-500/10 border-2 border-purple-500 shadow-md shadow-purple-500/10'
                        : 'border border-border hover:border-purple-500/40 hover:bg-muted/50'
                    }`}
                  >
                    <span className={`font-medium ${platforms.includes(p.id) ? 'text-foreground' : 'text-muted-foreground'}`}>{p.label}</span>
                    {platforms.includes(p.id) && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
                        Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Posts per week target</label>
                <div className="grid grid-cols-5 gap-2">
                  {POSTING_TARGETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPostingTarget(t)}
                      className={`py-3 rounded-xl font-bold transition-all duration-150 ${
                        postingTarget === t
                          ? 'bg-purple-600 text-white border border-transparent'
                          : 'border border-border text-muted-foreground hover:border-purple-500/40 hover:text-foreground'
                      }`}
                    >
                      {t}x
                    </button>
                  ))}
                </div>
                <p className={`text-sm font-medium ${postingTarget >= 5 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
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
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 h-11 rounded-xl border border-border dark:border-white/10 text-foreground text-sm font-medium hover:bg-muted dark:hover:bg-white/5 transition-all"
                >
                  Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed}
                  className="flex-1 h-11 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Setting up...' : "Let's go!"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

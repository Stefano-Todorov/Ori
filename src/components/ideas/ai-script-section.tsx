'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Dices, RefreshCw, Copy, Check } from 'lucide-react'

const HOOK_ANGLES = ['Negative', 'List', 'POV', 'Question', 'Storytime', 'Controversial', 'Statistic', 'Direct']
const CTA_ANGLES = ['Watch again', 'Follow for more', 'Comment below', 'Share this', 'Save for later', 'Link in bio']

interface GeneratedResult {
  hook: string
  body: string
  cta: string
  hashtags: string[]
  estimated_duration: string
  variants: { hook: string; angle: string }[]
  hook_explanation?: string
  filming_tips?: string
}

interface Props {
  /** The current idea title — used as the topic for generation. */
  topic: string
  /** Platform to optimize for (default 'tiktok'). */
  platform?: string
  /** Called when generation produces hook/body/cta. */
  onResult: (result: { hook: string; body: string; cta: string }) => void
  /** Optional: called when user picks an alternative hook. */
  onHookSwap?: (hook: string) => void
}

export function AIScriptSection({ topic, platform = 'tiktok', onResult, onHookSwap }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedResult | null>(null)
  const [hookAngles, setHookAngles] = useState<string[]>([])
  const [ctaAngles, setCtaAngles] = useState<string[]>([])
  const [hashtagsCopied, setHashtagsCopied] = useState(false)

  async function generate(random = false) {
    if (!random && !topic.trim()) {
      setError('Add a video idea first — the AI uses it as the topic.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: random ? '' : topic,
          platform,
          hookAngles: hookAngles.length > 0 ? hookAngles : undefined,
          ctaAngles: ctaAngles.length > 0 ? ctaAngles : undefined,
          generateVariants: true,
          randomTopic: random,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'limit_reached') setError(data.message)
        else if (res.status === 429) setError('Too many requests. Wait a moment and try again.')
        else if (res.status === 401) setError('You need to log in to generate scripts.')
        else setError('Something went wrong. Please try again.')
        return
      }
      const generated: GeneratedResult = {
        hook: data.script.hook,
        body: data.script.body,
        cta: data.script.cta,
        hashtags: data.script.hashtags ?? [],
        estimated_duration: data.script.estimated_duration ?? '',
        variants: data.script.variants ?? [],
        hook_explanation: data.meta?.hook_explanation,
        filming_tips: data.meta?.filming_tips,
      }
      setResult(generated)
      onResult({ hook: generated.hook, body: generated.body, cta: generated.cta })
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function pickHookVariant(hook: string) {
    if (onHookSwap) onHookSwap(hook)
    else if (result) onResult({ hook, body: result.body, cta: result.cta })
  }

  async function copyHashtags() {
    if (!result?.hashtags.length) return
    await navigator.clipboard.writeText(result.hashtags.map(h => '#' + h).join(' '))
    setHashtagsCopied(true)
    setTimeout(() => setHashtagsCopied(false), 1500)
  }

  function toggle(list: string[], setList: (l: string[]) => void, opt: string) {
    setList(list.includes(opt) ? list.filter(s => s !== opt) : [...list, opt])
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-purple-500/40 bg-purple-500/5 text-purple-600 dark:text-purple-400 text-xs font-semibold hover:bg-purple-500/10 hover:border-purple-500/60 transition-all"
      >
        <Sparkles size={13} className="animate-pulse" />
        Generate script with AI
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/[0.06] to-transparent p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-purple-500" />
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-purple-600 dark:text-purple-400">
            AI Script Generator
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Hide
        </button>
      </div>

      {/* Hook styles */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Hook style {hookAngles.length > 0 && <span className="text-purple-500 normal-case">— {hookAngles.length} selected</span>}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {HOOK_ANGLES.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(hookAngles, setHookAngles, opt)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                hookAngles.includes(opt)
                  ? 'bg-purple-600 text-white'
                  : 'bg-muted dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground hover:text-foreground hover:border-purple-500/40'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* CTA styles */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          CTA style {ctaAngles.length > 0 && <span className="text-purple-500 normal-case">— {ctaAngles.length} selected</span>}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CTA_ANGLES.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(ctaAngles, setCtaAngles, opt)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                ctaAngles.includes(opt)
                  ? 'bg-purple-600 text-white'
                  : 'bg-muted dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground hover:text-foreground hover:border-purple-500/40'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => generate(false)}
          disabled={loading}
          className="flex-1 h-9 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-purple-700 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <><Loader2 size={13} className="animate-spin" /> Generating…</>
          ) : result ? (
            <><RefreshCw size={13} /> Regenerate</>
          ) : (
            <><Sparkles size={13} /> Generate</>
          )}
        </button>
        <button
          type="button"
          onClick={() => generate(true)}
          disabled={loading}
          className="h-9 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-1.5 disabled:opacity-50 transition-all"
          title="Let AI pick a topic for your niche"
        >
          <Dices size={13} />
          Surprise me
        </button>
      </div>

      {!result && !loading && (
        <p className="text-[10px] text-muted-foreground/70 text-center">
          Uses your idea title as the topic. Takes 5–10 seconds.
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-[11px] text-red-600 dark:text-red-400 font-medium">
          {error}
        </div>
      )}

      {/* Result extras: variants + hashtags + tips */}
      {result && (
        <div className="space-y-2.5 pt-2 border-t border-purple-500/20">
          <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
            <Check size={11} /> Hook, body, and CTA filled in below
            {result.estimated_duration && <span className="text-muted-foreground font-normal">· {result.estimated_duration}</span>}
          </p>

          {result.variants.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Alternative hooks (click to swap)
              </label>
              <div className="space-y-1">
                {result.variants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickHookVariant(v.hook)}
                    className="w-full text-left text-[11px] italic text-muted-foreground hover:text-foreground hover:bg-purple-500/10 rounded-md px-2 py-1.5 transition-colors"
                    title={v.angle}
                  >
                    &ldquo;{v.hook}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.hashtags.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Suggested hashtags
                </label>
                <button
                  type="button"
                  onClick={copyHashtags}
                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  {hashtagsCopied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy all</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {result.hashtags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted dark:bg-white/[0.04] text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.filming_tips && (
            <details className="group">
              <summary className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 cursor-pointer hover:opacity-80 transition-opacity list-none flex items-center gap-1.5">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                Filming tips
              </summary>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed pl-4">
                {result.filming_tips}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

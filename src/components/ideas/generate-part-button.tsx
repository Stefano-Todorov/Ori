'use client'

import { useState } from 'react'
import { Sparkles, Loader2, X } from 'lucide-react'

type Target = 'hook' | 'body' | 'cta'

export interface Variant {
  value: string
  angle?: string
}

interface Props {
  target: Target
  topic: string
  platform?: string
  hookContext?: string
  bodyContext?: string
  ctaContext?: string
  onResult: (value: string, variants: Variant[]) => void
}

const LABELS: Record<Target, string> = {
  hook: 'Generate hook with AI',
  body: 'Generate body with AI',
  cta: 'Generate CTA with AI',
}

export function GeneratePartButton({
  target,
  topic,
  platform = 'tiktok',
  hookContext,
  bodyContext,
  ctaContext,
  onResult,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (!topic.trim()) {
      setError('Add a video idea title first.')
      setTimeout(() => setError(null), 2500)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scripts/generate-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          topic,
          platform,
          hookContext: target === 'hook' ? undefined : hookContext,
          bodyContext: target === 'body' ? undefined : bodyContext,
          ctaContext: target === 'cta' ? undefined : ctaContext,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'limit_reached') setError(data.message)
        else if (res.status === 429) setError('Slow down a moment.')
        else if (res.status === 401) setError('Please log in.')
        else setError('Generation failed.')
        setTimeout(() => setError(null), 3000)
        return
      }
      const value = data[target]
      const variants: Variant[] = Array.isArray(data.variants) ? data.variants : []
      if (typeof value === 'string' && value.trim()) {
        onResult(value, variants)
      } else {
        setError('Empty response. Try again.')
        setTimeout(() => setError(null), 2500)
      }
    } catch {
      setError('Network error.')
      setTimeout(() => setError(null), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span className="text-[10px] text-red-500 font-medium">{error}</span>
      )}
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        title={LABELS[target]}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-white bg-gradient-to-r from-purple-600 to-purple-500 shadow-sm shadow-purple-600/30 hover:from-purple-700 hover:to-purple-600 hover:shadow-md hover:shadow-purple-600/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles size={12} />
            Generate
          </>
        )}
      </button>
    </span>
  )
}

// ─── Variant list ──────────────────────────────────────────────────────────

interface VariantListProps {
  variants: Variant[]
  /** Truncate long variant text in the preview (default: only for body) */
  truncateAt?: number
  /** Called when user clicks a variant to swap it into the field. */
  onPick: (value: string) => void
  /** Called when user dismisses the variant list. */
  onDismiss: () => void
  label?: string
}

export function VariantList({ variants, truncateAt, onPick, onDismiss, label = 'Alternatives' }: VariantListProps) {
  if (variants.length === 0) return null

  function preview(text: string): string {
    if (!truncateAt) return text
    const single = text.replace(/\s+/g, ' ').trim()
    return single.length > truncateAt ? single.slice(0, truncateAt) + '…' : single
  }

  return (
    <div className="mt-2 rounded-lg border border-purple-500/25 bg-purple-500/[0.04] dark:bg-purple-500/[0.06] p-2.5 space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
          <Sparkles size={10} />
          {label} ({variants.length}) — click to swap
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Dismiss alternatives"
        >
          <X size={12} />
        </button>
      </div>
      <div className="space-y-1">
        {variants.map((v, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(v.value)}
            className="w-full text-left rounded-md px-2 py-1.5 hover:bg-purple-500/15 transition-colors group"
          >
            <p className="text-[11.5px] italic text-foreground/85 leading-snug whitespace-pre-wrap">
              &ldquo;{preview(v.value)}&rdquo;
            </p>
            {v.angle && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{v.angle}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

type Target = 'hook' | 'body' | 'cta'

interface Props {
  target: Target
  topic: string
  platform?: string
  hookContext?: string
  bodyContext?: string
  ctaContext?: string
  onResult: (value: string) => void
}

const LABELS: Record<Target, string> = {
  hook: 'Generate hook',
  body: 'Generate body',
  cta: 'Generate CTA',
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
      if (typeof value === 'string' && value.trim()) {
        onResult(value)
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
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        title={LABELS[target]}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <Sparkles size={11} />
        )}
        {loading ? 'Generating…' : 'AI'}
      </button>
      {error && (
        <span className="text-[10px] text-red-500 font-medium">{error}</span>
      )}
    </span>
  )
}

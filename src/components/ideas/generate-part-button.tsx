'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, Loader2, ChevronDown, Check } from 'lucide-react'

type Target = 'hook' | 'body' | 'cta'

interface Props {
  target: Target
  topic: string
  platform?: string
  hookContext?: string
  bodyContext?: string
  ctaContext?: string
  /** Optional list of style angles for this field. When provided, a ▾ split-button appears. */
  styles?: string[]
  onResult: (value: string) => void
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
  styles,
  onResult,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  async function generate(styleOverride?: string | null) {
    if (!topic.trim()) {
      setError('Add a video idea title first.')
      setTimeout(() => setError(null), 2500)
      return
    }
    const style = styleOverride !== undefined ? styleOverride : selectedStyle
    setLoading(true)
    setError(null)
    setMenuOpen(false)
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
          style: style ?? undefined,
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

  const hasStyles = !!styles && styles.length > 0
  const buttonLabel = loading
    ? 'Generating…'
    : selectedStyle
      ? `Generate · ${selectedStyle}`
      : 'Generate'

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span className="text-[10px] text-red-500 font-medium">{error}</span>
      )}
      <div className="relative inline-flex" ref={menuRef}>
        <button
          type="button"
          onClick={() => generate()}
          disabled={loading}
          title={LABELS[target]}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-white bg-gradient-to-r from-purple-600 to-purple-500 shadow-sm shadow-purple-600/30 hover:from-purple-700 hover:to-purple-600 hover:shadow-md hover:shadow-purple-600/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all ${
            hasStyles ? 'rounded-l-md border-r border-purple-700/40' : 'rounded-md'
          }`}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {buttonLabel}
        </button>
        {hasStyles && (
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={loading}
            title="Pick a style angle"
            aria-label="Pick a style angle"
            className="inline-flex items-center px-1.5 py-1 rounded-r-md text-white bg-gradient-to-r from-purple-500 to-purple-500 hover:from-purple-600 hover:to-purple-600 shadow-sm shadow-purple-600/30 hover:shadow-md hover:shadow-purple-600/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <ChevronDown size={12} className={menuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        )}
        {menuOpen && hasStyles && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-popover border border-border rounded-lg shadow-xl shadow-black/20 py-1 max-h-[280px] overflow-y-auto">
            <button
              type="button"
              onClick={() => { setSelectedStyle(null); generate(null) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-muted transition-colors"
            >
              <span className="w-3 inline-flex items-center justify-center">
                {selectedStyle === null && <Check size={11} className="text-purple-500" />}
              </span>
              <span className="font-medium">Any style</span>
              <span className="text-muted-foreground/60 ml-auto">(default)</span>
            </button>
            <div className="border-t border-border my-1" />
            {styles!.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { setSelectedStyle(opt); generate(opt) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-muted transition-colors"
              >
                <span className="w-3 inline-flex items-center justify-center">
                  {selectedStyle === opt && <Check size={11} className="text-purple-500" />}
                </span>
                <span className="font-medium">{opt}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </span>
  )
}

// Hook & CTA style angle lists, exported so dialogs can reference them.
export const HOOK_STYLES = ['Negative', 'List', 'POV', 'Question', 'Storytime', 'Controversial', 'Statistic', 'Direct'] as const
export const CTA_STYLES = ['Watch again', 'Follow for more', 'Comment below', 'Share this', 'Save for later', 'Link in bio'] as const

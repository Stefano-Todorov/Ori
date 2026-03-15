'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react'

type GenerationType = 'hook' | 'cta' | 'caption' | 'similar'

interface AiAssistPanelProps {
  idea: string
  context: {
    hook: string
    caption: string
    cta: string
    scriptSnippet: string
    inspirationUrl: string
  }
}

const TYPE_LABELS: Record<GenerationType, string> = {
  hook: 'New Hook',
  cta: 'New CTA',
  caption: 'New Caption',
  similar: 'Similar Idea',
}

export function AiAssistPanel({ idea, context }: AiAssistPanelProps) {
  const [instructions, setInstructions] = useState('')
  const [count, setCount] = useState('3')
  const [generating, setGenerating] = useState(false)
  const [generationType, setGenerationType] = useState<GenerationType | null>(null)
  const [results, setResults] = useState<string[]>([])
  const [copied, setCopied] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate(type: GenerationType) {
    if (!idea.trim()) return
    setGenerating(true)
    setGenerationType(type)
    setResults([])
    setError(null)

    try {
      const res = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          idea,
          context,
          count: parseInt(count),
          instructions: instructions.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error ${res.status}`)
      }

      const data = await res.json()
      setResults(data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  function copyToClipboard(text: string, index: number) {
    navigator.clipboard.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="rounded-xl p-4 space-y-4 animate-in fade-in duration-300 relative overflow-hidden" style={{ background: '#12121a', border: '1px solid rgba(124,58,237,0.25)' }}>
      {/* Shimmer border effect */}
      <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.08), transparent)',
        animation: 'shimmer 3s ease-in-out infinite',
      }} />
      <style>{`@keyframes shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>

      <div className="flex items-center gap-2 relative">
        <Sparkles size={16} className="text-purple-400" />
        <span className="text-sm font-semibold text-purple-400">AI Assist</span>
      </div>

      <div className="flex gap-3 items-end relative">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs uppercase tracking-wider" style={{ color: '#a1a1aa' }}>Instructions (optional)</Label>
          <Input
            placeholder="e.g. negative connotation, storytime style, funny tone..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="text-sm"
            style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', color: 'white', borderRadius: 10 }}
          />
        </div>
        <div className="w-20 space-y-1.5">
          <Label className="text-xs uppercase tracking-wider" style={{ color: '#a1a1aa' }}>Qty</Label>
          <Select value={count} onValueChange={setCount}>
            <SelectTrigger className="h-9" style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', color: 'white', borderRadius: 10 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.10)' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
        {(['hook', 'cta', 'caption', 'similar'] as const).map((type) => (
          <button
            key={type}
            disabled={generating || !idea.trim()}
            onClick={() => generate(type)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#c084fc' }}
            onMouseEnter={(e) => {
              if (!(e.currentTarget as HTMLButtonElement).disabled) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed, #a855f7)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(124,58,237,0.1)'
              e.currentTarget.style.color = '#c084fc'
              e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)'
            }}
          >
            {generating && generationType === type ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive relative">{error}</p>
      )}

      {results.length > 0 && generationType && (
        <div className="space-y-2 relative">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#a1a1aa' }}>
            Generated {TYPE_LABELS[generationType]}s ({results.length})
          </p>
          {results.map((result, i) => (
            <div key={i} className="rounded-lg p-3 space-y-2" style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-sm whitespace-pre-wrap" style={{ color: '#e2e8f0' }}>{result}</p>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-purple-400 hover:text-purple-300"
                  onClick={() => copyToClipboard(result, i)}
                >
                  {copied === i ? (
                    <><Check size={12} className="mr-1" /> Copied</>
                  ) : (
                    <><Copy size={12} className="mr-1" /> Copy</>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

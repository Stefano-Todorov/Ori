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
    <div className="rounded-xl border border-purple-500/20 bg-[#1a1a2e] p-4 space-y-4 animate-in fade-in duration-300 relative overflow-hidden">
      {/* Shimmer border effect */}
      <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.08), transparent)',
        animation: 'shimmer 3s ease-in-out infinite',
      }} />
      <style>{`@keyframes shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>

      <div className="flex items-center gap-2 relative">
        <Sparkles size={16} className="text-purple-400" />
        <span className="text-sm font-semibold text-purple-300">AI Assist</span>
      </div>

      <div className="flex gap-3 items-end relative">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-[#a0a0b8]">Instructions (optional)</Label>
          <Input
            placeholder="e.g. negative connotation, storytime style, funny tone..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="text-sm bg-[#1e1e2e] border-white/8 focus:border-purple-500 focus:ring-purple-500/20"
          />
        </div>
        <div className="w-20 space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-[#a0a0b8]">Qty</Label>
          <Select value={count} onValueChange={setCount}>
            <SelectTrigger className="h-9 bg-[#1e1e2e] border-white/8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 transition-all hover:bg-gradient-to-r hover:from-purple-600 hover:to-purple-500 hover:text-white hover:border-purple-400 disabled:opacity-40 disabled:cursor-not-allowed"
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
          <p className="text-xs font-medium text-[#a0a0b8] uppercase tracking-wider">
            Generated {TYPE_LABELS[generationType]}s ({results.length})
          </p>
          {results.map((result, i) => (
            <div key={i} className="rounded-lg border border-white/8 bg-[#12121a] p-3 space-y-2">
              <p className="text-sm whitespace-pre-wrap">{result}</p>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-purple-300 hover:text-purple-200"
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

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
    <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-primary" />
        <span className="text-sm font-semibold">AI Assist</span>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Instructions (optional)</Label>
          <Input
            placeholder="e.g. negative connotation, storytime style, funny tone..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="w-20 space-y-1.5">
          <Label className="text-xs">Qty</Label>
          <Select value={count} onValueChange={setCount}>
            <SelectTrigger className="h-9">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['hook', 'cta', 'caption', 'similar'] as const).map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            disabled={generating || !idea.trim()}
            onClick={() => generate(type)}
            className="text-xs"
          >
            {generating && generationType === type ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <Sparkles size={14} className="mr-1" />
            )}
            {TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {results.length > 0 && generationType && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Generated {TYPE_LABELS[generationType]}s ({results.length})
          </p>
          {results.map((result, i) => (
            <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
              <p className="text-sm whitespace-pre-wrap">{result}</p>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
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

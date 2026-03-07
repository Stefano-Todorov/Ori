'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, ChevronDown, ChevronUp, Trash2, Bookmark, Copy, Check, Dices } from 'lucide-react'
import { updateScriptStatus, deleteScript, addIdea } from '@/app/actions'

interface GeneratedScript {
  id: string
  topic: string
  hook: string
  body: string
  cta: string
  hashtags: string[]
  difficulty: string
  estimated_duration: string
  status: 'draft' | 'used' | 'archived'
  variants: { hook: string; angle: string }[]
}

interface Meta {
  hook_explanation: string
  filming_tips: string
  hook_type: string
  cta_type: string
}

interface Props {
  defaultPlatform: string
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
}

const DIFFICULTY_DESCRIPTIONS = {
  easy: 'Talk to camera, no editing',
  medium: 'Some cuts + text overlays',
  hard: 'Complex editing + B-roll',
}

const STATUS_NEXT: Record<string, 'draft' | 'used' | 'archived'> = {
  draft: 'used',
  used: 'archived',
  archived: 'draft',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  used: 'bg-green-100 text-green-800 hover:bg-green-200',
  archived: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
}

const HOOK_ANGLES = [
  'Negative',
  'List',
  'POV',
  'Question',
  'Storytime',
  'Controversial',
  'Statistic',
  'Direct',
]

const CTA_ANGLES = [
  'Watch again',
  'Follow for more',
  'Comment below',
  'Share this',
  'Save for later',
  'Link in bio',
]

// Parse structured body with [SECTION] labels into segments
function parseBody(body: string): { label: string; text: string }[] {
  const lines = body.split('\n')
  const segments: { label: string; text: string }[] = []
  let current: { label: string; lines: string[] } | null = null

  for (const line of lines) {
    const labelMatch = line.match(/^\[([^\]]+)\](.*)$/)
    if (labelMatch) {
      if (current) segments.push({ label: current.label, text: current.lines.join('\n').trim() })
      current = { label: labelMatch[1], lines: labelMatch[2] ? [labelMatch[2].trim()] : [] }
    } else if (current) {
      current.lines.push(line)
    } else if (line.trim()) {
      segments.push({ label: '', text: line.trim() })
    }
  }
  if (current) segments.push({ label: current.label, text: current.lines.join('\n').trim() })
  return segments.filter((s) => s.label || s.text)
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (val: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])
  }

  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-xs text-muted-foreground font-normal">(select any)</span></Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
              selected.includes(opt)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ScriptGenerator({ defaultPlatform }: Props) {
  const [topic, setTopic] = useState('')
  const [angle, setAngle] = useState('')
  const [hookAngles, setHookAngles] = useState<string[]>([])
  const [ctaAngles, setCtaAngles] = useState<string[]>([])
  const platform = defaultPlatform
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ script: GeneratedScript; meta: Meta } | null>(null)
  const [expandedVariant, setExpandedVariant] = useState<number | null>(null)
  const [showBody, setShowBody] = useState(true)
  const [scriptStatus, setScriptStatus] = useState<'draft' | 'used' | 'archived'>('draft')
  const [ideaSaved, setIdeaSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate(random = false) {
    if (!random && !topic.trim()) return
    setLoading(true)
    setResult(null)
    setIdeaSaved(false)

    const res = await fetch('/api/scripts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: random ? '' : topic,
        difficulty,
        platform,
        angle: angle || undefined,
        hookAngles: hookAngles.length > 0 ? hookAngles : undefined,
        ctaAngles: ctaAngles.length > 0 ? ctaAngles : undefined,
        generateVariants: true,
        randomTopic: random,
      }),
    })

    const data = await res.json()
    if (res.ok) {
      setResult(data)
      setScriptStatus('draft')
      // If random, populate the topic field with what AI chose
      if (random && data.meta?.generated_topic) {
        setTopic(data.meta.generated_topic)
      }
    }
    setLoading(false)
  }

  async function handleStatusCycle() {
    if (!result) return
    const next = STATUS_NEXT[scriptStatus]
    await updateScriptStatus(result.script.id, next)
    setScriptStatus(next)
  }

  async function handleDelete() {
    if (!result) return
    await deleteScript(result.script.id)
    setResult(null)
  }

  async function handleSaveAsIdea() {
    if (!result) return
    await addIdea(result.script.topic, 'script', {
      hook_idea: result.script.hook,
      script_snippet: result.script.body,
      cta: result.script.cta,
      difficulty: result.script.difficulty as 'easy' | 'medium' | 'hard' | undefined,
    })
    setIdeaSaved(true)
  }

  async function handleCopyScript() {
    if (!result) return
    const text = `HOOK:\n${result.script.hook}\n\nSCRIPT:\n${result.script.body}\n\nCTA:\n${result.script.cta}\n\nHASHTAGS:\n${result.script.hashtags.map((h) => '#' + h).join(' ')}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const bodySegments = result ? parseBody(result.script.body) : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} />
            Generate a script
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>Video topic / idea *</Label>
              <Input
                placeholder="e.g. 3 mistakes beginners make at the gym"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generate(false)}
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Specific angle (optional)</Label>
              <Input
                placeholder="e.g. controversial take, storytime"
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
              />
            </div>
          </div>

          <MultiSelect
            label="Hook styles"
            options={HOOK_ANGLES}
            selected={hookAngles}
            onChange={setHookAngles}
          />

          <MultiSelect
            label="CTA styles"
            options={CTA_ANGLES}
            selected={ctaAngles}
            onChange={setCtaAngles}
          />

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`py-2 px-3 rounded-md border-2 text-xs font-medium transition-all ${
                    difficulty === d
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="capitalize">{d}</div>
                  <div className="text-muted-foreground font-normal hidden sm:block">
                    {DIFFICULTY_DESCRIPTIONS[d]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => generate(false)} disabled={!topic.trim() || loading} className="sm:w-auto">
              {loading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles size={16} className="mr-2" />Generate script</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => generate(true)}
              disabled={loading}
              title="Let AI pick a random topic for your niche"
            >
              <Dices size={16} className="mr-2" />
              Surprise me
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <Card className="border-primary/30">
            <CardContent className="pt-6 space-y-5">
              {/* Header row */}
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-lg flex-1 truncate">{result.script.topic}</h3>
                <Badge className={DIFFICULTY_COLORS[result.script.difficulty as keyof typeof DIFFICULTY_COLORS]}>
                  {result.script.difficulty}
                </Badge>
                <Badge variant="outline">{result.script.estimated_duration}</Badge>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleStatusCycle}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${STATUS_COLORS[scriptStatus]}`}
                >
                  {scriptStatus}
                </button>
                <Button size="sm" variant="outline" onClick={handleCopyScript}>
                  {copied ? <><Check size={14} className="mr-1" />Copied</> : <><Copy size={14} className="mr-1" />Copy script</>}
                </Button>
                <Button size="sm" variant="outline" onClick={handleSaveAsIdea} disabled={ideaSaved}>
                  <Bookmark size={14} className="mr-1" />
                  {ideaSaved ? 'Saved as idea!' : 'Save as idea'}
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                  <Trash2 size={14} className="mr-1" />Delete
                </Button>
              </div>

              {/* Hook */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">Hook</span>
                  {result.meta.hook_type && (
                    <Badge variant="outline" className="text-xs">{result.meta.hook_type}</Badge>
                  )}
                </div>
                <p className="font-medium text-lg">&quot;{result.script.hook}&quot;</p>
                {result.meta.hook_explanation && (
                  <p className="text-xs text-muted-foreground mt-2">{result.meta.hook_explanation}</p>
                )}
              </div>

              {/* Script body — structured sections */}
              <div>
                <button
                  className="flex items-center gap-2 text-sm font-semibold mb-3 hover:text-primary transition-colors"
                  onClick={() => setShowBody(!showBody)}
                >
                  Full Script
                  {showBody ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showBody && (
                  <div className="space-y-3">
                    {bodySegments.length > 0 ? (
                      bodySegments.map((seg, i) => (
                        <div key={i} className="rounded-lg border bg-muted/30 p-3">
                          {seg.label && (
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              {seg.label}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{seg.text}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-sm whitespace-pre-wrap">{result.script.body}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CTA */}
              {result.script.cta && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CTA</p>
                    {result.meta.cta_type && (
                      <Badge variant="outline" className="text-xs">{result.meta.cta_type}</Badge>
                    )}
                  </div>
                  <p className="text-sm">{result.script.cta}</p>
                </div>
              )}

              {/* Filming tips */}
              {result.meta.filming_tips && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Filming tips</p>
                  <p className="text-sm">{result.meta.filming_tips}</p>
                </div>
              )}

              {/* Hashtags */}
              {result.script.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.script.hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary">#{tag}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variant hooks */}
          {result.script.variants?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alternative hooks ({result.script.variants.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.script.variants.map((v, i) => (
                  <div
                    key={i}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setExpandedVariant(expandedVariant === i ? null : i)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">&quot;{v.hook}&quot;</p>
                      {expandedVariant === i ? <ChevronUp size={14} className="shrink-0 mt-0.5" /> : <ChevronDown size={14} className="shrink-0 mt-0.5" />}
                    </div>
                    {expandedVariant === i && (
                      <p className="text-xs text-muted-foreground mt-2">{v.angle}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

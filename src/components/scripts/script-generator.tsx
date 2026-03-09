'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const DIFFICULTY_DESCRIPTIONS = {
  easy: 'Talk to camera, no editing',
  medium: 'Some cuts + text overlays',
  hard: 'Complex editing + B-roll',
}

const DIFFICULTY_SUBTITLE_COLORS = {
  easy: 'text-green-600 dark:text-green-400',
  medium: 'text-amber-600 dark:text-amber-400',
  hard: 'text-red-600 dark:text-red-400',
}

const STATUS_NEXT: Record<string, 'draft' | 'used' | 'archived'> = {
  draft: 'used',
  used: 'archived',
  archived: 'draft',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
  used: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
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

function FormLabel({ children, required, optional }: { children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
      {children}
      {required && <span className="text-purple-500">*</span>}
      {optional && (
        <span className="text-[10px] font-medium normal-case tracking-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground/60">
          optional
        </span>
      )}
    </label>
  )
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
    <div className="space-y-2.5">
      <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
        {label}
        {selected.length > 0 ? (
          <span className="text-purple-500 ml-1.5 normal-case tracking-normal">
            — {selected.length} selected
          </span>
        ) : (
          <span className="text-muted-foreground/50 ml-1.5 font-normal normal-case tracking-normal">
            (select any)
          </span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              selected.includes(opt)
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20 border border-transparent'
                : 'bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground hover:border-purple-500 hover:text-foreground'
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
      {/* ─── Generator Card ─── */}
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-7 border-t-2 border-t-purple-600 shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <Sparkles size={20} className="text-purple-500 animate-pulse" />
            <h2 className="text-xl font-bold text-foreground">Generate a script</h2>
          </div>
          <p className="text-sm text-muted-foreground">Fill in the details and let AI write your video script</p>
        </div>

        <div className="space-y-5">
          {/* Input fields */}
          <div className="space-y-2">
            <FormLabel required>Video topic / idea</FormLabel>
            <Input
              placeholder="e.g. 3 mistakes beginners make at the gym"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate(false)}
              className="bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <FormLabel optional>Specific angle</FormLabel>
            <Input
              placeholder="e.g. controversial take, storytime"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className="bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* Hook & CTA styles */}
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

          {/* Difficulty */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Difficulty</label>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`relative py-3 px-3 rounded-xl text-left transition-all duration-200 ${
                    difficulty === d
                      ? 'bg-purple-500/10 dark:bg-purple-500/15 border-2 border-purple-500 shadow-md shadow-purple-500/10'
                      : 'bg-muted/50 dark:bg-[#1a1a2e] border border-border dark:border-white/6 hover:border-purple-500/40 hover:bg-muted dark:hover:bg-[#1e1e2e]'
                  }`}
                >
                  {difficulty === d && (
                    <span className="absolute top-2 right-2 text-purple-500 text-xs font-bold">&#10003;</span>
                  )}
                  <div className={`text-sm font-bold capitalize ${difficulty === d ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {d}
                  </div>
                  <div className={`text-[11px] mt-0.5 hidden sm:block ${difficulty === d ? DIFFICULTY_SUBTITLE_COLORS[d] : 'text-muted-foreground/60'}`}>
                    {DIFFICULTY_DESCRIPTIONS[d]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-1">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => generate(false)}
                disabled={!topic.trim() || loading}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" />Generating...</>
                ) : (
                  <><Sparkles size={16} />Generate script</>
                )}
              </button>
              <button
                onClick={() => generate(true)}
                disabled={loading}
                className="h-12 px-5 rounded-xl border border-border dark:border-white/12 text-foreground text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:bg-muted dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Let AI pick a random topic for your niche"
              >
                <Dices size={16} />
                Surprise me
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60 text-center">Generation usually takes 5–10 seconds</p>
          </div>
        </div>
      </div>

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

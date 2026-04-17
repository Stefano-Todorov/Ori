'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Sparkles, ChevronDown, ChevronUp, Trash2, Bookmark, Copy, Check, Dices, Camera } from 'lucide-react'
import { updateScriptStatus, deleteScript, addIdea } from '@/app/actions'

interface GeneratedScript {
  id: string
  topic: string
  hook: string
  body: string
  cta: string
  hashtags: string[]
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



const STATUS_NEXT: Record<string, 'draft' | 'used' | 'archived'> = {
  draft: 'used',
  used: 'archived',
  archived: 'draft',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10',
  used: 'border-green-500 text-green-600 dark:text-green-400 hover:bg-green-500/10',
  archived: 'border-gray-400 text-gray-500 dark:text-gray-400 hover:bg-gray-500/10',
}

const SECTION_LABEL_COLORS: Record<string, string> = {
  INTRO: 'text-blue-500 dark:text-blue-400',
  TRANSITION: 'text-gray-500 dark:text-gray-400',
  OUTRO: 'text-teal-500 dark:text-teal-400',
}

function getSectionColor(label: string): string {
  const upper = label.toUpperCase()
  if (SECTION_LABEL_COLORS[upper]) return SECTION_LABEL_COLORS[upper]
  if (upper.startsWith('MAIN POINT')) return 'text-purple-500 dark:text-purple-400'
  return 'text-muted-foreground'
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

const SCRIPT_COUNT_OPTIONS = [1, 2, 3, 5]

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
                ? 'bg-purple-600 text-white border border-transparent'
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

// ─── Script Result Card ───
function ScriptResultCard({
  result,
  status,
  ideaSaved,
  onStatusCycle,
  onDelete,
  onSaveAsIdea,
}: {
  result: { script: GeneratedScript; meta: Meta }
  status: 'draft' | 'used' | 'archived'
  ideaSaved: boolean
  onStatusCycle: () => void
  onDelete: () => void
  onSaveAsIdea: () => void
}) {
  const [expandedVariant, setExpandedVariant] = useState<number | null>(null)
  const [showBody, setShowBody] = useState(true)
  const [copied, setCopied] = useState(false)

  const bodySegments = parseBody(result.script.body)

  async function handleCopyScript() {
    const text = `HOOK:\n${result.script.hook}\n\nSCRIPT:\n${result.script.body}\n\nCTA:\n${result.script.cta}\n\nHASHTAGS:\n${result.script.hashtags.map((h) => '#' + h).join(' ')}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      {/* ─── Title row ─── */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="font-bold text-lg flex-1 truncate text-foreground leading-tight">{result.script.topic}</h3>
        {result.script.estimated_duration && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center gap-1">
            &#128336; {result.script.estimated_duration}
          </span>
        )}
      </div>

      {/* ─── Actions ─── */}
      <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-border dark:border-white/6">
        <button
          type="button"
          onClick={onStatusCycle}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${STATUS_STYLES[status]}`}
        >
          {status}
        </button>
        <button
          onClick={handleCopyScript}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted dark:bg-white/[0.06] text-foreground hover:bg-muted/80 dark:hover:bg-white/10 transition-all duration-150"
        >
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
        </button>
        <button
          onClick={onSaveAsIdea}
          disabled={ideaSaved}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
            ideaSaved
              ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          <Bookmark size={13} />
          {ideaSaved ? 'Saved!' : 'Save as idea'}
        </button>
        <div className="ml-auto">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all duration-150"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ─── Hook ─── */}
      {result.script.hook && (
        <div className="relative bg-gradient-to-br from-purple-500/15 to-purple-500/5 dark:from-purple-500/15 dark:to-purple-500/[0.03] border border-purple-500/30 rounded-xl p-4 pl-6 border-l-[3px] border-l-purple-500">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-[0.08em] flex items-center gap-1.5">
              &#9889; Hook
            </p>
            {result.meta.hook_type && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                {result.meta.hook_type}
              </span>
            )}
          </div>
          <p className="text-base font-medium italic text-foreground leading-relaxed">&quot;{result.script.hook}&quot;</p>
          {result.meta.hook_explanation && (
            <details className="mt-3 group">
              <summary className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 cursor-pointer hover:text-purple-500 transition-colors select-none">
                Why this works
              </summary>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{result.meta.hook_explanation}</p>
            </details>
          )}
        </div>
      )}

      {/* ─── Script body ─── */}
      {result.script.body && (
        <div className="space-y-2">
          <button
            className="flex items-center gap-3 w-full group"
            onClick={() => setShowBody(!showBody)}
          >
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] shrink-0 flex items-center gap-1.5">
              Full Script
              <span className={`transition-transform duration-200 ${showBody ? 'rotate-180' : ''}`}>
                <ChevronDown size={12} />
              </span>
            </p>
            <div className="flex-1 h-px bg-border dark:bg-white/6" />
          </button>
          {showBody && (
            <div className="space-y-2">
              {bodySegments.length > 0 ? (
                bodySegments.map((seg, i) => (
                  <div key={i} className="rounded-[10px] border border-border dark:border-white/6 bg-muted/50 dark:bg-[#1a1a2e] p-3.5 transition-colors hover:bg-muted dark:hover:bg-[#1e1e38]">
                    {seg.label && (
                      <p className={`text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5 ${getSectionColor(seg.label)}`}>
                        {seg.label}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85 dark:text-[#d1d5db]">{seg.text}</p>
                  </div>
                ))
              ) : (
                <div className="bg-muted dark:bg-[#1a1a2e] rounded-[10px] p-3.5">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85 dark:text-[#d1d5db]">{result.script.body}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── CTA ─── */}
      {result.script.cta && (
        <div className="bg-teal-500/[0.06] border border-teal-500/20 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-[0.08em] flex items-center gap-1.5">
              &#128227; CTA
            </p>
            {result.meta.cta_type && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400">
                {result.meta.cta_type}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground font-medium">{result.script.cta}</p>
        </div>
      )}

      {/* ─── Filming tips ─── */}
      {result.meta.filming_tips && (
        <div className="relative overflow-hidden bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-3.5">
          <Camera size={80} className="absolute -right-2 -bottom-2 text-amber-500/[0.07] rotate-12 pointer-events-none" />
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-[0.08em] mb-1.5 flex items-center gap-1.5">
            &#127909; Filming tips
          </p>
          <p className="text-sm text-foreground/85 dark:text-[#d1d5db] leading-relaxed relative">{result.meta.filming_tips}</p>
        </div>
      )}

      {/* ─── Hashtags ─── */}
      {result.script.hashtags?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
            # Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.script.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-muted/50 dark:bg-white/[0.04] border border-border text-muted-foreground transition-all duration-150 hover:border-purple-500 hover:text-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Alternative hooks ─── */}
      {result.script.variants?.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-sm font-bold text-foreground">
            <span className="border-b-2 border-purple-500 pb-0.5">Alternative hooks</span>
            <span className="text-muted-foreground font-normal ml-1.5">({result.script.variants.length})</span>
          </p>
          <div className="space-y-2">
            {result.script.variants.map((v, i) => (
              <div
                key={i}
                className="rounded-[10px] border border-border dark:border-white/6 p-3.5 cursor-pointer transition-all duration-150 hover:border-purple-500/40 hover:bg-muted/50 dark:hover:bg-[#1a1a2e]"
                onClick={() => setExpandedVariant(expandedVariant === i ? null : i)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-foreground italic">&quot;{v.hook}&quot;</p>
                  </div>
                  <span className={`transition-transform duration-200 shrink-0 mt-0.5 text-muted-foreground ${expandedVariant === i ? 'rotate-180' : ''}`}>
                    <ChevronDown size={14} />
                  </span>
                </div>
                {expandedVariant === i && (
                  <p className="text-xs text-muted-foreground mt-2 ml-7.5 leading-relaxed">{v.angle}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Generator Component ───
export function ScriptGenerator({ defaultPlatform }: Props) {
  const [topic, setTopic] = useState('')
  const [angle, setAngle] = useState('')
  const [hookAngles, setHookAngles] = useState<string[]>([])
  const [ctaAngles, setCtaAngles] = useState<string[]>([])
  const platform = defaultPlatform
  const [scriptCount, setScriptCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<{ script: GeneratedScript; meta: Meta }[]>([])
  const [scriptStatuses, setScriptStatuses] = useState<Record<string, 'draft' | 'used' | 'archived'>>({})
  const [ideaSavedMap, setIdeaSavedMap] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  async function generate(random = false) {
    if (!random && !topic.trim()) return
    setLoading(true)
    setResults([])
    setError(null)
    setIdeaSavedMap({})
    setScriptStatuses({})
    setProgress(scriptCount > 1 ? { current: 0, total: scriptCount } : null)

    // Upfront usage check for batch
    if (scriptCount > 1) {
      try {
        const usageRes = await fetch('/api/usage')
        if (usageRes.ok) {
          const usageData = await usageRes.json()
          const current = usageData.usage?.script_generations ?? 0
          const limit = usageData.limits?.script_generations ?? 0
          const remaining = limit < 0 ? Infinity : limit - current
          if (remaining < scriptCount) {
            setError(
              remaining <= 0
                ? 'You have no script generations left this month.'
                : `You only have ${remaining} script generation${remaining === 1 ? '' : 's'} left. Reduce the count or upgrade your plan.`
            )
            setLoading(false)
            setProgress(null)
            return
          }
        }
      } catch {
        // If usage check fails, proceed anyway — the API will enforce limits per-call
      }
    }

    const generated: { script: GeneratedScript; meta: Meta }[] = []

    for (let i = 0; i < scriptCount; i++) {
      if (scriptCount > 1) setProgress({ current: i, total: scriptCount })

      try {
        const res = await fetch('/api/scripts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: random ? '' : topic,
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
          generated.push(data)
          setResults([...generated])
          setScriptStatuses((prev) => ({ ...prev, [data.script.id]: 'draft' }))
          if (random && i === 0 && data.meta?.generated_topic) {
            setTopic(data.meta.generated_topic)
          }
        } else {
          if (data.error === 'limit_reached') {
            setError(data.message)
          } else if (res.status === 429) {
            setError(
              generated.length > 0
                ? `Rate limited after ${generated.length} script${generated.length !== 1 ? 's' : ''}. Wait a moment and try again.`
                : 'Too many requests. Wait a moment and try again.'
            )
          } else if (res.status === 401) {
            setError('You need to log in to generate scripts.')
          } else {
            setError('Something went wrong generating your script. Please try again.')
          }
          break
        }
      } catch {
        setError('Network error. Check your connection and try again.')
        break
      }
    }

    setProgress(null)
    setLoading(false)
  }

  async function handleStatusCycle(scriptId: string) {
    const current = scriptStatuses[scriptId] ?? 'draft'
    const next = STATUS_NEXT[current]
    await updateScriptStatus(scriptId, next)
    setScriptStatuses((prev) => ({ ...prev, [scriptId]: next }))
  }

  async function handleDelete(scriptId: string) {
    await deleteScript(scriptId)
    setResults((prev) => prev.filter((r) => r.script.id !== scriptId))
  }

  async function handleSaveAsIdea(result: { script: GeneratedScript; meta: Meta }) {
    await addIdea(result.script.topic, 'script', {
      hook_idea: result.script.hook,
      script_snippet: result.script.body,
      cta: result.script.cta,
    })
    setIdeaSavedMap((prev) => ({ ...prev, [result.script.id]: true }))
  }

  return (
    <div className="space-y-6">
      {/* ─── Generator Card ─── */}
      <div className="bg-card border border-border rounded-2xl p-7 border-t-2 border-t-purple-600 shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
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
              className="bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <FormLabel optional>Specific angle</FormLabel>
            <Input
              placeholder="e.g. controversial take, storytime"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className="bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
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

          {/* Number of scripts */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
              Number of scripts
            </label>
            <Select value={String(scriptCount)} onValueChange={(v) => setScriptCount(Number(v))}>
              <SelectTrigger className="w-36 bg-muted dark:bg-[#1e1e2e] border-border rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCRIPT_COUNT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} script{n > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-1">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => generate(false)}
                disabled={!topic.trim() || loading}
                className="flex-1 h-12 rounded-xl bg-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {progress
                      ? `Generating ${progress.current + 1}/${progress.total}...`
                      : 'Generating...'}
                  </>
                ) : (
                  <><Sparkles size={16} />Generate {scriptCount > 1 ? `${scriptCount} scripts` : 'script'}</>
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
            <p className="text-xs text-muted-foreground/60 text-center">
              {scriptCount > 1
                ? `Generating ${scriptCount} scripts takes about ${scriptCount * 8}–${scriptCount * 12} seconds`
                : 'Generation usually takes 5\u201310 seconds'}
            </p>

            {/* Inline error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Results ─── */}
      {results.map((result) => (
        <ScriptResultCard
          key={result.script.id}
          result={result}
          status={scriptStatuses[result.script.id] ?? 'draft'}
          ideaSaved={ideaSavedMap[result.script.id] ?? false}
          onStatusCycle={() => handleStatusCycle(result.script.id)}
          onDelete={() => handleDelete(result.script.id)}
          onSaveAsIdea={() => handleSaveAsIdea(result)}
        />
      ))}
    </div>
  )
}

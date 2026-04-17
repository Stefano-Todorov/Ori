'use client'

import { useState } from 'react'
import { DeleteButton } from '@/components/ui/delete-button'
import type { Script, PostStatus } from '@/lib/types'
import { Copy, Check } from 'lucide-react'
import { deleteScript, updateScriptStatus } from '@/app/actions'

interface Props {
  scripts: Script[]
}

const STATUS_NEXT: Record<PostStatus, PostStatus> = {
  draft: 'used',
  used: 'archived',
  archived: 'draft',
}

const STATUS_STYLES: Record<PostStatus, string> = {
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

function ScriptCard({ script, onDelete }: { script: Script; onDelete: (id: string) => Promise<void> }) {
  const [status, setStatus] = useState<PostStatus>(script.status ?? 'draft')
  const [copied, setCopied] = useState(false)

  const bodySegments = parseBody(script.body ?? '')

  async function handleStatusCycle() {
    const next = STATUS_NEXT[status]
    await updateScriptStatus(script.id, next)
    setStatus(next)
  }

  async function handleCopy() {
    const text = `HOOK:\n${script.hook}\n\nSCRIPT:\n${script.body}\n\nCTA:\n${script.cta}\n\nHASHTAGS:\n${script.hashtags?.map((h) => '#' + h).join(' ') ?? ''}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      {/* ─── Title row ─── */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="font-bold text-lg flex-1 truncate text-foreground leading-tight">{script.topic}</h3>
        {script.eval_score != null && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
            script.eval_score >= 8
              ? 'bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400'
              : script.eval_score >= 5
              ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
              : 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400'
          }`} title={script.eval_tags?.length ? `Strengths: ${script.eval_tags.join(', ')}` : undefined}>
            {script.eval_score}/10
          </span>
        )}
        {script.estimated_duration && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center gap-1">
            &#128336; {script.estimated_duration}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {new Date(script.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* ─── Actions ─── */}
      <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-border dark:border-white/6">
        <button
          type="button"
          onClick={handleStatusCycle}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${STATUS_STYLES[status]}`}
        >
          {status}
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted dark:bg-white/[0.06] text-foreground hover:bg-muted/80 dark:hover:bg-white/10 transition-all duration-150"
        >
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
        </button>
        <div className="ml-auto">
          <DeleteButton onDelete={() => onDelete(script.id)} />
        </div>
      </div>

      {/* ─── Hook ─── */}
      {script.hook && (
        <div className="relative bg-gradient-to-br from-purple-500/15 to-purple-500/5 dark:from-purple-500/15 dark:to-purple-500/[0.03] border border-purple-500/30 rounded-xl p-4 pl-6 border-l-[3px] border-l-purple-500">
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
            &#9889; Hook
          </p>
          <p className="text-base font-medium italic text-foreground leading-relaxed">&quot;{script.hook}&quot;</p>
        </div>
      )}

      {/* ─── Script body ─── */}
      {script.body && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] shrink-0">Script</p>
            <div className="flex-1 h-px bg-border dark:bg-white/6" />
          </div>
          {bodySegments.length > 0 ? (
            <div className="space-y-2">
              {bodySegments.map((seg, i) => (
                <div key={i} className="rounded-[10px] border border-border dark:border-white/6 bg-muted/50 dark:bg-[#1a1a2e] p-3.5 transition-colors hover:bg-muted dark:hover:bg-[#1e1e38]">
                  {seg.label && (
                    <p className={`text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5 ${getSectionColor(seg.label)}`}>
                      {seg.label}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85 dark:text-[#d1d5db]">{seg.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted dark:bg-[#1a1a2e] rounded-[10px] p-3.5">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85 dark:text-[#d1d5db]">{script.body}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── CTA ─── */}
      {script.cta && (
        <div className="bg-teal-500/[0.06] border border-teal-500/20 rounded-xl p-3.5">
          <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-[0.08em] mb-1.5 flex items-center gap-1.5">
            &#128227; CTA
          </p>
          <p className="text-sm text-foreground font-medium">{script.cta}</p>
        </div>
      )}

      {/* ─── Hashtags ─── */}
      {script.hashtags && script.hashtags.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
            # Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {script.hashtags.map((tag) => (
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

      {/* ─── Eval Tags ─── */}
      {script.eval_tags && script.eval_tags.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
            Strengths
          </p>
          <div className="flex flex-wrap gap-1.5">
            {script.eval_tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ScriptList({ scripts: initialScripts }: Props) {
  const [scripts, setScripts] = useState(initialScripts)
  async function handleDelete(id: string) {
    await deleteScript(id)
    setScripts((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">Saved scripts ({scripts.length})</h2>

      {scripts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No scripts yet.</p>
      ) : (
        <div className="space-y-5">
          {scripts.map((script) => (
            <ScriptCard key={script.id} script={script} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

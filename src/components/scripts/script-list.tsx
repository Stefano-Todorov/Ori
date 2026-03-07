'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/components/ui/delete-button'
import type { Script, PostStatus } from '@/lib/types'
import { Copy, Check } from 'lucide-react'
import { deleteScript, updateScriptStatus } from '@/app/actions'

interface Props {
  scripts: Script[]
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
}

const STATUS_NEXT: Record<PostStatus, PostStatus> = {
  draft: 'used',
  used: 'archived',
  archived: 'draft',
}

const STATUS_COLORS: Record<PostStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  used: 'bg-green-100 text-green-800 hover:bg-green-200',
  archived: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
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

function ScriptCard({ script, onDelete }: { script: Script; onDelete: (id: string) => void }) {
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
    <Card className="border-border">
      <CardContent className="pt-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold text-base flex-1 truncate">{script.topic}</h3>
          {script.difficulty && (
            <Badge className={DIFFICULTY_COLORS[script.difficulty as keyof typeof DIFFICULTY_COLORS]}>
              {script.difficulty}
            </Badge>
          )}
          {script.estimated_duration && (
            <Badge variant="outline">{script.estimated_duration}</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(script.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleStatusCycle}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${STATUS_COLORS[status]}`}
          >
            {status}
          </button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <><Check size={14} className="mr-1" />Copied</> : <><Copy size={14} className="mr-1" />Copy</>}
          </Button>
          <DeleteButton onDelete={() => onDelete(script.id)} />
        </div>

        {/* Hook */}
        {script.hook && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Hook</p>
            <p className="font-medium">&quot;{script.hook}&quot;</p>
          </div>
        )}

        {/* Body */}
        {script.body && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Script</p>
            {bodySegments.length > 0 ? (
              <div className="space-y-2">
                {bodySegments.map((seg, i) => (
                  <div key={i} className="rounded-lg border bg-muted/30 p-3">
                    {seg.label && (
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        {seg.label}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{seg.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm whitespace-pre-wrap">{script.body}</p>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {script.cta && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">CTA</p>
            <p className="text-sm">{script.cta}</p>
          </div>
        )}

        {/* Hashtags */}
        {script.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {script.hashtags.map((tag) => (
              <Badge key={tag} variant="secondary">#{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ScriptList({ scripts: initialScripts }: Props) {
  const [scripts, setScripts] = useState(initialScripts)
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')

  async function handleDelete(id: string) {
    await deleteScript(id)
    setScripts((prev) => prev.filter((s) => s.id !== id))
  }

  const filtered = filter === 'all' ? scripts : scripts.filter((s) => s.difficulty === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Saved scripts ({scripts.length})</h2>
        <div className="flex gap-2">
          {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
            <Button
              key={d}
              variant={filter === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No scripts yet for this difficulty.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((script) => (
            <ScriptCard key={script.id} script={script} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

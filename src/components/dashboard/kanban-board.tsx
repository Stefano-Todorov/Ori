'use client'

import { useState, useTransition, useRef } from 'react'
import { updateProductionStatus, updateIdea } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { refreshKeepScroll } from '@/lib/router-utils'
import type { ContentIdea, ProductionStatus } from '@/lib/types'
import { GripVertical, ChevronDown, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  ideas: ContentIdea[]
  batchSize: number
}

const STATUS_RANK_STYLE: Record<ProductionStatus, string> = {
  new: 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30',
  recording: 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30',
  editing: 'text-blue-600 dark:text-blue-400 bg-blue-500/15 border-blue-500/30',
  ready: 'text-purple-600 dark:text-purple-400 bg-purple-500/15 border-purple-500/30',
  posted: 'text-green-600 dark:text-green-400 bg-green-500/15 border-green-500/30',
}

const COLUMNS: { status: ProductionStatus; label: string; color: string; border: string }[] = [
  { status: 'recording', label: 'Recording', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', border: 'border-t-amber-500' },
  { status: 'editing', label: 'Editing', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', border: 'border-t-blue-500' },
  { status: 'ready', label: 'Ready to Post', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', border: 'border-t-purple-500' },
  { status: 'posted', label: 'Posted', color: 'bg-green-500/10 text-green-600 dark:text-green-400', border: 'border-t-green-500' },
]

const STATUS_PILL: Record<ProductionStatus, string> = {
  new: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  recording: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
  editing: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30',
  ready: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
  posted: 'bg-green-400/15 text-green-400 border-green-400/30',
}

const STATUS_LABEL: Record<ProductionStatus, string> = {
  new: 'New',
  recording: 'Recording',
  editing: 'Editing',
  ready: 'Ready to Post',
  posted: 'Posted',
}

/* ─── Edit Dialog ─── */
function EditIdeaDialog({
  idea,
  onClose,
  onStatusChange,
}: {
  idea: ContentIdea | null
  onClose: () => void
  onStatusChange: (ideaId: string, status: ProductionStatus) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    idea: idea?.idea ?? '',
    inspiration_url: idea?.inspiration_url ?? '',
    hook_idea: idea?.hook_idea ?? '',
    script_snippet: idea?.script_snippet ?? '',
    cta: idea?.cta ?? '',
    caption: idea?.caption ?? '',
  })

  if (!idea) return null

  function handleSave() {
    startTransition(async () => {
      await updateIdea(idea!.id, {
        idea: form.idea,
        inspiration_url: form.inspiration_url || null,
        hook_idea: form.hook_idea || null,
        script_snippet: form.script_snippet || null,
        cta: form.cta || null,
        caption: form.caption || null,
      })
      refreshKeepScroll(router)
      onClose()
    })
  }

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  return (
    <Dialog open={!!idea} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border dark:border-white/10 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Idea</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <Select
            value={idea.production_status}
            onValueChange={(v) => onStatusChange(idea.id, v as ProductionStatus)}
          >
            <SelectTrigger className={`h-8 w-auto text-[11px] font-semibold rounded-lg px-3 gap-1.5 border ${STATUS_PILL[idea.production_status]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['new', 'recording', 'editing', 'ready', 'posted'] as const).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Idea</label>
            <Textarea
              value={form.idea}
              onChange={e => setForm(f => ({ ...f, idea: e.target.value }))}
              className={`${inputClass} min-h-[80px]`}
            />
          </div>
          {(idea.inspiration_url || form.inspiration_url) && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">Inspiration URL</label>
                {(form.inspiration_url || idea.inspiration_url) && (
                  <a
                    href={form.inspiration_url || idea.inspiration_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <ExternalLink size={11} />
                    View original
                  </a>
                )}
              </div>
              <Input
                value={form.inspiration_url}
                onChange={e => setForm(f => ({ ...f, inspiration_url: e.target.value }))}
                className={inputClass}
                placeholder="https://..."
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Hook</label>
            <Input
              value={form.hook_idea}
              onChange={e => setForm(f => ({ ...f, hook_idea: e.target.value }))}
              className={inputClass}
              placeholder="Hook idea..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Body / Script</label>
            <Textarea
              value={form.script_snippet}
              onChange={e => setForm(f => ({ ...f, script_snippet: e.target.value }))}
              className={`${inputClass} min-h-[60px]`}
              placeholder="Script snippet or body..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA</label>
            <Input
              value={form.cta}
              onChange={e => setForm(f => ({ ...f, cta: e.target.value }))}
              className={inputClass}
              placeholder="Call to action..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Caption</label>
            <Textarea
              value={form.caption}
              onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
              className={`${inputClass} min-h-[60px]`}
              placeholder="Caption..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !form.idea.trim()}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold disabled:opacity-50 hover:bg-purple-700 transition-all"
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Main Component ─── */
export function KanbanBoard({ ideas, batchSize }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedCols, setExpandedCols] = useState<Set<ProductionStatus>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null)
  const didDrag = useRef(false)

  function handleDragStart(e: React.DragEvent, ideaId: string) {
    e.dataTransfer.setData('text/plain', ideaId)
    setDraggingId(ideaId)
    didDrag.current = false
  }

  function handleDrag() {
    didDrag.current = true
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, newStatus: ProductionStatus) {
    e.preventDefault()
    const ideaId = e.dataTransfer.getData('text/plain')
    setDraggingId(null)
    if (!ideaId) return

    const idea = ideas.find(i => i.id === ideaId)
    if (!idea || idea.production_status === newStatus) return

    startTransition(async () => {
      await updateProductionStatus(ideaId, newStatus)
      refreshKeepScroll(router)
    })
  }

  function handleStatusChange(ideaId: string, newStatus: ProductionStatus) {
    startTransition(async () => {
      await updateProductionStatus(ideaId, newStatus)
      refreshKeepScroll(router)
    })
  }

  function handleCardClick(idea: ContentIdea) {
    // Only open edit if this wasn't a drag
    if (!didDrag.current) {
      setEditingIdea(idea)
    }
    didDrag.current = false
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Production Board</p>
          <p className="text-[10px] text-muted-foreground">Drag ideas between columns to update status</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map(col => {
            const colIdeas = ideas.filter(i => i.production_status === col.status)
            const isExpanded = expandedCols.has(col.status)
            const isWipColumn = col.status === 'recording' || col.status === 'editing'
            const overLimit = colIdeas.length > batchSize
            const visible = (overLimit && !isExpanded) ? colIdeas.slice(0, batchSize) : colIdeas
            const hiddenCount = colIdeas.length - batchSize

            return (
              <div
                key={col.status}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, col.status)}
                className={`border-t-2 ${col.border} bg-muted/30 dark:bg-white/[0.02] rounded-xl p-3 min-h-[120px] transition-all ${
                  draggingId ? 'ring-1 ring-purple-500/20' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.color}`}>
                    {col.label}
                  </span>
                  <span>
                    {isWipColumn ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border ${
                        overLimit
                          ? 'bg-red-500/15 text-red-500 border-red-500/30 animate-pulse'
                          : `${col.color} border-current/20`
                      }`}>
                        {colIdeas.length}/{batchSize}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums ${col.color}`}>
                        {colIdeas.length}
                      </span>
                    )}
                  </span>
                </div>

                <div className="space-y-2">
                  {visible.map((idea, i) => (
                    <div
                      key={idea.id}
                      draggable
                      onDragStart={e => handleDragStart(e, idea.id)}
                      onDrag={handleDrag}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => handleCardClick(idea)}
                      className={`group bg-card border border-border rounded-lg p-2.5 cursor-pointer transition-colors hover:border-purple-500/40 ${
                        draggingId === idea.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5 hidden md:flex">
                          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums leading-none border ${STATUS_RANK_STYLE[idea.production_status]}`}>{i + 1}</span>
                          <GripVertical size={14} className="text-muted-foreground/40 cursor-grab" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-2">{idea.idea}</p>
                        </div>
                        {/* Mobile: dropdown to change status */}
                        <div className="md:hidden relative" onClick={e => e.stopPropagation()}>
                          <select
                            value={idea.production_status}
                            onChange={e => handleStatusChange(idea.id, e.target.value as ProductionStatus)}
                            className="appearance-none bg-transparent text-[10px] text-muted-foreground pr-3 cursor-pointer"
                            disabled={isPending}
                          >
                            {COLUMNS.map(c => (
                              <option key={c.status} value={c.status}>{c.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {visible.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-4">No ideas</p>
                  )}
                  {overLimit && (
                    <button
                      onClick={() => setExpandedCols(prev => {
                        const next = new Set(prev)
                        if (next.has(col.status)) next.delete(col.status)
                        else next.add(col.status)
                        return next
                      })}
                      className={`text-[10px] text-center w-full transition-colors cursor-pointer ${
                        isExpanded
                          ? 'text-muted-foreground hover:text-foreground'
                          : 'text-muted-foreground hover:text-purple-400'
                      }`}
                    >
                      {isExpanded ? 'Show less' : `+${hiddenCount} hidden`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <EditIdeaDialog key={editingIdea?.id} idea={editingIdea} onClose={() => setEditingIdea(null)} onStatusChange={handleStatusChange} />
    </>
  )
}

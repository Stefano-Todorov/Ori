'use client'

import { useState, useTransition } from 'react'
import { updateProductionStatus, updateIdea } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { refreshKeepScroll } from '@/lib/router-utils'
import { Pencil, GripVertical, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ContentIdea, ProductionStatus } from '@/lib/types'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'

interface Props {
  ideas: ContentIdea[]
  batchSize: number
}

const STAGES: { status: ProductionStatus; label: string; color: string; bg: string; border: string }[] = [
  { status: 'recording', label: 'Recording', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { status: 'editing', label: 'Editing', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { status: 'ready', label: 'Ready to Post', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { status: 'posted', label: 'Posted', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
]

const STATUS_BAR_COLOR: Record<ProductionStatus, string> = {
  new: 'bg-amber-500',
  recording: 'bg-amber-500',
  editing: 'bg-blue-500',
  ready: 'bg-purple-500',
  posted: 'bg-green-500',
}

const STATUS_RANK_STYLE: Record<ProductionStatus, string> = {
  new: 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30',
  recording: 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30',
  editing: 'text-blue-600 dark:text-blue-400 bg-blue-500/15 border-blue-500/30',
  ready: 'text-purple-600 dark:text-purple-400 bg-purple-500/15 border-purple-500/30',
  posted: 'text-green-600 dark:text-green-400 bg-green-500/15 border-green-500/30',
}

const STATUS_PILL: Record<ProductionStatus, string> = {
  new: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  recording: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
  editing: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
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

function parseSource(source: string | null): { prefix: string; handle: string; platform: string } | null {
  if (!source) return null
  const m = source.match(/^(extension|inspiration):\s*@?(\S+)\s*\((\w+)\)$/i)
  if (m) return { prefix: m[1], handle: m[2], platform: m[3] }
  return null
}

function ContentSection({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-border/30 dark:border-white/[0.06] bg-muted/20 dark:bg-white/[0.02] p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xs whitespace-pre-wrap text-foreground">{text}</p>
    </div>
  )
}

/* ─── Sortable Idea Card ─── */
function SortableIdeaCard({ idea, rank, onEdit, onStatusChange }: {
  idea: ContentIdea
  rank: number
  onEdit: (idea: ContentIdea) => void
  onStatusChange: (ideaId: string, status: ProductionStatus) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group">
      <IdeaCardContent
        idea={idea}
        rank={rank}
        onEdit={onEdit}
        onStatusChange={onStatusChange}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  )
}

/* ─── Idea Card Content (shared between sortable and overlay) ─── */
function IdeaCardContent({
  idea,
  rank,
  onEdit,
  onStatusChange,
  dragAttributes,
  dragListeners,
  isOverlay,
}: {
  idea: ContentIdea
  rank?: number
  onEdit?: (idea: ContentIdea) => void
  onStatusChange?: (ideaId: string, status: ProductionStatus) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragAttributes?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragListeners?: any
  isOverlay?: boolean
}) {
  const [thumbHidden, setThumbHidden] = useState(false)
  const parsed = parseSource(idea.source)
  const hasContent = idea.hook_idea || idea.script_snippet || idea.cta || idea.caption

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isOverlay
          ? 'shadow-xl shadow-black/30 ring-2 ring-purple-500/50 border-purple-500/30 bg-card dark:bg-[#1a1a2e]'
          : 'border-border/50 dark:border-white/[0.06] bg-muted/20 dark:bg-[#1a1a2e] hover:border-border dark:hover:border-white/[0.12]'
      } ${onEdit ? 'cursor-pointer' : ''}`}
      style={{ padding: '12px 14px' }}
      onClick={() => onEdit?.(idea)}
    >
      {/* Header: drag handle + title + actions */}
      <div className="flex items-start gap-2">
        {/* Rank + Drag handle */}
        <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
          {rank != null && (
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums leading-none border ${STATUS_RANK_STYLE[idea.production_status]}`}>{rank}</span>
          )}
          <button
            {...(dragAttributes ?? {})}
            {...(dragListeners ?? {})}
            className="p-0.5 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </button>
        </div>

        {/* Status accent bar */}
        <div className={`w-[3px] self-stretch rounded-full shrink-0 ${STATUS_BAR_COLOR[idea.production_status]}`} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-bold text-sm text-foreground leading-snug">{idea.idea}</h3>

          {/* Metadata row */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-xs">
            {parsed ? (
              <>
                <span className="text-muted-foreground">via {parsed.prefix}:</span>
                <span className="text-purple-600 dark:text-purple-400 font-medium">@{parsed.handle}</span>
                <span className="text-muted-foreground/50">({parsed.platform})</span>
              </>
            ) : idea.source ? (
              <span className="text-muted-foreground">via {idea.source}</span>
            ) : null}
          </div>

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {idea.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] text-muted-foreground bg-muted/50 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
              {idea.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{idea.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Inspiration URL */}
          {idea.inspiration_url && (
            <a
              href={idea.inspiration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 h-7 px-2.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all w-fit"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={11} />
              View original
            </a>
          )}

          {/* Content sections */}
          {hasContent && (
            <div className="space-y-1.5 mt-2">
              {idea.hook_idea && <ContentSection label="Hook" text={idea.hook_idea} />}
              {idea.script_snippet && <ContentSection label="Body / Script" text={idea.script_snippet} />}
              {idea.cta && <ContentSection label="CTA" text={idea.cta} />}
              {idea.caption && <ContentSection label="Caption" text={idea.caption} />}
            </div>
          )}
        </div>

        {/* Right side: thumbnail + status + edit */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {/* Status dropdown */}
            {onStatusChange && (
              <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={idea.production_status}
                onValueChange={(v) => onStatusChange(idea.id, v as ProductionStatus)}
              >
                <SelectTrigger className={`h-6 w-auto text-[10px] font-semibold rounded-full px-2 gap-1 border ${STATUS_PILL[idea.production_status]}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['new', 'recording', 'editing', 'ready', 'posted'] as const).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            )}

            {/* Edit button */}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(idea) }}
                className="p-1 text-muted-foreground hover:text-purple-500 transition-colors opacity-0 group-hover:opacity-100 rounded-md hover:bg-muted/50 dark:hover:bg-white/[0.05]"
                title="Edit"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>

          {/* Thumbnail */}
          {idea.thumbnail_url && !thumbHidden && (
            <a
              href={idea.inspiration_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={idea.thumbnail_url}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-border/30 dark:border-white/[0.08]"
                referrerPolicy="no-referrer"
                onError={() => setThumbHidden(true)}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement
                  if (img.naturalWidth === 0) setThumbHidden(true)
                }}
              />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Droppable Column ─── */
function DroppableColumn({
  stage,
  ideas,
  batchSize,
  isExpanded,
  onToggleExpand,
  onEdit,
  onStatusChange,
}: {
  stage: typeof STAGES[number]
  ideas: ContentIdea[]
  batchSize: number
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: (idea: ContentIdea) => void
  onStatusChange: (ideaId: string, status: ProductionStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.status })
  const isWipColumn = stage.status === 'recording' || stage.status === 'editing'
  const overLimit = ideas.length > batchSize
  const visibleIdeas = isExpanded || !overLimit ? ideas : ideas.slice(0, batchSize)
  const hiddenCount = ideas.length - batchSize

  return (
    <div className="space-y-2">
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${stage.bg}`}>
        <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
        <span className="text-[10px] font-medium text-muted-foreground ml-auto">
          {isWipColumn ? (
            <span className={overLimit ? 'text-amber-500 font-bold' : ''}>
              {ideas.length} / {batchSize}
            </span>
          ) : (
            ideas.length
          )}
        </span>
      </div>

      {/* Column drop zone */}
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[100px] rounded-xl p-1.5 transition-all duration-200 ${
          isOver ? `${stage.bg} ${stage.border} border-2 border-dashed` : 'border-2 border-transparent'
        }`}
      >
        <SortableContext items={visibleIdeas.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {visibleIdeas.map((idea, i) => (
            <SortableIdeaCard
              key={idea.id}
              idea={idea}
              rank={i + 1}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
            />
          ))}
        </SortableContext>

        {/* Expand / collapse toggle */}
        {overLimit && (
          <button
            type="button"
            onClick={onToggleExpand}
            className={`w-full py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
              isExpanded
                ? 'text-muted-foreground hover:text-foreground'
                : `${stage.color} ${stage.bg} hover:opacity-80`
            }`}
          >
            {isExpanded ? 'Show less' : `+${hiddenCount} hidden`}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Edit Dialog ─── */
function EditIdeaDialog({
  idea,
  onClose,
}: {
  idea: ContentIdea | null
  onClose: () => void
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
export function ProductionTracker({ ideas, batchSize }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null)
  const [expandedColumns, setExpandedColumns] = useState<Set<ProductionStatus>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const grouped = STAGES.map(stage => ({
    ...stage,
    items: ideas.filter(idea => {
      const displayStatus = idea.production_status === 'new' ? 'recording' : idea.production_status
      return displayStatus === stage.status
    }),
  }))

  const activeIdea = activeId ? ideas.find(i => i.id === activeId) ?? null : null

  function handleStatusChange(ideaId: string, status: ProductionStatus) {
    startTransition(async () => {
      await updateProductionStatus(ideaId, status)
      refreshKeepScroll(router)
    })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const ideaId = active.id as string
    const idea = ideas.find(i => i.id === ideaId)
    if (!idea) return

    let targetStatus: ProductionStatus | null = null

    if (['recording', 'editing', 'ready', 'posted'].includes(over.id as string)) {
      targetStatus = over.id as ProductionStatus
    } else {
      const targetIdea = ideas.find(i => i.id === over.id)
      if (targetIdea) {
        targetStatus = targetIdea.production_status === 'new' ? 'recording' : targetIdea.production_status
      }
    }

    if (!targetStatus) return

    const currentStatus = idea.production_status === 'new' ? 'recording' : idea.production_status
    if (currentStatus === targetStatus) return

    startTransition(async () => {
      await updateProductionStatus(ideaId, targetStatus!)
      refreshKeepScroll(router)
    })
  }

  function handleDragOver(_event: DragOverEvent) {
    // Visual feedback handled by useDroppable isOver
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Production Pipeline</p>
          <p className="text-[10px] text-muted-foreground">Drag ideas between columns to update status</p>
        </div>

        {ideas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No ideas in the pipeline yet. Create ideas and update their production status to track progress.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {grouped.map(stage => (
                <DroppableColumn
                  key={stage.status}
                  stage={stage}
                  ideas={stage.items}
                  batchSize={batchSize}
                  isExpanded={expandedColumns.has(stage.status)}
                  onToggleExpand={() => setExpandedColumns(prev => {
                    const next = new Set(prev)
                    if (next.has(stage.status)) next.delete(stage.status)
                    else next.add(stage.status)
                    return next
                  })}
                  onEdit={setEditingIdea}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>

            <DragOverlay>
              {activeIdea ? (
                <div className="w-[300px]">
                  <IdeaCardContent idea={activeIdea} isOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <EditIdeaDialog key={editingIdea?.id} idea={editingIdea} onClose={() => setEditingIdea(null)} />
    </>
  )
}

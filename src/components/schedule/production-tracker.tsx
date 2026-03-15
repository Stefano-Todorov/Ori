'use client'

import { useState, useTransition } from 'react'
import { updateProductionStatus, updateIdea } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Pencil, X, GripVertical } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ContentIdea, ProductionStatus, Difficulty } from '@/lib/types'
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
}

const STAGES: { status: ProductionStatus; label: string; color: string; bg: string; border: string }[] = [
  { status: 'recording', label: 'Recording', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { status: 'editing', label: 'Editing', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { status: 'posted', label: 'Posted', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
]

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600 dark:text-green-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

/* ─── Sortable Idea Card ─── */
function SortableIdeaCard({ idea, onEdit }: { idea: ContentIdea; onEdit: (idea: ContentIdea) => void }) {
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
      <IdeaCardContent idea={idea} onEdit={onEdit} dragAttributes={attributes} dragListeners={listeners} />
    </div>
  )
}

/* ─── Idea Card Content (shared between sortable and overlay) ─── */
function IdeaCardContent({
  idea,
  onEdit,
  dragAttributes,
  dragListeners,
  isOverlay,
}: {
  idea: ContentIdea
  onEdit?: (idea: ContentIdea) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragAttributes?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragListeners?: any
  isOverlay?: boolean
}) {
  return (
    <div className={`px-3 py-2.5 rounded-xl bg-muted/30 dark:bg-white/[0.03] border border-border/50 dark:border-white/5 hover:bg-muted/50 dark:hover:bg-white/[0.05] transition-colors ${isOverlay ? 'shadow-xl shadow-black/20 ring-2 ring-purple-500/50' : ''}`}>
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...(dragAttributes ?? {})}
          {...(dragListeners ?? {})}
          className="mt-0.5 p-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
        >
          <GripVertical size={12} />
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title */}
          <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{idea.idea}</p>

          {/* Hook */}
          {idea.hook_idea && (
            <p className="text-[10px] text-muted-foreground italic line-clamp-1">
              Hook: {idea.hook_idea}
            </p>
          )}

          {/* Tags row */}
          <div className="flex items-center gap-1 flex-wrap">
            {idea.difficulty && (
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[idea.difficulty] ?? ''}`}>
                {idea.difficulty}
              </span>
            )}
            {idea.video_type && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {idea.video_type}
              </span>
            )}
            {idea.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] text-muted-foreground bg-muted/50 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            {(idea.tags?.length ?? 0) > 2 && (
              <span className="text-[9px] text-muted-foreground">+{idea.tags!.length - 2}</span>
            )}
          </div>
        </div>

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={() => onEdit(idea)}
            className="p-1 text-muted-foreground hover:text-purple-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Droppable Column ─── */
function DroppableColumn({
  stage,
  ideas,
  onEdit,
}: {
  stage: typeof STAGES[number]
  ideas: ContentIdea[]
  onEdit: (idea: ContentIdea) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.status })

  return (
    <div className="space-y-2">
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${stage.bg}`}>
        <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
        <span className="text-[10px] font-medium text-muted-foreground ml-auto">{ideas.length}</span>
      </div>

      {/* Column drop zone */}
      <div
        ref={setNodeRef}
        className={`space-y-1.5 min-h-[80px] rounded-xl p-1.5 transition-all duration-200 ${
          isOver ? `${stage.bg} ${stage.border} border-2 border-dashed` : 'border-2 border-transparent'
        }`}
      >
        <SortableContext items={ideas.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {ideas.map(idea => (
            <SortableIdeaCard key={idea.id} idea={idea} onEdit={onEdit} />
          ))}
        </SortableContext>
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
    hook_idea: idea?.hook_idea ?? '',
    cta: idea?.cta ?? '',
    difficulty: idea?.difficulty ?? '',
    video_type: idea?.video_type ?? '',
  })

  if (!idea) return null

  function handleSave() {
    startTransition(async () => {
      await updateIdea(idea!.id, {
        idea: form.idea,
        hook_idea: form.hook_idea || null,
        cta: form.cta || null,
        difficulty: (form.difficulty || null) as Difficulty | null,
        video_type: form.video_type || null,
      })
      router.refresh()
      onClose()
    })
  }

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  return (
    <Dialog open={!!idea} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[480px] bg-card dark:bg-[#12121a] border-border dark:border-white/10">
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA</label>
            <Input
              value={form.cta}
              onChange={e => setForm(f => ({ ...f, cta: e.target.value }))}
              className={inputClass}
              placeholder="Call to action..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                className={`w-full h-9 px-3 text-sm ${inputClass}`}
              >
                <option value="">None</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Video Type</label>
              <Input
                value={form.video_type}
                onChange={e => setForm(f => ({ ...f, video_type: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Talking head"
              />
            </div>
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
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white text-xs font-bold disabled:opacity-50 hover:brightness-110 transition-all"
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
export function ProductionTracker({ ideas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null)

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

    // Determine target column
    let targetStatus: ProductionStatus | null = null

    // Check if dropped on a column
    if (['recording', 'editing', 'posted'].includes(over.id as string)) {
      targetStatus = over.id as ProductionStatus
    } else {
      // Dropped on another card — find which column that card is in
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
      router.refresh()
    })
  }

  function handleDragOver(_event: DragOverEvent) {
    // Visual feedback handled by useDroppable isOver
  }

  return (
    <>
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {grouped.map(stage => (
                <DroppableColumn
                  key={stage.status}
                  stage={stage}
                  ideas={stage.items}
                  onEdit={setEditingIdea}
                />
              ))}
            </div>

            <DragOverlay>
              {activeIdea ? (
                <div className="w-[280px]">
                  <IdeaCardContent idea={activeIdea} isOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <EditIdeaDialog idea={editingIdea} onClose={() => setEditingIdea(null)} />
    </>
  )
}

'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { refreshKeepScroll } from '@/lib/router-utils'
import { updateProductionStatus, reorderIdeas, schedulePost } from '@/app/actions'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { ScheduleCalendar } from '@/components/dashboard/schedule-calendar'
import { PlanPostForm } from './plan-post-form'
import { ScheduledPostsList } from './scheduled-posts-list'
import {
  ProductionPipeline,
  IdeaCardContent,
  COLUMN_IDS,
  customCollisionDetection,
  getDisplayStatus,
} from './production-tracker'
import { EditIdeaDialog, AddIdeaDialog } from '@/components/ideas/edit-idea-dialog'
import type { ContentIdea, ProductionStatus, ScheduledPost } from '@/lib/types'

interface PostWithIdea extends ScheduledPost {
  content_idea?: {
    id: string
    idea: string
    tags?: string[]
    hook_idea?: string | null
    cta?: string | null
  } | null
}

interface Props {
  scheduledPosts: PostWithIdea[]
  pipelineIdeas: ContentIdea[]
  availableIdeas: ContentIdea[]
  batchSize: number
}

type AddPrefill = {
  inspirationUrl?: string
  source?: string
  idea?: string
  hookIdea?: string
  scriptSnippet?: string
  cta?: string
  caption?: string
  tags?: string[]
}

function formatDay(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Wraps the schedule calendar and the production pipeline in a single
 * DndContext so pipeline cards can be dragged either between columns
 * (reorder / status change) or onto a calendar day (schedule a post).
 */
export function SchedulePlanner({ scheduledPosts, pipelineIdeas, availableIdeas, batchSize }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addPrefill, setAddPrefill] = useState<AddPrefill>({})
  const [flash, setFlash] = useState<string | null>(null)

  function showFlash(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2800)
  }

  // Local mirrors of server data for optimistic drag/drop feedback
  const [localIdeas, setLocalIdeas] = useState(pipelineIdeas)
  const [localPosts, setLocalPosts] = useState(scheduledPosts)
  useEffect(() => { setLocalIdeas(pipelineIdeas) }, [pipelineIdeas])
  useEffect(() => { setLocalPosts(scheduledPosts) }, [scheduledPosts])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeIdea = activeId ? localIdeas.find(i => i.id === activeId) ?? null : null

  function handleStatusChange(ideaId: string, status: ProductionStatus) {
    setLocalIdeas(prev => prev.map(i => (i.id === ideaId ? { ...i, production_status: status } : i)))
    startTransition(async () => {
      await updateProductionStatus(ideaId, status)
      refreshKeepScroll(router)
    })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const ideaId = String(active.id)
    const idea = localIdeas.find(i => i.id === ideaId)
    if (!idea) return

    const overId = String(over.id)

    // ── Dropped on a calendar day → schedule the post ──
    if (overId.startsWith('cal:')) {
      const date = overId.slice(4)
      if (localPosts.some(p => p.content_idea_id === idea.id && p.scheduled_date === date)) {
        showFlash('That idea is already scheduled for this day')
        return
      }
      const optimistic: PostWithIdea = {
        id: `temp-${Date.now()}`,
        user_id: '',
        content_idea_id: idea.id,
        platform: null,
        title: idea.idea,
        scheduled_date: date,
        notes: null,
        created_at: new Date().toISOString(),
        content_idea: {
          id: idea.id,
          idea: idea.idea,
          tags: idea.tags,
          hook_idea: idea.hook_idea,
          cta: idea.cta,
        },
      }
      setLocalPosts(prev => [...prev, optimistic])
      showFlash(`Scheduled for ${formatDay(date)}`)
      startTransition(async () => {
        await schedulePost({ content_idea_id: idea.id, title: idea.idea, scheduled_date: date })
        refreshKeepScroll(router)
      })
      return
    }

    if (active.id === over.id) return

    // ── Determine the target pipeline column ──
    let targetStatus: ProductionStatus | null = null
    if (COLUMN_IDS.has(overId)) {
      targetStatus = overId as ProductionStatus
    } else {
      const targetIdea = localIdeas.find(i => i.id === overId)
      if (targetIdea) targetStatus = getDisplayStatus(targetIdea)
    }
    if (!targetStatus) return

    const currentStatus = getDisplayStatus(idea)

    if (currentStatus === targetStatus) {
      // Same column — reorder
      const columnItems = localIdeas
        .filter(i => getDisplayStatus(i) === currentStatus)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      const oldIndex = columnItems.findIndex(i => i.id === active.id)
      const newIndex = columnItems.findIndex(i => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const reordered = arrayMove(columnItems, oldIndex, newIndex)
      setLocalIdeas(prev => {
        const others = prev.filter(i => getDisplayStatus(i) !== currentStatus)
        const updated = reordered.map((item, i) => ({ ...item, sort_order: i }))
        return [...others, ...updated]
      })
      startTransition(async () => {
        await reorderIdeas(reordered.map(i => i.id))
        refreshKeepScroll(router)
      })
    } else {
      // Cross-column — change status
      setLocalIdeas(prev => prev.map(i => (i.id === ideaId ? { ...i, production_status: targetStatus! } : i)))
      startTransition(async () => {
        await updateProductionStatus(ideaId, targetStatus!)
        refreshKeepScroll(router)
      })
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="space-y-8">
          {/* Calendar + plan form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ScheduleCalendar scheduledPosts={localPosts} droppable dragActive={activeId !== null} />
            </div>
            <PlanPostForm ideas={availableIdeas} />
          </div>

          {/* Planned posts list */}
          <ScheduledPostsList posts={localPosts} />

          {/* Production pipeline */}
          <ProductionPipeline
            ideas={localIdeas}
            batchSize={batchSize}
            onEdit={setEditingIdea}
            onStatusChange={handleStatusChange}
          />
        </div>

        <DragOverlay>
          {activeIdea ? (
            <div className="w-[300px]">
              <IdeaCardContent idea={activeIdea} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {flash && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-purple-500/30 shadow-xl shadow-black/30 text-xs font-medium text-foreground animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check size={14} className="text-purple-500" />
          {flash}
        </div>
      )}

      <EditIdeaDialog
        key={editingIdea?.id}
        idea={editingIdea}
        scheduledDate={editingIdea ? (localPosts.find(p => p.content_idea_id === editingIdea.id)?.scheduled_date ?? null) : null}
        onClose={() => setEditingIdea(null)}
        onStatusChange={handleStatusChange}
        onSaved={() => refreshKeepScroll(router)}
        onScheduled={() => refreshKeepScroll(router)}
        onAddAnother={(url, source) => {
          setEditingIdea(null)
          setAddPrefill({ inspirationUrl: url, source })
          setAddOpen(true)
        }}
        onDuplicate={(form) => {
          setEditingIdea(null)
          setAddPrefill(form)
          setAddOpen(true)
        }}
      />

      <AddIdeaDialog
        open={addOpen}
        prefill={addPrefill}
        onClose={() => { setAddOpen(false); setAddPrefill({}) }}
        onSaved={() => refreshKeepScroll(router)}
      />
    </>
  )
}

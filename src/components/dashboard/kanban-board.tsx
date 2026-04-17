'use client'

import { useState, useTransition } from 'react'
import { updateProductionStatus } from '@/app/actions'
import { useRouter } from 'next/navigation'
import type { ContentIdea, ProductionStatus } from '@/lib/types'
import { GripVertical, ChevronDown } from 'lucide-react'

interface Props {
  ideas: ContentIdea[]
}

const COLUMNS: { status: ProductionStatus; label: string; color: string; border: string }[] = [
  { status: 'recording', label: 'Recording', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', border: 'border-t-amber-500' },
  { status: 'editing', label: 'Editing', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', border: 'border-t-blue-500' },
  { status: 'ready', label: 'Ready to Post', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', border: 'border-t-purple-500' },
  { status: 'posted', label: 'Posted', color: 'bg-green-500/10 text-green-600 dark:text-green-400', border: 'border-t-green-500' },
]

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600 dark:text-green-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

const LIMITS = [5, 10, 20, 0] as const
const LIMIT_LABELS: Record<number, string> = { 5: '5', 10: '10', 20: '20', 0: 'All' }

export function KanbanBoard({ ideas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [maxItems, setMaxItems] = useState<number>(5)
  const [expandedCols, setExpandedCols] = useState<Set<ProductionStatus>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)

  function handleDragStart(e: React.DragEvent, ideaId: string) {
    e.dataTransfer.setData('text/plain', ideaId)
    setDraggingId(ideaId)
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
      router.refresh()
    })
  }

  function handleStatusChange(ideaId: string, newStatus: ProductionStatus) {
    startTransition(async () => {
      await updateProductionStatus(ideaId, newStatus)
      router.refresh()
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">Production Board</p>
        <div className="flex gap-1">
          {LIMITS.map(l => (
            <button
              key={l}
              onClick={() => { setMaxItems(l); setExpandedCols(new Set()) }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                maxItems === l
                  ? 'bg-purple-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {LIMIT_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {COLUMNS.map(col => {
          const colIdeas = ideas.filter(i => i.production_status === col.status)
          const isExpanded = expandedCols.has(col.status)
          const visible = (maxItems > 0 && !isExpanded) ? colIdeas.slice(0, maxItems) : colIdeas
          const hidden = (maxItems > 0 && !isExpanded) ? Math.max(0, colIdeas.length - maxItems) : 0

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
                <span className="text-[11px] text-muted-foreground">{colIdeas.length}</span>
              </div>

              <div className="space-y-2">
                {visible.map(idea => (
                  <div
                    key={idea.id}
                    draggable
                    onDragStart={e => handleDragStart(e, idea.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`group bg-card border border-border rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-colors hover:border-border ${
                      draggingId === idea.id ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical size={14} className="mt-0.5 text-muted-foreground/40 shrink-0 hidden md:block" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground line-clamp-2">{idea.idea}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {idea.difficulty && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[idea.difficulty]}`}>
                              {idea.difficulty}
                            </span>
                          )}
                          {idea.video_type && (
                            <span className="text-[10px] text-muted-foreground">{idea.video_type}</span>
                          )}
                        </div>
                      </div>
                      {/* Mobile: dropdown to change status */}
                      <div className="md:hidden relative">
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
                {hidden > 0 && (
                  <button
                    onClick={() => setExpandedCols(prev => {
                      const next = new Set(prev)
                      next.add(col.status)
                      return next
                    })}
                    className="text-[10px] text-muted-foreground hover:text-purple-400 text-center w-full transition-colors cursor-pointer"
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { updateProductionStatus } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { refreshKeepScroll } from '@/lib/router-utils'
import type { ContentIdea, ProductionStatus } from '@/lib/types'
import { GripVertical, ChevronDown, Plus, SlidersHorizontal } from 'lucide-react'
import { EditIdeaDialog, AddIdeaDialog } from '@/components/ideas/edit-idea-dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'

interface Props {
  ideas: ContentIdea[]
  batchSize: number
}

/** Columns the user can hide/show. */
const TOGGLEABLE: ProductionStatus[] = ['new', 'posted']
const HIDDEN_COLS_KEY = 'production-board-hidden-cols'

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
}

const STATUS_RANK_STYLE: Record<ProductionStatus, string> = {
  new: 'text-slate-600 dark:text-slate-300 bg-slate-500/15 border-slate-500/30',
  recording: 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30',
  editing: 'text-blue-600 dark:text-blue-400 bg-blue-500/15 border-blue-500/30',
  ready: 'text-purple-600 dark:text-purple-400 bg-purple-500/15 border-purple-500/30',
  posted: 'text-green-600 dark:text-green-400 bg-green-500/15 border-green-500/30',
}

const COLUMNS: { status: ProductionStatus; label: string; color: string; border: string }[] = [
  { status: 'new', label: 'New', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-300', border: 'border-t-slate-400' },
  { status: 'recording', label: 'Recording', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', border: 'border-t-amber-500' },
  { status: 'editing', label: 'Editing', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', border: 'border-t-blue-500' },
  { status: 'ready', label: 'Ready to Post', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', border: 'border-t-purple-500' },
  { status: 'posted', label: 'Posted', color: 'bg-green-500/10 text-green-600 dark:text-green-400', border: 'border-t-green-500' },
]

/* ─── Main Component ─── */
export function KanbanBoard({ ideas, batchSize }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedCols, setExpandedCols] = useState<Set<ProductionStatus>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addPrefill, setAddPrefill] = useState<{ inspirationUrl?: string; source?: string; idea?: string; hookIdea?: string; scriptSnippet?: string; cta?: string; caption?: string; tags?: string[] }>({})
  const [addStatus, setAddStatus] = useState<ProductionStatus | undefined>(undefined)
  const [hiddenCols, setHiddenCols] = useState<Set<ProductionStatus>>(new Set())
  const didDrag = useRef(false)

  // Load saved column visibility (client-only, avoids hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIDDEN_COLS_KEY)
      if (saved) setHiddenCols(new Set(JSON.parse(saved) as ProductionStatus[]))
    } catch { /* ignore */ }
  }, [])

  function toggleColumn(status: ProductionStatus) {
    setHiddenCols(prev => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      try { localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  const visibleColumns = COLUMNS.filter(col => !hiddenCols.has(col.status))

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
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-foreground">Production Board</p>
          <div className="flex items-center gap-3">
            <p className="hidden sm:block text-[10px] text-muted-foreground">Drag ideas between columns to update status</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all shrink-0"
                >
                  <SlidersHorizontal size={12} />
                  Columns
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {TOGGLEABLE.map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={!hiddenCols.has(status)}
                    onCheckedChange={() => toggleColumn(status)}
                    onSelect={e => e.preventDefault()}
                  >
                    {COLUMNS.find(c => c.status === status)?.label ?? status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className={`grid ${GRID_COLS[visibleColumns.length] ?? GRID_COLS[5]} gap-3`}>
          {visibleColumns.map(col => {
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
                  <div className="flex items-center gap-1.5">
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
                    <button
                      type="button"
                      onClick={() => {
                        setAddPrefill({})
                        setAddStatus(col.status)
                        setAddOpen(true)
                      }}
                      title={`Add a video to ${col.label}`}
                      className={`flex items-center justify-center w-5 h-5 rounded-full border border-current/20 transition-all hover:bg-current/10 ${col.color}`}
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
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
                      <div className="flex items-center gap-1.5">
                        <GripVertical size={14} className="text-muted-foreground/40 cursor-grab shrink-0 hidden md:block" />
                        <span className={`shrink-0 hidden md:inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums leading-none border ${
                          i + 1 > batchSize
                            ? 'text-red-500 bg-red-500/15 border-red-500/30'
                            : STATUS_RANK_STYLE[idea.production_status]
                        }`}>{i + 1}</span>
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

      <EditIdeaDialog
        key={editingIdea?.id}
        idea={editingIdea}
        onClose={() => setEditingIdea(null)}
        onStatusChange={handleStatusChange}
        onSaved={() => refreshKeepScroll(router)}
        onDeleted={() => refreshKeepScroll(router)}
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
        productionStatus={addStatus}
        onClose={() => { setAddOpen(false); setAddPrefill({}); setAddStatus(undefined) }}
        onSaved={() => refreshKeepScroll(router)}
      />
    </>
  )
}

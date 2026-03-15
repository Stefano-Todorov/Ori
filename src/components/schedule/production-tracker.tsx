'use client'

import { useTransition } from 'react'
import { updateProductionStatus } from '@/app/actions'
import { useRouter } from 'next/navigation'
import type { ContentIdea, ProductionStatus } from '@/lib/types'

interface Props {
  ideas: ContentIdea[]
}

const STAGES: { status: ProductionStatus; label: string; color: string; bg: string }[] = [
  { status: 'recording', label: 'Recording', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  { status: 'editing', label: 'Editing', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { status: 'posted', label: 'Posted', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
]

export function ProductionTracker({ ideas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function advance(ideaId: string, currentStatus: ProductionStatus) {
    const order: ProductionStatus[] = ['recording', 'editing', 'posted']
    const idx = order.indexOf(currentStatus)
    if (idx >= order.length - 1) return
    const next = order[idx + 1]
    startTransition(async () => {
      await updateProductionStatus(ideaId, next)
      router.refresh()
    })
  }

  const grouped = STAGES.map(stage => ({
    ...stage,
    items: ideas.filter(idea => {
      const displayStatus = idea.production_status === 'new' ? 'recording' : idea.production_status
      return displayStatus === stage.status
    }),
  }))

  return (
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
      <p className="text-sm font-bold text-foreground">Production Pipeline</p>

      {ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No ideas in the pipeline yet. Create ideas and update their production status to track progress.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {grouped.map((stage) => (
            <div key={stage.status} className="space-y-2">
              {/* Column header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${stage.bg}`}>
                <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                <span className="text-[10px] font-medium text-muted-foreground ml-auto">{stage.items.length}</span>
              </div>

              {/* Column items */}
              <div className="space-y-1.5 min-h-[60px]">
                {stage.items.map(idea => {
                  const isPosted = idea.production_status === 'posted'
                  return (
                    <div
                      key={idea.id}
                      className="px-3 py-2.5 rounded-lg bg-muted/30 dark:bg-white/[0.03] border border-border/50 dark:border-white/5 hover:bg-muted/50 dark:hover:bg-white/[0.05] transition-colors group"
                    >
                      <span className="text-xs font-medium text-foreground line-clamp-2 block">{idea.idea}</span>
                      {!isPosted && (
                        <button
                          onClick={() => advance(idea.id, idea.production_status)}
                          disabled={isPending}
                          className="text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors mt-1.5 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        >
                          Move to {STAGES[STAGES.findIndex(s => s.status === stage.status) + 1]?.label} →
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

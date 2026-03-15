'use client'

import { useTransition } from 'react'
import { updateProductionStatus } from '@/app/actions'
import { useRouter } from 'next/navigation'
import type { ContentIdea, ProductionStatus } from '@/lib/types'
import { ArrowRight } from 'lucide-react'

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

  return (
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
      <p className="text-sm font-bold text-foreground">Production Pipeline</p>

      {/* Stage headers */}
      <div className="hidden md:grid grid-cols-3 gap-2">
        {STAGES.map((s, i) => (
          <div key={s.status} className="flex items-center gap-1">
            <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
            {i < STAGES.length - 1 && <ArrowRight size={12} className="text-muted-foreground/40 ml-auto" />}
          </div>
        ))}
      </div>

      {ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No ideas in the pipeline yet. Create ideas and update their production status to track progress.
        </p>
      ) : (
        <div className="space-y-1.5">
          {ideas.map(idea => {
            const displayStatus = idea.production_status === 'new' ? 'recording' : idea.production_status
            const stage = STAGES.find(s => s.status === displayStatus) ?? STAGES[0]
            const isPosted = idea.production_status === 'posted'

            return (
              <div key={idea.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors group">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${stage.bg} ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-medium text-foreground truncate flex-1">{idea.idea}</span>
                {!isPosted && (
                  <button
                    onClick={() => advance(idea.id, idea.production_status)}
                    disabled={isPending}
                    className="text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 disabled:opacity-50"
                  >
                    Advance →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

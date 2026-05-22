import Link from 'next/link'
import { Lightbulb, CalendarPlus, ArrowRight } from 'lucide-react'

type Stage = 'start' | 'plan'

interface Props {
  stage: Stage
  ideaCount: number
}

export function NextActionHero({ stage, ideaCount }: Props) {
  if (stage === 'start') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-600/[0.12] via-purple-500/[0.05] to-transparent p-6 sm:p-8">
        <div className="relative max-w-xl">
          <div className="w-12 h-12 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center mb-4">
            <Lightbulb size={22} className="text-purple-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Let&apos;s capture your first idea
          </h2>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Every video starts as an idea. Add one — type your own, or let AI suggest
            topics and write the full script for your niche.
          </p>
          <Link
            href="/dashboard/ideas"
            className="inline-flex items-center gap-2 mt-5 h-11 px-5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors"
          >
            Add your first idea
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-600/[0.12] via-purple-500/[0.05] to-transparent p-6 sm:p-8">
      <div className="relative max-w-xl">
        <div className="w-12 h-12 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center mb-4">
          <CalendarPlus size={22} className="text-purple-500" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          You&apos;ve got {ideaCount} idea{ideaCount === 1 ? '' : 's'} — put one on the calendar
        </h2>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          Nothing&apos;s scheduled yet. Pick an idea and give it a date — a scheduled
          video is one that actually gets made.
        </p>
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          <Link
            href="/dashboard/schedule"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors"
          >
            Open Schedule
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard/ideas"
            className="inline-flex items-center h-11 px-5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Review ideas
          </Link>
        </div>
      </div>
    </div>
  )
}

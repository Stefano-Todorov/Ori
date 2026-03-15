'use client'

import { useState, useTransition } from 'react'
import { DatePicker } from '@/components/ui/date-picker'
import { schedulePost } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { CalendarPlus } from 'lucide-react'
import type { ContentIdea, Platform } from '@/lib/types'

interface Props {
  ideas: ContentIdea[]
}

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
]

export function PlanPostForm({ ideas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState('')
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [ideaId, setIdeaId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!ideaId) return setError('Select an idea')
    if (!date) return setError('Pick a date')

    const idea = ideas.find(i => i.id === ideaId)

    startTransition(async () => {
      const result = await schedulePost({
        title: idea?.idea ?? undefined,
        scheduled_date: date,
        platform: platform || undefined,
        content_idea_id: ideaId,
      })
      if (result?.error) {
        setError(result.error)
        return
      }
      setDate('')
      setPlatform('')
      setIdeaId('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      router.refresh()
    })
  }

  if (ideas.length === 0) {
    return (
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2">
        <CalendarPlus size={24} className="text-muted-foreground" />
        <p className="text-sm font-bold text-foreground">Schedule a Post</p>
        <p className="text-xs text-muted-foreground">
          Create ideas first, then schedule them here.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
      <p className="text-sm font-bold text-foreground">Schedule a Post</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Idea selector */}
        <select
          value={ideaId}
          onChange={e => setIdeaId(e.target.value)}
          className={`w-full h-9 px-3 text-sm ${inputClass} bg-muted dark:bg-[#1e1e2e]`}
        >
          <option value="">Select an idea...</option>
          {ideas.map(idea => (
            <option key={idea.id} value={idea.id}>
              {idea.idea.slice(0, 60)}{idea.idea.length > 60 ? '...' : ''}
            </option>
          ))}
        </select>

        <DatePicker value={date} onChange={setDate} placeholder="Pick a date" />

        <div className="flex gap-1.5">
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPlatform(prev => prev === p.key ? '' : p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                platform === p.key
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground hover:border-purple-500 hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400 font-medium">Scheduled!</p>}

        <button
          type="submit"
          disabled={isPending || !ideaId}
          className="w-full h-9 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-bold transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Scheduling...' : 'Schedule'}
        </button>
      </form>
    </div>
  )
}

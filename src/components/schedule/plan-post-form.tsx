'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { DatePicker } from '@/components/ui/date-picker'
import { schedulePost } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { CalendarPlus, ChevronDown, Search } from 'lucide-react'
import type { ContentIdea, Platform } from '@/lib/types'

interface Props {
  ideas: ContentIdea[]
}

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
]

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600 dark:text-green-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export function PlanPostForm({ ideas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState('')
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [ideaId, setIdeaId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedIdea = ideas.find(i => i.id === ideaId)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      setTimeout(() => searchRef.current?.focus(), 0)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const filteredIdeas = search
    ? ideas.filter(i =>
        i.idea.toLowerCase().includes(search.toLowerCase()) ||
        i.video_type?.toLowerCase().includes(search.toLowerCase()) ||
        i.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : ideas

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
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2">
        <CalendarPlus size={24} className="text-muted-foreground" />
        <p className="text-sm font-bold text-foreground">Schedule a Post</p>
        <p className="text-xs text-muted-foreground">
          Create ideas first, then schedule them here.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <p className="text-sm font-bold text-foreground">Schedule a Post</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Custom idea selector */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between w-full h-9 px-3 text-sm rounded-lg bg-muted dark:bg-[#1e1e2e] border border-border focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all text-left"
          >
            <span className={selectedIdea ? 'text-foreground truncate pr-2' : 'text-muted-foreground'}>
              {selectedIdea ? selectedIdea.idea.slice(0, 50) + (selectedIdea.idea.length > 50 ? '...' : '') : 'Select an idea...'}
            </span>
            <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/10 rounded-xl shadow-xl shadow-black/20 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Search size={13} className="text-muted-foreground shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search ideas..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>

              {/* Ideas list */}
              <div className="max-h-[240px] overflow-y-auto">
                {filteredIdeas.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No ideas found</p>
                ) : (
                  filteredIdeas.map(idea => (
                    <button
                      key={idea.id}
                      type="button"
                      onClick={() => {
                        setIdeaId(idea.id)
                        setDropdownOpen(false)
                        setSearch('')
                      }}
                      className={`w-full text-left px-3 py-2.5 transition-colors border-b border-border/30 dark:border-white/[0.04] last:border-0 ${
                        idea.id === ideaId
                          ? 'bg-purple-500/10'
                          : 'hover:bg-muted/40 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{idea.idea}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {idea.difficulty && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[idea.difficulty] ?? 'bg-muted text-muted-foreground'}`}>
                            {idea.difficulty}
                          </span>
                        )}
                        {idea.video_type && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            {idea.video_type}
                          </span>
                        )}
                        {idea.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] text-muted-foreground bg-muted/50 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                        {(idea.tags?.length ?? 0) > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{idea.tags.length - 2}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DatePicker value={date} onChange={setDate} placeholder="Pick a date" />

        <div className="flex gap-1.5">
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPlatform(prev => prev === p.key ? '' : p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                platform === p.key
                  ? 'bg-purple-600 text-white'
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
          className="w-full h-9 rounded-xl bg-purple-600 text-white text-sm font-bold transition-all duration-200 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Scheduling...' : 'Schedule'}
        </button>
      </form>
    </div>
  )
}

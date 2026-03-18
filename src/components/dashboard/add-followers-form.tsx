'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { addFollowerSnapshot, deleteFollowerSnapshot } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { ChevronDown, Trash2 } from 'lucide-react'
import type { Platform, FollowerSnapshot } from '@/lib/types'

const ALL_PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
]

interface Props {
  activePlatforms?: Platform[]
  snapshots?: FollowerSnapshot[]
}

export function AddFollowersForm({ activePlatforms, snapshots = [] }: Props) {
  const PLATFORMS = activePlatforms?.length
    ? ALL_PLATFORMS.filter(p => activePlatforms.includes(p.key))
    : ALL_PLATFORMS
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [platform, setPlatform] = useState<Platform>(PLATFORMS[0]?.key ?? 'tiktok')
  const [count, setCount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyPlatform, setHistoryPlatform] = useState<Platform | 'all'>('all')

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const num = parseInt(count)
    if (isNaN(num) || num < 0) return setError('Enter a valid number')

    startTransition(async () => {
      const result = await addFollowerSnapshot(platform, num, date)
      if (result?.error) {
        setError(result.error)
        return
      }
      setCount('')
      router.refresh()
    })
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <p className="text-sm font-bold text-foreground">Add Followers</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-1.5">
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPlatform(p.key)}
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
        <Input
          type="number"
          min="0"
          placeholder="Follower count"
          value={count}
          onChange={e => setCount(e.target.value)}
          className={inputClass}
        />
        <DatePicker value={date} onChange={setDate} placeholder="Date" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-9 rounded-xl bg-purple-600 text-white text-sm font-bold transition-all duration-200 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </form>

      {/* History */}
      {snapshots.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHistory ? '' : '-rotate-90'}`} />
            History ({snapshots.length})
          </button>

          {showHistory && (
            <div className="space-y-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setHistoryPlatform('all')}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    historyPlatform === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-muted/50 dark:bg-white/[0.04] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                {PLATFORMS.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setHistoryPlatform(p.key)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                      historyPlatform === p.key
                        ? 'bg-purple-600 text-white'
                        : 'bg-muted/50 dark:bg-white/[0.04] text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {snapshots
                  .filter(s => historyPlatform === 'all' || s.platform === historyPlatform)
                  .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
                  .map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30 dark:bg-white/[0.03] text-xs"
                    >
                      <span className="text-muted-foreground capitalize w-16 shrink-0">{s.platform}</span>
                      <span className="font-medium text-foreground">{s.count.toLocaleString()}</span>
                      <span className="text-muted-foreground ml-auto">
                        {new Date(s.recorded_at + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            await deleteFollowerSnapshot(s.id)
                            router.refresh()
                          })
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

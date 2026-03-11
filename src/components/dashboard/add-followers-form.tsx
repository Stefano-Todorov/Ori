'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { addFollowerSnapshot } from '@/app/actions'
import { useRouter } from 'next/navigation'
import type { Platform } from '@/lib/types'

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
]

export function AddFollowersForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [platform, setPlatform] = useState<Platform>('tiktok')
  const [count, setCount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

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
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
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
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20'
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
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-9 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-bold transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}

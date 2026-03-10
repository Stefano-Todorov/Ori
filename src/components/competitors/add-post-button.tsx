'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, Loader2, Check } from 'lucide-react'
import { addCompetitorPost } from '@/app/actions'
import { useRouter } from 'next/navigation'
import type { Platform } from '@/lib/types'

interface Props {
  handle: string
  platform: Platform
}

export function AddPostButton({ handle, platform }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [extracted, setExtracted] = useState<Record<string, unknown> | null>(null)

  function handleClose() {
    setOpen(false)
    setUrl('')
    setMsg(null)
    setExtracted(null)
  }

  async function handleFetchAndSave() {
    if (!url.trim()) return
    setFetching(true)
    setMsg(null)

    try {
      // Fetch data from URL
      const res = await fetch(`/api/competitors/extract?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      setExtracted(data)

      // Save immediately
      startTransition(async () => {
        const result = await addCompetitorPost({
          competitor_handle: handle,
          platform,
          url: url.trim(),
          caption: typeof data.caption === 'string' ? data.caption : undefined,
          hook_text: typeof data.hook_text === 'string' ? data.hook_text : undefined,
          views: data.views != null ? Number(data.views) : undefined,
          likes: data.likes != null ? Number(data.likes) : undefined,
          comments: data.comments != null ? Number(data.comments) : undefined,
        })

        if (result?.error) {
          setMsg({ ok: false, text: result.error })
          setFetching(false)
          return
        }

        setMsg({ ok: true, text: 'Post saved!' })
        setFetching(false)
        setTimeout(() => {
          handleClose()
          router.refresh()
        }, 800)
      })
    } catch {
      setMsg({ ok: false, text: 'Could not fetch URL' })
      setFetching(false)
    }
  }

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-foreground hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-150"
      >
        <Plus size={12} />
        Add post
      </button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="max-w-md bg-background dark:bg-[#16161e] border-border dark:border-white/10 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add post from @{handle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste the post URL and we&apos;ll fetch the stats automatically.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder={`https://www.${platform}.com/...`}
                value={url}
                onChange={(e) => { setUrl(e.target.value); setMsg(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFetchAndSave() }}
                className={inputClass}
                autoFocus
              />
              <button
                onClick={handleFetchAndSave}
                disabled={!url.trim() || fetching || isPending}
                className="shrink-0 h-9 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {fetching || isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {fetching ? 'Fetching...' : isPending ? 'Saving...' : 'Add'}
              </button>
            </div>
            {msg && (
              <p className={`text-xs flex items-center gap-1 ${msg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {msg.ok && <Check size={12} />}
                {msg.text}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

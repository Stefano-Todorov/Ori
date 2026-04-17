'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, Loader2, Check, Tag, ChevronDown } from 'lucide-react'
import { addCompetitorPost } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { refreshKeepScroll } from '@/lib/router-utils'
import type { Platform } from '@/lib/types'
import { TagPill } from '@/components/ui/tag-editor'

interface Props {
  handle: string
  platform: Platform
  allTags?: string[]
}

export function AddPostButton({ handle, platform, allTags = [] }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [extracted, setExtracted] = useState<Record<string, unknown> | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  function handleClose() {
    setOpen(false)
    setUrl('')
    setMsg(null)
    setExtracted(null)
    setSelectedTags([])
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
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          thumbnail_url: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined,
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
          refreshKeepScroll(router)
        }, 800)
      })
    } catch {
      setMsg({ ok: false, text: 'Could not fetch URL' })
      setFetching(false)
    }
  }

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

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
              <div className="flex items-center shrink-0">
                <button
                  onClick={handleFetchAndSave}
                  disabled={!url.trim() || fetching || isPending}
                  className="h-9 px-4 rounded-l-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {fetching || isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {fetching ? 'Fetching...' : isPending ? 'Saving...' : 'Add'}
                </button>
                <TagDropdown
                  tags={selectedTags}
                  allTags={allTags}
                  onChange={setSelectedTags}
                />
              </div>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedTags.map(t => (
                  <TagPill key={t} name={t} onRemove={() => setSelectedTags(prev => prev.filter(x => x !== t))} />
                ))}
              </div>
            )}
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

// ─── Tag Dropdown Button ──────────────────────────────

function TagDropdown({ tags, allTags, onChange }: {
  tags: string[]
  allTags: string[]
  onChange: (tags: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [newTag, setNewTag] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  function toggle(tag: string) {
    if (tags.includes(tag)) {
      onChange(tags.filter(t => t !== tag))
    } else {
      onChange([...tags, tag])
    }
  }

  function addNew() {
    const trimmed = newTag.trim().toLowerCase()
    if (!trimmed) return
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setNewTag('')
  }

  const suggestions = allTags.filter(t => !tags.includes(t))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 h-9 rounded-r-xl bg-purple-700 hover:bg-purple-800 text-white border-l border-purple-400/30 transition-colors"
      >
        <Tag size={13} />
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute z-50 top-full right-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-lg p-2 space-y-2">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map(t => (
                <TagPill key={t} name={t} onRemove={() => toggle(t)} />
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">Add tag</p>
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {suggestions.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-xs text-foreground hover:bg-muted transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="New tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNew() } }}
              className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={addNew}
              disabled={!newTag.trim()}
              className="px-1.5 py-1 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 disabled:opacity-30 transition-colors text-xs"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, ChevronDown, Tag, Loader2 } from 'lucide-react'
import { addSwipePost } from '@/app/actions'
import { TagPill } from '@/components/ui/tag-editor'

const PLATFORMS = ['tiktok', 'instagram']

function detectPlatformFromUrl(url: string): string | null {
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  return null
}

interface Props {
  allTags?: string[]
}

export function AddSwipeButton({ allTags = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState('tiktok')
  const [notes, setNotes] = useState('')
  const [handle, setHandle] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Auto-detect platform when URL changes
  useEffect(() => {
    const detected = detectPlatformFromUrl(url)
    if (detected) setPlatform(detected)
  }, [url])

  async function handleSave() {
    if (!url.trim()) return
    setLoading(true)

    try {
      // Fetch thumbnail and metrics from the URL
      const res = await fetch(`/api/competitors/extract?url=${encodeURIComponent(url.trim())}`)
      const data = res.ok ? await res.json() : {}

      await addSwipePost({
        url: url.trim(),
        platform: data.platform || platform,
        caption: notes.trim() || (typeof data.caption === 'string' ? data.caption : undefined),
        competitor_handle: handle.trim() || (typeof data.handle === 'string' ? data.handle : undefined),
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        thumbnail_url: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined,
        views: data.views != null ? Number(data.views) : undefined,
        likes: data.likes != null ? Number(data.likes) : undefined,
        comments: data.comments != null ? Number(data.comments) : undefined,
        shares: data.shares != null ? Number(data.shares) : undefined,
      })
    } catch {
      // Still save even if extraction fails
      await addSwipePost({
        url: url.trim(),
        platform,
        caption: notes.trim() || undefined,
        competitor_handle: handle.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      })
    }

    setUrl('')
    setNotes('')
    setHandle('')
    setPlatform('tiktok')
    setSelectedTags([])
    setLoading(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all duration-200"
      >
        <Plus size={16} />
        Add video
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background dark:bg-[#16161e] border border-border dark:border-white/10 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.1)] w-full max-w-md space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Add to Inspo</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
            Video URL <span className="text-purple-500">*</span>
          </label>
          <Input
            placeholder="https://www.tiktok.com/@..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            className="bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Platform</label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all duration-150 ${
                  platform === p
                    ? 'bg-purple-600 text-white border border-transparent'
                    : 'bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground hover:border-purple-500 hover:text-foreground'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Why does this work?</label>
          <Textarea
            placeholder="What makes this video effective? Hook style, editing, topic angle..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
            Creator handle
            <span className="text-[10px] font-medium normal-case tracking-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground/60">optional</span>
          </label>
          <Input
            placeholder="@username"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 justify-end pt-1">
          <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-border dark:border-white/10 text-sm font-medium text-foreground hover:bg-muted dark:hover:bg-white/5 transition-all">
            Cancel
          </button>
          <div className="flex items-center">
            <button
              onClick={handleSave}
              disabled={!url.trim() || loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-l-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 size={13} className="animate-spin" /> Fetching...</> : 'Save'}
            </button>
            <TagDropdown
              tags={selectedTags}
              allTags={allTags}
              onChange={setSelectedTags}
            />
          </div>
        </div>

        {/* Show selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedTags.map(t => (
              <TagPill key={t} name={t} onRemove={() => setSelectedTags(prev => prev.filter(x => x !== t))} />
            ))}
          </div>
        )}
      </div>
    </div>
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
        className="flex items-center gap-1 py-2 px-2 rounded-r-xl bg-purple-700 hover:bg-purple-800 text-white border-l border-purple-400/30 transition-colors"
      >
        <Tag size={13} />
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute z-50 bottom-full right-0 mb-1 w-52 bg-card border border-border rounded-lg shadow-lg p-2 space-y-2">
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

'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Trash2, ExternalLink, Eye, Heart, MessageCircle, BarChart3,
  ChevronDown, Calendar, Pencil, Loader2,
  SortAsc, Plus, Bookmark, Send, CheckSquare, Square, X, Tag,
  Download,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { deleteSwipePost, updatePostNotes, updatePostTitle, updatePostTags, syncInspoTags, deleteInspoTag } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Post } from '@/lib/types'
import { TagEditor, TagFilter } from '@/components/ui/tag-editor'
import { CreateIdeaPanel } from '@/components/shared/create-idea-panel'
import { downloadVideo } from '@/lib/instagram-download'

// ─── Thumbnail ────────────────────────────────────────

function Thumbnail({ post }: { post: Post }) {
  const [src, setSrc] = useState(post.thumbnail_url)
  const [failed, setFailed] = useState(false)
  const [triedApi, setTriedApi] = useState(false)

  useEffect(() => {
    if (src || triedApi) return
    if (!post.url) { setFailed(true); return }
    // Try fetching thumbnail via our API (oEmbed / og:image)
    setTriedApi(true)
    fetch(`/api/thumbnail?url=${encodeURIComponent(post.url)}`)
      .then(r => r.json())
      .then(d => {
        if (d.thumbnail) setSrc(d.thumbnail)
        else setFailed(true)
      })
      .catch(() => setFailed(true))
  }, [src, triedApi, post.url])

  if (failed && !src) {
    // Platform-colored placeholder
    const colors: Record<string, string> = {
      tiktok: 'bg-black/80 dark:bg-white/10 text-white',
      instagram: 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-pink-500',
    }
    return (
      <div className={`w-24 h-32 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold uppercase ${colors[post.platform] ?? 'bg-muted text-muted-foreground'}`}>
        {post.platform?.[0] ?? '?'}
      </div>
    )
  }

  if (!src) {
    return <div className="w-24 h-32 rounded-lg shrink-0 bg-muted animate-pulse" />
  }

  return (
    <img
      src={src}
      alt=""
      className="w-24 h-32 rounded-lg object-cover shrink-0 bg-muted"
      onError={() => { setSrc(null); setFailed(!triedApi) }}
    />
  )
}

// ─── Helpers ───────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function engagementRate(post: Post): number | null {
  if (!post.views || post.views === 0) return null
  return ((post.likes + post.comments + post.shares) / post.views) * 100
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function cleanCaption(raw: string | null): string {
  if (!raw) return ''
  let text = raw.trim()
  const metaMatch = text.match(/^\d[\d,.KMB]+\s*likes?[\s\S]*?:\s*[""\u201c]([\s\S]+)[""\u201d]\s*\.?\s*$/)
  if (metaMatch) return metaMatch[1].trim()
  const metaMatch2 = text.match(/^\d[\d,.KMB]+\s*likes?[\s\S]*?:\s*[""\u201c]([\s\S]+)/)
  if (metaMatch2) return metaMatch2[1].replace(/[""\u201d]\s*\.?\s*$/, '').trim()
  return text
}

function postTitle(post: Post): string {
  const cap = cleanCaption(post.caption)
  if (!cap) return 'Untitled post'
  const stripped = cap
    .replace(/#[\w]+/g, '')
    .replace(/@[\w.]+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '')
    .trim()
  const firstSentence = stripped.split(/[!.\n]/)[0].trim()
  if (!firstSentence) return cap.slice(0, 50)
  if (firstSentence.length <= 50) return firstSentence
  const cutZone = firstSentence.slice(0, 55)
  const breakPoints = [', ', ' I ', ' to ', ' and ', ' but ', ' so ', ' - ', ' — ']
  let bestCut = -1
  for (const bp of breakPoints) {
    const idx = cutZone.lastIndexOf(bp)
    if (idx > 20 && idx > bestCut) bestCut = idx
  }
  if (bestCut > 0) return firstSentence.slice(0, bestCut).trim()
  const truncated = firstSentence.slice(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated).trim() + '...'
}

type SortMode = 'date' | 'views' | 'likes'

const INSPO_TAGS_KEY = 'orianna-inspo-tags'

function loadPersistedTags(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(INSPO_TAGS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function persistTags(tags: string[]) {
  localStorage.setItem(INSPO_TAGS_KEY, JSON.stringify(tags))
  syncInspoTags(tags)
}

// ─── Main List ─────────────────────────────────────────

interface Props {
  posts: Post[]
  archivedPosts?: Post[]
  allTags: string[]
}

export function InspoList({ posts: initialPosts, archivedPosts: initialArchived = [], allTags: initialAllTags }: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const [archivedPosts] = useState(initialArchived)
  const [showArchived, setShowArchived] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [knownTags, setKnownTags] = useState<string[]>(() => {
    const persisted = loadPersistedTags()
    return [...new Set([...initialAllTags, ...persisted])].sort()
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0)
  const [bulkTagOpen, setBulkTagOpen] = useState(false)
  const [bulkNewTag, setBulkNewTag] = useState('')
  const bulkTagRef = useRef<HTMLDivElement>(null)
  const bulkTagInputRef = useRef<HTMLInputElement>(null)

  const selectMode = selected.size > 0
  const activePosts = showArchived ? archivedPosts : posts

  // When server tags change (revalidation), merge with persisted + current known tags
  useEffect(() => {
    const persisted = loadPersistedTags()
    setKnownTags(prev => {
      const merged = [...new Set([...prev, ...initialAllTags, ...persisted])].sort()
      persistTags(merged)
      return merged
    })
  }, [initialAllTags])

  // Close bulk tag dropdown on outside click
  useEffect(() => {
    if (!bulkTagOpen) return
    function handle(e: MouseEvent) {
      if (bulkTagRef.current && !bulkTagRef.current.contains(e.target as Node)) setBulkTagOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [bulkTagOpen])

  useEffect(() => {
    if (bulkTagOpen && bulkTagInputRef.current) bulkTagInputRef.current.focus()
  }, [bulkTagOpen])

  // Derive allTags from knownTags + any tags on current posts (catches newly added tags)
  const allTags = [...new Set([...knownTags, ...posts.flatMap(p => p.tags ?? []), ...archivedPosts.flatMap(p => p.tags ?? [])])].sort()

  function updateTagsAndPersist(postId: string, tags: string[]) {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, tags } : p))
    const updated = [...new Set([...knownTags, ...tags])].sort()
    setKnownTags(updated)
    persistTags(updated)
    updatePostTags(postId, tags)
  }

  const sorted = [...activePosts]
    .filter((p) => platformFilter === 'all' || p.platform === platformFilter)
    .filter((p) => tagFilter === 'all' || (p.tags ?? []).includes(tagFilter))
    .sort((a, b) => {
      if (sortMode === 'views') return b.views - a.views
      if (sortMode === 'likes') return b.likes - a.likes
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  async function handleDelete(id: string) {
    await deleteSwipePost(id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  async function handleDeleteTag(tag: string) {
    // Remove from local state
    setKnownTags(prev => prev.filter(t => t !== tag))
    setPosts(prev => prev.map(p => ({ ...p, tags: (p.tags ?? []).filter(t => t !== tag) })))
    if (tagFilter === tag) setTagFilter('all')
    const updated = knownTags.filter(t => t !== tag)
    localStorage.setItem(INSPO_TAGS_KEY, JSON.stringify(updated))
    // Remove from DB (profile + posts)
    await deleteInspoTag(tag)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === sorted.length) setSelected(new Set())
    else setSelected(new Set(sorted.map(p => p.id)))
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} saved video${selected.size > 1 ? 's' : ''}?`)) return
    setBulkDeleting(true)
    await Promise.all([...selected].map(id => deleteSwipePost(id)))
    setPosts(prev => prev.filter(p => !selected.has(p.id)))
    setSelected(new Set())
    setBulkDeleting(false)
  }

  function handleBulkAddTag(tag: string) {
    const trimmed = tag.trim().toLowerCase()
    if (!trimmed) return
    const ids = [...selected]
    setPosts(prev => prev.map(p => {
      if (!ids.includes(p.id)) return p
      const existing = p.tags ?? []
      if (existing.includes(trimmed)) return p
      const newTags = [...existing, trimmed]
      updatePostTags(p.id, newTags)
      return { ...p, tags: newTags }
    }))
    const updated = [...new Set([...knownTags, trimmed])].sort()
    setKnownTags(updated)
    persistTags(updated)
    setBulkNewTag('')
    setBulkTagOpen(false)
  }

  async function handleBulkDownload() {
    const selectedPosts = sorted.filter(p => selected.has(p.id) && p.url)
    if (selectedPosts.length === 0) return
    setBulkDownloading(true)
    setBulkDownloadProgress(0)
    for (let i = 0; i < selectedPosts.length; i++) {
      try {
        const blob = await downloadVideo(selectedPosts[i].url!, selectedPosts[i].platform ?? '')
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `video_${selectedPosts[i].platform ?? 'clip'}_${Date.now()}.mp4`
        a.click()
        URL.revokeObjectURL(a.href)
      } catch { /* skip failed downloads */ }
      setBulkDownloadProgress(i + 1)
    }
    setBulkDownloading(false)
  }

  if (posts.length === 0 && archivedPosts.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No inspiration saved yet"
        description="Save videos that inspire you — paste a URL above or use the Chrome extension to capture trending content while you browse."
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Archived toggle */}
      {archivedPosts.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowArchived(!showArchived); setSelected(new Set()) }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              showArchived
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
            }`}
          >
            {showArchived ? `Showing ${archivedPosts.length} archived` : `Show ${archivedPosts.length} archived`}
          </button>
          {showArchived && (
            <span className="text-[10px] text-muted-foreground">These posts were auto-archived (oldest beyond 100)</span>
          )}
        </div>
      )}

      {/* Filters bar */}
      {activePosts.length > 1 && (
        <div className="rounded-xl border border-border dark:border-white/6 bg-muted/30 dark:bg-[#1a1a2e] p-3 space-y-2.5">
          <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <SortAsc size={12} className="text-muted-foreground/60" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Sort</span>
              <div className="flex items-center bg-background dark:bg-white/5 rounded-lg p-0.5 border border-border/50 dark:border-white/5">
                {(['date', 'views', 'likes'] as SortMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all capitalize ${
                      sortMode === mode
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            {(() => {
              const platforms = [...new Set(activePosts.map(p => p.platform).filter(Boolean))].sort()
              if (platforms.length <= 1) return null
              return (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Platform</span>
                  <div className="flex items-center bg-background dark:bg-white/5 rounded-lg p-0.5 border border-border/50 dark:border-white/5">
                    {['all', ...platforms].map(p => (
                      <button
                        key={p}
                        onClick={() => { setPlatformFilter(p); setSelected(new Set()) }}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all capitalize ${
                          platformFilter === p
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {p === 'all' ? 'All' : p}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Select */}
            <div className="ml-auto">
              <button
                onClick={selectAll}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all ${
                  selectMode
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background dark:hover:bg-white/5'
                }`}
              >
                {selected.size === sorted.length ? 'Deselect all' : selectMode ? `${selected.size} selected` : 'Select'}
              </button>
            </div>
          </div>

          {/* Tags */}
          <TagFilter allTags={allTags} activeTag={tagFilter} onChange={setTagFilter} onDelete={handleDeleteTag} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
      {sorted.map((post) => (
        <InspoCard
          key={post.id}
          post={post}
          allTags={allTags}
          onDelete={handleDelete}
          onTagsChange={updateTagsAndPersist}
          onNotesChange={(id, notes) => {
            setPosts(prev => prev.map(p => p.id === id ? { ...p, ai_notes: notes } : p))
          }}
          selectMode={selectMode}
          isSelected={selected.has(post.id)}
          onToggleSelect={() => toggleSelect(post.id)}
        />
      ))}
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/10 shadow-xl shadow-black/20">
          <span className="text-xs font-semibold text-foreground mr-1">{selected.size} selected</span>

          {/* Bulk tag */}
          <div className="relative" ref={bulkTagRef}>
            <button
              onClick={() => setBulkTagOpen(!bulkTagOpen)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all"
            >
              <Tag size={12} />
              Add tag
            </button>
            {bulkTagOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-card dark:bg-[#16161e] border border-border dark:border-white/10 rounded-lg shadow-lg p-2 space-y-2">
                {allTags.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {allTags.map(t => (
                      <button
                        key={t}
                        onClick={() => handleBulkAddTag(t)}
                        className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-xs text-foreground hover:bg-muted transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  <input
                    ref={bulkTagInputRef}
                    type="text"
                    placeholder="New tag..."
                    value={bulkNewTag}
                    onChange={(e) => setBulkNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBulkAddTag(bulkNewTag) } }}
                    className="flex-1 text-xs bg-muted dark:bg-[#1e1e2e] border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => handleBulkAddTag(bulkNewTag)}
                    disabled={!bulkNewTag.trim()}
                    className="px-1.5 py-1 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 disabled:opacity-30 transition-colors text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk download */}
          <button
            onClick={handleBulkDownload}
            disabled={bulkDownloading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all disabled:opacity-50"
          >
            {bulkDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {bulkDownloading ? `${bulkDownloadProgress}/${sorted.filter(p => selected.has(p.id) && p.url).length}` : 'Download'}
          </button>

          {/* Bulk delete */}
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500/15 text-red-500 text-xs font-medium hover:bg-red-500/25 transition-all disabled:opacity-50"
          >
            <Trash2 size={12} />
            {bulkDeleting ? 'Deleting...' : 'Delete'}
          </button>

          {/* Cancel */}
          <button
            onClick={() => setSelected(new Set())}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Inspo Card ────────────────────────────────────────

function InspoCard({ post, allTags, onDelete, onTagsChange, onNotesChange, selectMode, isSelected, onToggleSelect }: {
  post: Post; allTags: string[]; onDelete: (id: string) => void; onTagsChange: (id: string, tags: string[]) => void; onNotesChange: (id: string, notes: string) => void
  selectMode: boolean; isSelected: boolean; onToggleSelect: () => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(post.title ?? '')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus()
  }, [editingTitle])

  async function saveTitle() {
    const newTitle = titleValue.trim()
    if (newTitle !== (post.title ?? '')) {
      await updatePostTitle(post.id, newTitle)
    }
    setEditingTitle(false)
  }
  const er = engagementRate(post)

  // Create idea panel state
  const [createIdeaOpen, setCreateIdeaOpen] = useState(false)

  // Download state
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function handleDownload() {
    if (!post.url) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const blob = await downloadVideo(post.url, post.platform ?? '')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `video_${post.platform ?? 'clip'}_${Date.now()}.mp4`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    onDelete(post.id)
  }

  return (
    <>
      <div className={`rounded-xl border overflow-hidden transition-all ${
        isSelected
          ? 'border-purple-500/50 bg-purple-500/[0.03] dark:bg-purple-500/[0.06]'
          : 'border-border dark:border-white/6 bg-muted/30 dark:bg-[#1a1a2e] hover:border-purple-500/20'
      }`}>
        {/* Header — clickable to expand */}
        <button
          onClick={() => selectMode ? onToggleSelect() : setExpanded(!expanded)}
          className="w-full text-left p-4 flex items-start gap-3"
        >
          <span className="shrink-0 mt-1" onClick={(e) => { e.stopPropagation(); onToggleSelect() }}>
            {isSelected
              ? <CheckSquare size={16} className="text-purple-500" />
              : <Square size={16} className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" />
            }
          </span>
          <Thumbnail post={post} />
          <div className="flex-1 min-w-0 space-y-1">
            {/* Creator + Title + date row */}
            {post.competitor_handle && (
              <span className="text-[11px] font-medium text-muted-foreground">@{post.competitor_handle}</span>
            )}
            <div className="flex items-start gap-2">
              {editingTitle ? (
                <input
                  ref={titleRef}
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleValue(post.title ?? ''); setEditingTitle(false) } }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 bg-muted dark:bg-[#1e1e2e] border border-purple-500/40 rounded px-2 py-0.5 focus:outline-none focus:ring-[2px] focus:ring-purple-500/20"
                />
              ) : (
                <p
                  className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 line-clamp-2 break-words group/title cursor-text"
                  onClick={(e) => { e.stopPropagation(); setTitleValue(post.title || postTitle(post)); setEditingTitle(true) }}
                >
                  {post.title || postTitle(post)}
                  <Pencil size={9} className="inline ml-1.5 opacity-0 group-hover/title:opacity-40 transition-opacity" />
                </p>
              )}
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform duration-200 shrink-0 mt-0.5 ${expanded ? 'rotate-180' : ''}`}
              />
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              {post.platform && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize shrink-0 ${
                  post.platform === 'tiktok' ? 'bg-black/80 dark:bg-white/10 text-white border-transparent'
                    : post.platform === 'instagram' ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/30 text-pink-600 dark:text-pink-400'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {post.platform}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                <Calendar size={9} />
                {timeAgo(post.created_at)}
              </span>
            </div>

            {/* Stats pills */}
            <div className="flex items-center flex-wrap gap-2 text-[11px]">
              {post.views > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted dark:bg-white/5">
                  <Eye size={10} className="text-muted-foreground" />
                  <span className="font-semibold text-foreground">{formatNumber(post.views)}</span>
                </span>
              )}
              {post.likes > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted dark:bg-white/5">
                  <Heart size={10} className="text-muted-foreground" />
                  <span className="font-semibold text-foreground">{formatNumber(post.likes)}</span>
                </span>
              )}
              {post.comments > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted dark:bg-white/5">
                  <MessageCircle size={10} className="text-muted-foreground" />
                  <span className="font-semibold text-foreground">{formatNumber(post.comments)}</span>
                </span>
              )}
              {post.platform === 'tiktok' && post.saves > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted dark:bg-white/5">
                  <Bookmark size={10} className="text-muted-foreground" />
                  <span className="font-semibold text-foreground">{formatNumber(post.saves)}</span>
                </span>
              )}
              {post.platform === 'tiktok' && post.shares > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted dark:bg-white/5">
                  <Send size={10} className="text-muted-foreground" />
                  <span className="font-semibold text-foreground">{formatNumber(post.shares)}</span>
                </span>
              )}
              {er != null && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${er >= 5 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted dark:bg-white/5 text-foreground'}`}>
                  <span className="font-semibold">{er.toFixed(1)}%</span>
                  <span className="font-normal text-muted-foreground">eng</span>
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <TagEditor tags={post.tags ?? []} allTags={allTags} onChange={(tags) => onTagsChange(post.id, tags)} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); setCreateIdeaOpen(true) }}
                className="shrink-0 h-7 px-3 rounded-md border border-border dark:border-white/10 inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all"
                title="Create idea from this video"
              >
                <Plus size={10} />
                Create idea
              </button>
              {post.url && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload() }}
                  disabled={downloading}
                  className="shrink-0 h-7 px-3 rounded-md border border-border dark:border-white/10 inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all disabled:opacity-50"
                  title="Download video"
                >
                  {downloading ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                  {downloading ? 'Downloading...' : 'Download'}
                </button>
              )}
              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 h-7 px-3 rounded-md bg-purple-500/10 border border-purple-500/25 inline-flex items-center gap-1.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all"
                  title="Open original post"
                >
                  <ExternalLink size={10} />
                  View original
                </a>
              )}
              {downloadError && (
                <span className="shrink-0 text-[10px] text-red-500">{downloadError}</span>
              )}
            </div>
          </div>
        </button>

        {/* Expanded section */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border dark:border-white/6">
            {/* Caption */}
            {post.caption && (
              <div className="pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-400 mb-1">Caption</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cleanCaption(post.caption).replace(/\n{2,}/g, '\n').trim()}
                </p>
              </div>
            )}

            {/* Stats grid */}
            {(() => {
              const colorStats: { label: string; display: string; icon: typeof Eye; color: string }[] = [
                { label: 'Views', display: formatNumber(post.views), icon: Eye, color: 'text-blue-400' },
                { label: 'Likes', display: formatNumber(post.likes), icon: Heart, color: 'text-pink-400' },
                { label: 'Comments', display: formatNumber(post.comments), icon: MessageCircle, color: 'text-amber-400' },
              ]
              if (post.platform === 'tiktok') {
                colorStats.push({ label: 'Saves', display: formatNumber(post.saves), icon: Bookmark, color: 'text-emerald-400' })
                colorStats.push({ label: 'Sends', display: formatNumber(post.shares), icon: Send, color: 'text-cyan-400' })
              }
              if (er != null) {
                colorStats.push({ label: 'Engagement', display: `${er.toFixed(1)}%`, icon: BarChart3, color: er >= 5 ? 'text-green-400' : 'text-muted-foreground' })
              }
              const cols = colorStats.length <= 3 ? 'grid-cols-3' : colorStats.length === 4 ? 'grid-cols-4' : colorStats.length <= 6 ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3'
              return (
            <div className={`grid gap-3 ${cols}`}>
              {colorStats.map(({ label, display, icon: Icon, color }) => (
                <div key={label} className="text-center p-2.5 rounded-lg bg-background border border-border dark:border-white/6">
                  <Icon size={12} className={`mx-auto mb-1 ${color}`} />
                  <p className={`text-sm font-bold ${color}`}>{display}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
              )
            })()}

            {/* Notes */}
            <div className="rounded-lg bg-background border border-border dark:border-white/6 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-400 mb-1.5">Notes</p>
              <InlineNotes
                initialValue={post.ai_notes ?? ''}
                placeholder="Add your notes on why this works..."
                onSave={async (val) => {
                  onNotesChange(post.id, val)
                  await updatePostNotes(post.id, val)
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border dark:border-white/6">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete() }}
                disabled={deleting}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Idea Panel */}
      <Dialog open={createIdeaOpen} onOpenChange={setCreateIdeaOpen}>
        <DialogContent className="!w-[95vw] sm:!w-[70vw] !max-w-none !h-[80vh] sm:!h-[70vh] !max-h-none overflow-hidden bg-background border-border rounded-2xl p-0 gap-0 shadow-[0_0_40px_rgba(124,58,237,0.1)]" showCloseButton={false}>
          <DialogTitle className="sr-only">Create idea from saved video</DialogTitle>
          <CreateIdeaPanel post={post} allTags={allTags} onClose={() => setCreateIdeaOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}


// ─── Inline Notes Editor ──────────────────────────────

function InlineNotes({
  initialValue,
  placeholder,
  onSave,
}: {
  initialValue: string
  placeholder: string
  onSave: (val: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  async function handleSave() {
    if (value !== initialValue) {
      setSaving(true)
      await onSave(value)
      setSaving(false)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setValue(initialValue); setEditing(false) } }}
          placeholder={placeholder}
          className="flex-1 text-xs bg-muted dark:bg-[#1e1e2e] border border-purple-500/40 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-[3px] focus:ring-purple-500/20 transition-all"
        />
        {saving && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
      </div>
    )
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
    >
      <Pencil size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
      {value ? (
        <span className="text-foreground/80">{value}</span>
      ) : (
        <span className="italic opacity-60">{placeholder}</span>
      )}
    </button>
  )
}

// Keep old export name for backwards compat
export { InspoList as SwipeList }

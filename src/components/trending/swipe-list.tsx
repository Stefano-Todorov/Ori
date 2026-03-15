'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Trash2, ExternalLink, Eye, Heart, MessageCircle, BarChart3,
  ChevronDown, Calendar, Pencil, Loader2, Sparkles, Lightbulb,
  SortAsc, Plus, Bookmark, Send, CheckSquare, Square, X, Tag,
  Download,
} from 'lucide-react'
import { deleteSwipePost, updatePostNotes, updatePostTitle, updatePostTags, syncInspoTags, deleteInspoTag } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Post } from '@/lib/types'
import { TagPills, TagEditor, TagFilter } from '@/components/ui/tag-editor'
import { CreateIdeaPanel } from '@/components/shared/create-idea-panel'
import { downloadVideo } from '@/lib/instagram-download'

// ─── Thumbnail ────────────────────────────────────────

function Thumbnail({ post }: { post: Post }) {
  const [src, setSrc] = useState(post.thumbnail_url)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (src || failed) return
    if (!post.url) { setFailed(true); return }
    // Try fetching thumbnail via our API
    fetch(`/api/thumbnail?url=${encodeURIComponent(post.url)}`)
      .then(r => r.json())
      .then(d => {
        if (d.thumbnail) setSrc(d.thumbnail)
        else setFailed(true)
      })
      .catch(() => setFailed(true))
  }, [src, failed, post.url])

  if (failed && !src) {
    // Platform-colored placeholder
    const colors: Record<string, string> = {
      tiktok: 'bg-black/80 dark:bg-white/10 text-white',
      instagram: 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-pink-500',
      youtube: 'bg-red-500/15 text-red-500',
    }
    return (
      <div className={`w-14 h-18 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold uppercase ${colors[post.platform] ?? 'bg-muted text-muted-foreground'}`}>
        {post.platform?.[0] ?? '?'}
      </div>
    )
  }

  if (!src) {
    return <div className="w-14 h-18 rounded-lg shrink-0 bg-muted animate-pulse" />
  }

  return (
    <img
      src={src}
      alt=""
      className="w-14 h-18 rounded-lg object-cover shrink-0 bg-muted"
      onError={() => { setFailed(true); setSrc(null) }}
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
    if (!confirm(`Delete ${selected.size} inspo${selected.size > 1 ? 's' : ''}?`)) return
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

  if (posts.length === 0 && archivedPosts.length === 0) {
    return (
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-12 text-center space-y-2">
        <p className="font-bold text-foreground">No inspo saved yet</p>
        <p className="text-sm text-muted-foreground">Save videos that inspire you — add a URL above or use the Chrome extension while browsing.</p>
      </div>
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

      {/* Sort + select controls */}
      {activePosts.length > 1 && (
        <div className="flex items-center gap-2">
          <SortAsc size={13} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide mr-0.5">Sort:</span>
          {(['date', 'views', 'likes'] as SortMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all capitalize ${
                sortMode === mode
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {mode}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={selectAll}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                selectMode
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {selected.size === sorted.length ? 'Deselect all' : selectMode ? `${selected.size} selected` : 'Select'}
            </button>
          </div>
        </div>
      )}

      {/* Platform filter */}
      {(() => {
        const platforms = [...new Set(activePosts.map(p => p.platform).filter(Boolean))].sort()
        if (platforms.length <= 1) return null
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide mr-0.5">Platform:</span>
            {['all', ...platforms].map(p => (
              <button
                key={p}
                onClick={() => { setPlatformFilter(p); setSelected(new Set()) }}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all capitalize ${
                  platformFilter === p
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )
      })()}

      <TagFilter allTags={allTags} activeTag={tagFilter} onChange={setTagFilter} onDelete={handleDeleteTag} />

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

  // Ideas modal state
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [ideas, setIdeas] = useState<{ idea: string; hook_idea: string; caption: string; difficulty: string; video_type: string }[] | null>(null)
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)

  // Analysis modal state
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  async function handleGetIdeas() {
    setIdeasOpen(true)
    if (ideas) return
    setIdeasLoading(true)
    setIdeasError(null)
    try {
      const res = await fetch('/api/competitors/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          handle: post.competitor_handle || 'unknown',
          platform: post.platform,
          caption: post.caption,
          hookText: post.hook_text,
          views: post.views,
          likes: post.likes,
          url: post.url,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate ideas')
      setIdeas(data.ideas)
    } catch (err) {
      setIdeasError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIdeasLoading(false)
    }
  }

  async function handleAnalyze() {
    setAnalysisOpen(true)
    if (analysis) return
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/competitors/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: post.competitor_handle || 'unknown',
          platform: post.platform,
          caption: post.caption,
          hookText: post.hook_text,
          views: post.views,
          likes: post.likes,
          comments: post.comments,
          url: post.url,
          thumbnailUrl: post.thumbnail_url,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to analyze')
      setAnalysis(data.analysis)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setAnalysisLoading(false)
    }
  }

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
            <div className="flex items-center gap-2 flex-wrap">
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
                  className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 group/title cursor-text"
                  onClick={(e) => { e.stopPropagation(); setTitleValue(post.title || postTitle(post)); setEditingTitle(true) }}
                >
                  {post.title || postTitle(post)}
                  <Pencil size={9} className="inline ml-1.5 opacity-0 group-hover/title:opacity-40 transition-opacity" />
                </p>
              )}
              {post.platform && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize shrink-0 ${
                  post.platform === 'tiktok' ? 'bg-black/80 dark:bg-white/10 text-white border-transparent'
                    : post.platform === 'instagram' ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/30 text-pink-600 dark:text-pink-400'
                    : post.platform === 'youtube' ? 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {post.platform}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                <Calendar size={9} />
                {timeAgo(post.created_at)}
              </span>
              <span className="flex-1" />
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
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}
              />
            </div>

            {/* Stats pills */}
            <div className="flex items-center gap-2 text-[11px]">
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
            <div className="flex items-center gap-1.5">
              <TagPills tags={post.tags ?? []} />
              <TagEditor tags={post.tags ?? []} allTags={allTags} onChange={(tags) => onTagsChange(post.id, tags)} />
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
                <div key={label} className="text-center p-2.5 rounded-lg bg-background dark:bg-[#12121a] border border-border dark:border-white/6">
                  <Icon size={12} className={`mx-auto mb-1 ${color}`} />
                  <p className={`text-sm font-bold ${color}`}>{display}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
              )
            })()}

            {/* Notes */}
            <div className="rounded-lg bg-background dark:bg-[#12121a] border border-border dark:border-white/6 p-3">
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
            <div className="flex items-center gap-2 pt-2 border-t border-border dark:border-white/6 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); handleGetIdeas() }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white text-xs font-semibold shadow-sm shadow-purple-500/20 hover:brightness-110 transition-all"
              >
                <Sparkles size={12} />
                Get Ideas
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleAnalyze() }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all"
              >
                <Lightbulb size={12} />
                Why it worked
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCreateIdeaOpen(true) }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all"
              >
                <Plus size={12} />
                Create idea
              </button>
              {post.url && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload() }}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all disabled:opacity-50"
                >
                  {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {downloading ? 'Downloading...' : 'Download'}
                </button>
              )}
              {downloadError && (
                <span className="text-[10px] text-red-500">{downloadError}</span>
              )}
              <div className="ml-auto" />
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

      {/* Ideas Dialog */}
      <Dialog open={ideasOpen} onOpenChange={setIdeasOpen}>
        <DialogContent className="max-w-lg bg-background dark:bg-[#16161e] border-border dark:border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ideas inspired by this post</DialogTitle>
          </DialogHeader>
          {ideasLoading && (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 size={16} className="animate-spin text-purple-500" />
              <span className="text-sm text-muted-foreground">Generating ideas...</span>
            </div>
          )}
          {ideasError && <p className="text-sm text-destructive py-4">{ideasError}</p>}
          {ideas && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {ideas.map((idea, i) => (
                <div key={i} className="p-3 rounded-xl bg-muted/30 dark:bg-[#1a1a2e] border border-border dark:border-white/6 space-y-1">
                  <p className="text-sm font-medium text-foreground">{idea.idea}</p>
                  {idea.hook_idea && <p className="text-xs text-muted-foreground italic">&ldquo;{idea.hook_idea}&rdquo;</p>}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {idea.video_type && <span className="px-1.5 py-0.5 rounded bg-muted dark:bg-white/5">{idea.video_type}</span>}
                    {idea.difficulty && <span className="px-1.5 py-0.5 rounded bg-muted dark:bg-white/5">{idea.difficulty}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-lg bg-background dark:bg-[#16161e] border-border dark:border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Why it worked</DialogTitle>
          </DialogHeader>
          {analysisLoading && (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 size={16} className="animate-spin text-purple-500" />
              <span className="text-sm text-muted-foreground">Analyzing what made this post perform...</span>
            </div>
          )}
          {analysisError && <p className="text-sm text-destructive py-4">{analysisError}</p>}
          {analysis && (
            <div className="space-y-1.5">
              {analysis.split('\n').filter(Boolean).map((line, i) => {
                const match = line.match(/^-\s*\*\*(.+?)\*\*:?\s*(.*)/)
                if (match) {
                  return (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="font-bold text-foreground shrink-0">{match[1]}:</span>
                      <span className="text-muted-foreground">{match[2]}</span>
                    </div>
                  )
                }
                return <p key={i} className="text-sm text-muted-foreground">{line}</p>
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Idea Panel */}
      <Dialog open={createIdeaOpen} onOpenChange={setCreateIdeaOpen}>
        <DialogContent className="!w-[70vw] !max-w-none !h-[70vh] !max-h-none overflow-hidden bg-background border-border rounded-2xl p-0 gap-0 shadow-[0_0_40px_rgba(124,58,237,0.1)]" showCloseButton={false}>
          <DialogTitle className="sr-only">Create idea from inspo</DialogTitle>
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

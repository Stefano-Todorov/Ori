'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Trash2, ExternalLink, Eye, Heart, MessageCircle,
  ChevronDown, Calendar, Pencil, Loader2, Sparkles, Lightbulb,
  SortAsc, Plus, Bookmark, Send,
} from 'lucide-react'
import { deleteSwipePost, updatePostNotes, updatePostTitle, updatePostTags } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Post } from '@/lib/types'
import { TagPills, TagEditor, TagFilter } from '@/components/ui/tag-editor'
import { CreateIdeaPanel } from '@/components/shared/create-idea-panel'

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
}

// ─── Main List ─────────────────────────────────────────

interface Props {
  posts: Post[]
  allTags: string[]
}

export function InspoList({ posts: initialPosts, allTags: initialAllTags }: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [tagFilter, setTagFilter] = useState('all')
  const [knownTags, setKnownTags] = useState<string[]>([])

  // On mount, merge server tags + persisted tags into knownTags and persist
  useEffect(() => {
    const persisted = loadPersistedTags()
    const merged = [...new Set([...initialAllTags, ...persisted])].sort()
    setKnownTags(merged)
    persistTags(merged)
  }, [initialAllTags])

  // Derive allTags from knownTags + any tags on current posts (catches newly added tags)
  const allTags = [...new Set([...knownTags, ...posts.flatMap(p => p.tags ?? [])])].sort()

  function updateTagsAndPersist(postId: string, tags: string[]) {
    // Update post state
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, tags } : p))
    // Persist any new tags to localStorage
    const updated = [...new Set([...knownTags, ...tags])].sort()
    setKnownTags(updated)
    persistTags(updated)
    // Save to DB
    updatePostTags(postId, tags)
  }

  const sorted = [...posts]
    .filter((p) => tagFilter === 'all' || (p.tags ?? []).includes(tagFilter))
    .sort((a, b) => {
      if (sortMode === 'views') return b.views - a.views
      if (sortMode === 'likes') return b.likes - a.likes
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  async function handleDelete(id: string) {
    await deleteSwipePost(id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  if (posts.length === 0) {
    return (
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-12 text-center space-y-2">
        <p className="font-bold text-foreground">No inspo saved yet</p>
        <p className="text-sm text-muted-foreground">Save videos that inspire you — add a URL above or use the Chrome extension while browsing.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Sort controls */}
      {posts.length > 1 && (
        <div className="flex items-center gap-1.5">
          <SortAsc size={11} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">Sort:</span>
          {(['date', 'views', 'likes'] as SortMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-all capitalize ${
                sortMode === mode
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      )}

      <TagFilter allTags={allTags} activeTag={tagFilter} onChange={setTagFilter} />

      {sorted.map((post) => (
        <InspoCard key={post.id} post={post} allTags={allTags} onDelete={handleDelete} onTagsChange={updateTagsAndPersist} onNotesChange={(id, notes) => {
          setPosts(prev => prev.map(p => p.id === id ? { ...p, ai_notes: notes } : p))
        }} />
      ))}
    </div>
  )
}

// ─── Inspo Card ────────────────────────────────────────

function InspoCard({ post, allTags, onDelete, onTagsChange, onNotesChange }: { post: Post; allTags: string[]; onDelete: (id: string) => void; onTagsChange: (id: string, tags: string[]) => void; onNotesChange: (id: string, notes: string) => void }) {
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

  async function handleDelete() {
    setDeleting(true)
    onDelete(post.id)
  }

  return (
    <>
      <div className="rounded-xl border border-border dark:border-white/6 bg-muted/30 dark:bg-[#1a1a2e] overflow-hidden transition-all hover:border-purple-500/20">
        {/* Header — clickable to expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4 flex items-start gap-3"
        >
          {post.thumbnail_url && (
            <img
              src={post.thumbnail_url}
              alt=""
              className="w-16 h-20 rounded-lg object-cover shrink-0 bg-muted"
            />
          )}
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

          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform duration-200 shrink-0 mt-1 ${expanded ? 'rotate-180' : ''}`}
          />
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
              const stats = [
                { label: 'Views', value: post.views, icon: Eye },
                { label: 'Likes', value: post.likes, icon: Heart },
                { label: 'Comments', value: post.comments, icon: MessageCircle },
              ]
              if (post.platform === 'tiktok') {
                stats.push({ label: 'Saves', value: post.saves, icon: Bookmark })
                stats.push({ label: 'Sends', value: post.shares, icon: Send })
              }
              return (
            <div className={`grid gap-3 ${stats.length > 3 ? 'grid-cols-5' : 'grid-cols-3'}`}>
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center p-2.5 rounded-lg bg-background dark:bg-[#12121a] border border-border dark:border-white/6">
                  <Icon size={12} className="mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">{formatNumber(value)}</p>
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
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all ml-auto"
                >
                  <ExternalLink size={11} />
                  Go to
                </a>
              )}
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

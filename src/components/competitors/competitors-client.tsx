'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ExternalLink, Plus, Trash2, ChevronDown, ChevronRight,
  Eye, Heart, MessageCircle, Pencil, Video,
  Users, BarChart3, Trophy, Loader2, Sparkles, Lightbulb,
  X, SortAsc, Calendar, Bookmark, Send,
} from 'lucide-react'
import { AddPostButton } from '@/components/competitors/add-post-button'
import { deleteCompetitor, deletePost, updateCompetitorNotes, updatePostNotes, updatePostTitle } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Competitor, Post, Platform } from '@/lib/types'
import { CreateIdeaPanel } from '@/components/shared/create-idea-panel'
import { TagPills, TagEditor } from '@/components/ui/tag-editor'
import { updatePostTags } from '@/app/actions'

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

function performanceBadge(views: number) {
  if (views >= 500_000) return { label: 'Viral', icon: '🔥', cls: 'bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400' }
  if (views >= 100_000) return { label: 'Strong', icon: '⚡', cls: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' }
  if (views > 0) return { label: 'Growing', icon: '📈', cls: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400' }
  return null
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const PLATFORM_COLORS: Record<string, { pill: string; border: string }> = {
  tiktok: {
    pill: 'bg-black/80 dark:bg-white/10 text-white border-transparent',
    border: 'border-l-gray-500 dark:border-l-white/30',
  },
  instagram: {
    pill: 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/30 text-pink-600 dark:text-pink-400',
    border: 'border-l-pink-500',
  },
  youtube: {
    pill: 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400',
    border: 'border-l-red-500',
  },
}

type SortMode = 'views' | 'likes' | 'date'

// ─── Main Client Component ────────────────────────────

interface Props {
  competitors: Competitor[]
  postsByHandle: Record<string, Post[]>
  orphanedHandles: string[]
  totalPosts: number
}

export function CompetitorsClient({ competitors, postsByHandle, orphanedHandles, totalPosts }: Props) {
  // Derive all tags from all competitor posts
  const allPosts = Object.values(postsByHandle).flat()
  const allTags = [...new Set(allPosts.flatMap(p => p.tags ?? []))].sort()

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            Competitors
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              {competitors.length + orphanedHandles.length}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Track what&apos;s working in your niche
          </p>
        </div>
      </div>

      {/* Competitor cards */}
      {competitors.length === 0 && orphanedHandles.length === 0 && (
        <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-12 text-center space-y-2">
          <p className="font-bold text-foreground">No competitors yet</p>
          <p className="text-sm text-muted-foreground">Add a competitor to start tracking their content and get AI-generated ideas from their top posts.</p>
        </div>
      )}

      <div className="space-y-4">
        {competitors.map((c) => {
          const posts = postsByHandle[c.handle.toLowerCase()] ?? []
          return <CompetitorCard key={c.id} competitor={c} posts={posts} allTags={allTags} />
        })}

        {orphanedHandles.map(handle => (
          <div key={handle} className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-muted-foreground">@{handle}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-400 text-gray-500">account removed</span>
            </div>
            <div className="space-y-2">
              {postsByHandle[handle].map(post => (
                <PostCard key={post.id} post={post} handle={handle} allTags={allTags} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Competitor Card ──────────────────────────────────

type PlatformFilter = 'all' | Platform

function CompetitorCard({ competitor: c, posts, allTags }: { competitor: Competitor; posts: Post[]; allTags: string[] }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('views')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const colors = PLATFORM_COLORS[c.platform] ?? { pill: 'bg-muted text-muted-foreground border-border', border: 'border-l-gray-400' }

  const platformsInPosts = [...new Set(posts.map(p => p.platform))]
  const filteredPosts = platformFilter === 'all' ? posts : posts.filter(p => p.platform === platformFilter)

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortMode === 'views') return b.views - a.views
    if (sortMode === 'likes') return b.likes - a.likes
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Stats summary
  const avgViews = posts.length > 0 ? posts.reduce((s, p) => s + p.views, 0) / posts.length : 0
  const avgComments = posts.length > 0 ? posts.reduce((s, p) => s + p.comments, 0) / posts.length : 0
  const avgEng = posts.length > 0
    ? posts.reduce((s, p) => s + (p.views > 0 ? ((p.likes + p.comments + p.shares) / p.views) * 100 : 0), 0) / posts.length
    : 0

  async function handleDelete() {
    setDeleting(true)
    await deleteCompetitor(c.id)
    router.refresh()
  }

  return (
    <div className={`bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl overflow-hidden border-l-[3px] ${colors.border}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <span className="font-bold text-lg text-foreground">@{c.handle}</span>
            {c.display_name && <span className="text-muted-foreground text-sm">{c.display_name}</span>}
            {c.follower_count != null && c.follower_count > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                {formatNumber(c.follower_count)} followers
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {c.profile_url && (
              <a
                href={c.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-purple-500 hover:border-purple-500/40 transition-all"
              >
                Profile <ExternalLink size={10} />
              </a>
            )}
            <AddPostButton handle={c.handle} platform={c.platform as Platform} allTags={allTags} />
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Inline notes */}
        <InlineNotes
          initialValue={c.notes ?? ''}
          placeholder="Add notes about this competitor..."
          onSave={(val) => updateCompetitorNotes(c.id, val)}
        />
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <div className="px-5 pb-5 space-y-3">
          {/* Stats summary row */}
          {posts.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-border dark:border-white/6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted dark:bg-white/5 text-xs">
                <span>📹</span>
                <span className="font-bold text-foreground">{posts.length}</span>
                <span className="text-muted-foreground">post{posts.length !== 1 ? 's' : ''}</span>
              </span>
              {avgViews > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted dark:bg-white/5 text-xs">
                  <span>👁</span>
                  <span className="font-bold text-foreground">{formatNumber(Math.round(avgViews))}</span>
                  <span className="text-muted-foreground">avg views</span>
                </span>
              )}
              {avgComments > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted dark:bg-white/5 text-xs">
                  <span>💬</span>
                  <span className="font-bold text-foreground">{formatNumber(Math.round(avgComments))}</span>
                  <span className="text-muted-foreground">avg comments</span>
                </span>
              )}
              {avgEng > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted dark:bg-white/5 text-xs">
                  <span>⚡</span>
                  <span className="font-bold text-foreground">{avgEng.toFixed(1)}%</span>
                  <span className="text-muted-foreground">avg eng.</span>
                </span>
              )}
            </div>
          )}

          {/* Sort & Filter controls */}
          {posts.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <SortAsc size={11} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">Sort:</span>
                {(['views', 'likes', 'date'] as SortMode[]).map(mode => (
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
              {platformsInPosts.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">Platform:</span>
                  <button
                    onClick={() => setPlatformFilter('all')}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-all ${
                      platformFilter === 'all'
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    All
                  </button>
                  {platformsInPosts.map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatformFilter(p)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-all capitalize ${
                        platformFilter === p
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Posts or empty state */}
          {posts.length === 0 ? (
            <EmptyPostsState handle={c.handle} platform={c.platform as Platform} />
          ) : (
            <div className="space-y-2">
              {sortedPosts.map(post => (
                <PostCard key={post.id} post={post} handle={c.handle} allTags={allTags} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
      onClick={() => setEditing(true)}
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

// ─── Empty Posts State ────────────────────────────────

function EmptyPostsState({ handle, platform }: { handle: string; platform: Platform }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowAdd(true)}
        className="w-full py-8 border-2 border-dashed border-purple-500/20 rounded-xl text-center hover:border-purple-500/50 hover:bg-purple-500/[0.03] transition-all duration-200 cursor-pointer group"
      >
        <Video size={24} className="mx-auto mb-2 text-muted-foreground group-hover:text-purple-500 transition-colors" />
        <p className="text-sm font-medium text-foreground">No posts tracked yet</p>
        <p className="text-xs text-muted-foreground mt-1">Click to save their top videos</p>
      </button>
      {showAdd && (
        <div className="flex justify-center">
          <AddPostButton handle={handle} platform={platform} />
        </div>
      )}
    </>
  )
}

// ─── Post Card ────────────────────────────────────────

function cleanCaption(raw: string | null): string {
  if (!raw) return ''
  let text = raw.trim()
  // Strip og:description metadata prefix: "123K likes, 456 comments - user on Date: "caption""
  const metaMatch = text.match(/^\d[\d,.KMB]+\s*likes?[\s\S]*?:\s*[""\u201c]([\s\S]+)[""\u201d]\s*\.?\s*$/)
  if (metaMatch) return metaMatch[1].trim()
  const metaMatch2 = text.match(/^\d[\d,.KMB]+\s*likes?[\s\S]*?:\s*[""\u201c]([\s\S]+)/)
  if (metaMatch2) return metaMatch2[1].replace(/[""\u201d]\s*\.?\s*$/, '').trim()
  return text
}

function postTitle(post: Post): string {
  const cap = cleanCaption(post.caption)
  if (!cap) return 'Untitled post'
  // Strip hashtags, emojis, @mentions for a cleaner title
  const stripped = cap
    .replace(/#[\w]+/g, '')
    .replace(/@[\w.]+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '')
    .trim()
  // Take first sentence (split on . ! or newline)
  const firstSentence = stripped.split(/[!.\n]/)[0].trim()
  if (!firstSentence) return cap.slice(0, 50)
  // If short enough, use as-is
  if (firstSentence.length <= 50) return firstSentence
  // Cut at a natural break — look for comma, "I ", " to ", " and ", " but " etc within first 50 chars
  const cutZone = firstSentence.slice(0, 55)
  const breakPoints = [', ', ' I ', ' to ', ' and ', ' but ', ' so ', ' - ', ' — ']
  let bestCut = -1
  for (const bp of breakPoints) {
    const idx = cutZone.lastIndexOf(bp)
    if (idx > 20 && idx > bestCut) bestCut = idx
  }
  if (bestCut > 0) return firstSentence.slice(0, bestCut).trim()
  // No natural break, just truncate at word boundary
  const truncated = firstSentence.slice(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated).trim() + '...'
}

function PostCard({ post, handle, allTags }: { post: Post; handle: string; allTags: string[] }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [createIdeaOpen, setCreateIdeaOpen] = useState(false)
  const [tags, setTags] = useState<string[]>(post.tags ?? [])
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(post.title ?? '')
  const titleRef = useRef<HTMLInputElement>(null)
  const er = engagementRate(post)

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
    if (ideas) return // already loaded
    setIdeasLoading(true)
    setIdeasError(null)
    try {
      const res = await fetch('/api/competitors/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          handle,
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
          handle,
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

  async function handleDeletePost() {
    setDeleting(true)
    await deletePost(post.id)
    router.refresh()
  }

  return (
    <>
      <div className="rounded-xl border border-border dark:border-white/6 bg-muted/30 dark:bg-[#1a1a2e] overflow-hidden transition-all hover:border-purple-500/20">
        {/* Header — clickable to expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4 flex items-start gap-3"
        >
          {/* Thumbnail */}
          {post.thumbnail_url ? (
            <img
              src={post.thumbnail_url}
              alt=""
              className="w-14 h-14 rounded-lg object-cover bg-muted shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted dark:bg-white/5 shrink-0 flex items-center justify-center">
              <Video size={18} className="text-muted-foreground/40" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Title + date row */}
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
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize shrink-0 ${(PLATFORM_COLORS[post.platform] ?? { pill: 'bg-muted text-muted-foreground border-border' }).pill}`}>
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
              <TagPills tags={tags} />
              <TagEditor tags={tags} allTags={allTags} onChange={(newTags) => { setTags(newTags); updatePostTags(post.id, newTags) }} />
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

            {/* Post notes */}
            <div className="rounded-lg bg-background dark:bg-[#12121a] border border-border dark:border-white/6 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-400 mb-1.5">Notes</p>
              <InlineNotes
                initialValue={post.ai_notes ?? ''}
                placeholder="Add your notes on this post..."
                onSave={(val) => updatePostNotes(post.id, val)}
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
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all ml-auto"
                >
                  <ExternalLink size={12} />
                  Go to
                </a>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePost() }}
                disabled={deleting}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ideas Modal */}
      <Dialog open={ideasOpen} onOpenChange={setIdeasOpen}>
        <DialogContent className="max-w-xl bg-background dark:bg-[#16161e] border-border dark:border-white/10 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-purple-500" />
              AI-Generated Ideas
            </DialogTitle>
          </DialogHeader>
          {ideasLoading && (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 size={20} className="animate-spin text-purple-500" />
              <span className="text-sm text-muted-foreground">Generating ideas inspired by this post...</span>
            </div>
          )}
          {ideasError && (
            <p className="text-sm text-destructive py-4">{ideasError}</p>
          )}
          {ideas && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {ideas.map((idea, i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/30 dark:bg-[#1a1a2e] border border-border dark:border-white/6 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{idea.idea}</p>
                    {idea.difficulty && (
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        idea.difficulty === 'easy' ? 'bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400'
                          : idea.difficulty === 'hard' ? 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400'
                          : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {idea.difficulty}
                      </span>
                    )}
                  </div>
                  {idea.hook_idea && (
                    <p className="text-xs italic text-muted-foreground">&ldquo;{idea.hook_idea}&rdquo;</p>
                  )}
                  {idea.video_type && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      {idea.video_type}
                    </span>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground text-center pt-2">
                ✓ These ideas have been saved to your Ideas board
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Analysis Modal */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-lg bg-background dark:bg-[#16161e] border-border dark:border-white/10 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Lightbulb size={16} className="text-yellow-500" />
              Why This Post Worked
            </DialogTitle>
          </DialogHeader>
          {analysisLoading && (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 size={20} className="animate-spin text-purple-500" />
              <span className="text-sm text-muted-foreground">Analyzing what made this post perform...</span>
            </div>
          )}
          {analysisError && (
            <p className="text-sm text-destructive py-4">{analysisError}</p>
          )}
          {analysis && (
            <div className="space-y-2 py-2">
              {analysis.split('\n').filter(Boolean).map((line, i) => {
                // Parse "- **Keyword**: explanation" format
                const match = line.match(/^-\s*\*\*(.+?)\*\*:?\s*(.*)/)
                if (match) {
                  return (
                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30 dark:bg-[#1a1a2e] border border-border dark:border-white/6">
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400 shrink-0">{match[1]}</span>
                      <span className="text-sm text-muted-foreground">{match[2]}</span>
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
          <DialogTitle className="sr-only">Create idea from competitor post</DialogTitle>
          <CreateIdeaPanel post={post} allTags={allTags} onClose={() => setCreateIdeaOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

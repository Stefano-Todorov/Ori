'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Trash2, ExternalLink, Eye, Heart, MessageCircle, TrendingUp,
  ChevronDown, Calendar, Pencil, Loader2, Sparkles, Lightbulb,
  SortAsc, Check, ArrowRight,
} from 'lucide-react'
import { deleteSwipePost, updatePostNotes, createIdeaFromInspo } from '@/app/actions'
import { useRouter } from 'next/navigation'
import type { Post } from '@/lib/types'

// ─── Helpers ───────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
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
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const PLATFORM_PILL: Record<string, string> = {
  tiktok: 'bg-black/80 dark:bg-white/10 text-white border-transparent',
  instagram: 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/30 text-pink-600 dark:text-pink-400',
  youtube: 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400',
}

type SortMode = 'date' | 'views' | 'likes'

// ─── Main List ─────────────────────────────────────────

interface Props {
  posts: Post[]
}

export function InspoList({ posts: initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const [sortMode, setSortMode] = useState<SortMode>('date')

  const sorted = [...posts].sort((a, b) => {
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

      {sorted.map((post) => (
        <InspoCard key={post.id} post={post} onDelete={handleDelete} />
      ))}
    </div>
  )
}

// ─── Inspo Card ────────────────────────────────────────

function InspoCard({ post, onDelete }: { post: Post; onDelete: (id: string) => void }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const badge = performanceBadge(post.views)
  const hasStats = post.views > 0 || post.likes > 0 || post.comments > 0

  // Analysis state
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Create idea state
  const [ideaCreated, setIdeaCreated] = useState(false)
  const [creatingIdea, setCreatingIdea] = useState(false)

  async function handleAnalyze() {
    if (analysis) { setExpanded(true); return }
    setAnalysisLoading(true)
    setAnalysisError(null)
    setExpanded(true)
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

  async function handleCreateIdea() {
    setCreatingIdea(true)
    const result = await createIdeaFromInspo(post.id)
    setCreatingIdea(false)
    if (result.error) {
      setAnalysisError(result.error)
    } else {
      setIdeaCreated(true)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    onDelete(post.id)
  }

  return (
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl overflow-hidden transition-all duration-150 hover:border-purple-500/20">
      {/* Main clickable area */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row: platform + handle + badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize ${PLATFORM_PILL[post.platform] ?? 'bg-muted text-muted-foreground border-border'}`}>
              {post.platform}
            </span>
            {post.competitor_handle && (
              <span className="text-xs font-medium text-muted-foreground">@{post.competitor_handle}</span>
            )}
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                {badge.icon} {badge.label}
              </span>
            )}
          </div>

          {/* Hook text */}
          {post.hook_text && (
            <p className="text-sm font-medium italic text-foreground leading-snug">
              &ldquo;{post.hook_text}&rdquo;
            </p>
          )}

          {/* Caption */}
          {post.caption && (
            <p className={`text-sm text-muted-foreground ${expanded ? '' : 'line-clamp-2'}`}>
              {post.caption}
            </p>
          )}

          {/* Stats row */}
          {hasStats && (
            <div className="flex gap-4 text-xs pt-0.5">
              {post.views > 0 && (
                <span className="flex items-center gap-1">
                  <Eye size={11} className="text-muted-foreground" />
                  <span className="font-bold text-foreground">{formatNumber(post.views)}</span>
                </span>
              )}
              {post.likes > 0 && (
                <span className="flex items-center gap-1">
                  <Heart size={11} className="text-muted-foreground" />
                  <span className="font-bold text-foreground">{formatNumber(post.likes)}</span>
                </span>
              )}
              {post.comments > 0 && (
                <span className="flex items-center gap-1">
                  <MessageCircle size={11} className="text-muted-foreground" />
                  <span className="font-bold text-foreground">{formatNumber(post.comments)}</span>
                </span>
              )}
              {post.shares > 0 && (
                <span className="flex items-center gap-1">
                  <TrendingUp size={11} className="text-muted-foreground" />
                  <span className="font-bold text-foreground">{formatNumber(post.shares)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: date + chevron */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar size={9} />
            {timeAgo(post.created_at)}
          </span>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-border dark:border-white/6">
          {/* Full stats grid */}
          {hasStats && (
            <div className="grid grid-cols-4 gap-3 pt-3">
              {[
                { label: 'Views', value: post.views, icon: Eye },
                { label: 'Likes', value: post.likes, icon: Heart },
                { label: 'Comments', value: post.comments, icon: MessageCircle },
                { label: 'Shares', value: post.shares, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center p-2.5 rounded-lg bg-muted/30 dark:bg-[#1a1a2e] border border-border dark:border-white/6">
                  <Icon size={12} className="mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">{formatNumber(value)}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* URL */}
          {post.url && (
            <p className="text-xs text-muted-foreground/60 truncate">{post.url}</p>
          )}

          {/* Inline notes */}
          <InlineNotes
            initialValue={post.ai_notes ?? ''}
            placeholder="Your notes on why this works..."
            onSave={(val) => updatePostNotes(post.id, val)}
          />

          {/* AI Analysis result */}
          {analysisLoading && (
            <div className="flex items-center gap-2 py-3">
              <Loader2 size={14} className="animate-spin text-purple-500" />
              <span className="text-xs text-muted-foreground">Analyzing what made this post perform...</span>
            </div>
          )}
          {analysisError && (
            <p className="text-xs text-destructive">{analysisError}</p>
          )}
          {analysis && (
            <div className="space-y-1.5 p-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/15">
              <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Why it worked</p>
              {analysis.split('\n').filter(Boolean).map((line, i) => {
                const match = line.match(/^-\s*\*\*(.+?)\*\*:?\s*(.*)/)
                if (match) {
                  return (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="font-bold text-foreground shrink-0">{match[1]}:</span>
                      <span className="text-muted-foreground">{match[2]}</span>
                    </div>
                  )
                }
                return <p key={i} className="text-xs text-muted-foreground">{line}</p>
              })}
            </div>
          )}

          {/* Idea created success */}
          {ideaCreated && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <Check size={14} className="text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Idea created!</span>
              <button
                onClick={() => router.push('/dashboard/ideas')}
                className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline ml-auto flex items-center gap-1"
              >
                View in Ideas <ArrowRight size={10} />
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border dark:border-white/6">
            <div className="flex items-center gap-2">
              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-purple-500 hover:border-purple-500/40 transition-all"
                >
                  <ExternalLink size={11} />
                  Open
                </a>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleAnalyze() }}
                disabled={analysisLoading}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-purple-500/30 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-50"
              >
                <Lightbulb size={11} />
                {analysis ? 'Analysis' : 'Why did this work?'}
              </button>
              {!ideaCreated && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCreateIdea() }}
                  disabled={creatingIdea}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white text-xs font-medium shadow-sm shadow-purple-500/20 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  <Sparkles size={11} />
                  {creatingIdea ? 'Creating...' : 'Create idea'}
                </button>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete() }}
              disabled={deleting}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Collapsed: quick actions */}
      {!expanded && (
        <div className="px-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-purple-500 transition-colors"
              >
                <ExternalLink size={11} />
              </a>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleAnalyze() }}
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-all"
            >
              <Lightbulb size={10} />
              Analyze
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateIdea() }}
              disabled={creatingIdea || ideaCreated}
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-50"
            >
              <Sparkles size={10} />
              {ideaCreated ? 'Created' : 'Idea'}
            </button>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete() }}
            disabled={deleting}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash2 size={11} />
          </button>
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
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
    >
      <Pencil size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
      {value ? (
        <span className="italic">{value}</span>
      ) : (
        <span className="italic opacity-60">{placeholder}</span>
      )}
    </button>
  )
}

// Keep old export name for backwards compat
export { InspoList as SwipeList }

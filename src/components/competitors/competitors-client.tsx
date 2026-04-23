'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ExternalLink, Plus, Trash2, ChevronDown, ChevronRight,
  Eye, Heart, MessageCircle, Pencil, Video,
  Users, BarChart3, Trophy, Loader2,
  X, SortAsc, Calendar, Bookmark, Send, Link, Unlink,
  Download,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { refreshKeepScroll } from '@/lib/router-utils'
import { AddPostButton } from '@/components/competitors/add-post-button'
import { deleteCompetitor, deletePost, updateCompetitorNotes, updateCompetitorUrl, updatePostNotes, updatePostTitle, linkCompetitors, unlinkCompetitor, addIdea } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Competitor, Post, Platform } from '@/lib/types'
import { CreateIdeaPanel } from '@/components/shared/create-idea-panel'
import { TagPills, TagEditor } from '@/components/ui/tag-editor'
import { updatePostTags } from '@/app/actions'
import { downloadVideo } from '@/lib/instagram-download'

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

function engagementColor(er: number): string {
  if (er >= 10) return 'bg-green-500/15 border-green-500/25 text-green-600 dark:text-green-400'
  if (er >= 5) return 'bg-amber-500/15 border-amber-500/25 text-amber-600 dark:text-amber-400'
  return 'bg-muted dark:bg-white/5 border-border dark:border-white/6 text-muted-foreground'
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

// ─── Thumbnail with API fallback ──────────────────────

function CompetitorThumbnail({ post }: { post: Post }) {
  const [src, setSrc] = useState<string | null>(post.thumbnail_url)
  const [failed, setFailed] = useState(false)
  const [triedApi, setTriedApi] = useState(false)

  useEffect(() => {
    if (src || triedApi) return
    if (!post.url) { setFailed(true); return }
    setTriedApi(true)
    fetch(`/api/thumbnail?url=${encodeURIComponent(post.url)}`)
      .then(r => r.json())
      .then(d => {
        if (d.thumbnail) setSrc(d.thumbnail)
        else setFailed(true)
      })
      .catch(() => setFailed(true))
  }, [src, triedApi, post.url])

  if (!src) {
    return (
      <div className="w-14 h-18 rounded-lg bg-muted dark:bg-white/10 shrink-0 flex items-center justify-center">
        <Video size={20} className="text-purple-500/40" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      className="w-14 h-18 rounded-lg object-cover bg-muted shrink-0"
      onError={() => { setSrc(null); setFailed(!triedApi) }}
    />
  )
}

const TAG_COLORS: Record<string, string> = {
  routine: 'bg-blue-400/15 border-blue-400/30 text-blue-500 dark:text-blue-400',
  training: 'bg-purple-400/15 border-purple-400/30 text-purple-500 dark:text-purple-400',
  food: 'bg-green-400/15 border-green-400/30 text-green-500 dark:text-green-400',
  fitness: 'bg-orange-400/15 border-orange-400/30 text-orange-500 dark:text-orange-400',
  lifestyle: 'bg-pink-400/15 border-pink-400/30 text-pink-500 dark:text-pink-400',
}

function tagColor(tag: string): string {
  return TAG_COLORS[tag.toLowerCase()] ?? 'bg-purple-400/15 border-purple-400/30 text-purple-500 dark:text-purple-400'
}

type SortMode = 'views' | 'likes' | 'date'

// ─── Main Client Component ────────────────────────────

export interface CompetitorGroup {
  groupId: string
  competitors: Competitor[]
  posts: Post[]
}

interface Props {
  groups: CompetitorGroup[]
  allCompetitors: Competitor[]
  orphanedHandles: string[]
  orphanedPostsByHandle: Record<string, Post[]>
  totalPosts: number
}

export function CompetitorsClient({ groups, allCompetitors, orphanedHandles, orphanedPostsByHandle, totalPosts }: Props) {
  const allPosts = groups.flatMap(g => g.posts)
  const allTags = [...new Set(allPosts.flatMap(p => p.tags ?? []))].sort()

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            Competitors
            <InfoTooltip text="Track other creators in your niche. Save their top-performing videos and use AI to generate content ideas inspired by what's working for them." />
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              {groups.length + orphanedHandles.length}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Track what&apos;s working in your niche
          </p>
        </div>
      </div>

      {/* Competitor cards */}
      {groups.length === 0 && orphanedHandles.length === 0 && (
        <EmptyState
          icon={Users}
          title="No competitors yet"
          description="Add a competitor to start tracking their content and get AI-generated ideas from their top posts."
        />
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <CompetitorCard key={group.groupId} group={group} allCompetitors={allCompetitors} allTags={allTags} />
        ))}

        {orphanedHandles.map(handle => (
          <div key={handle} className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-muted-foreground">@{handle}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-400 text-gray-500">account removed</span>
            </div>
            <div className="space-y-2">
              {orphanedPostsByHandle[handle].map(post => (
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

function CompetitorCard({ group, allCompetitors, allTags }: { group: CompetitorGroup; allCompetitors: Competitor[]; allTags: string[] }) {
  const router = useRouter()
  const { competitors: comps, posts } = group
  const primaryComp = comps[0]
  const [collapsed, setCollapsed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('views')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [linkMenuOpen, setLinkMenuOpen] = useState(false)
  const [linking, setLinking] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [connectUrl, setConnectUrl] = useState('')

  const linkableCompetitors = allCompetitors.filter(c => c.group_id !== group.groupId)

  const platformsInPosts = [...new Set(posts.map(p => p.platform))]
  const filteredPosts = platformFilter === 'all' ? posts : posts.filter(p => p.platform === platformFilter)

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortMode === 'views') return b.views - a.views
    if (sortMode === 'likes') return b.likes - a.likes
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const avgViews = posts.length > 0 ? posts.reduce((s, p) => s + p.views, 0) / posts.length : 0
  const avgComments = posts.length > 0 ? posts.reduce((s, p) => s + p.comments, 0) / posts.length : 0
  const avgEng = posts.length > 0
    ? posts.reduce((s, p) => s + (p.views > 0 ? ((p.likes + p.comments + p.shares) / p.views) * 100 : 0), 0) / posts.length
    : 0

  async function handleDelete(deletePosts: boolean) {
    setDeleting(true)
    setDeleteConfirmOpen(false)
    await deleteCompetitor(primaryComp.id, deletePosts)
    refreshKeepScroll(router)
  }

  async function handleLink(sourceId: string) {
    setLinking(true)
    await linkCompetitors(sourceId, primaryComp.id)
    setLinkMenuOpen(false)
    setLinking(false)
    refreshKeepScroll(router)
  }

  async function handleUnlink(compId: string) {
    await unlinkCompetitor(compId)
    refreshKeepScroll(router)
  }

  async function handleConnectUrl(compId: string) {
    if (!connectUrl.trim()) return
    await updateCompetitorUrl(compId, connectUrl.trim())
    setConnectingId(null)
    setConnectUrl('')
    refreshKeepScroll(router)
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          {/* Username + platform pill */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="font-bold text-xl text-foreground">@{primaryComp.handle}</span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${
              primaryComp.platform === 'tiktok'
                ? 'bg-black/80 dark:bg-white/10 text-white border-white/15'
                : primaryComp.platform === 'instagram'
                ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/30 text-pink-500 dark:text-pink-400'
                : 'bg-red-500/15 border-red-500/30 text-red-500 dark:text-red-400'
            }`}>
              {primaryComp.platform}
            </span>
            {primaryComp.follower_count != null && primaryComp.follower_count > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                {formatNumber(primaryComp.follower_count)} followers
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Link button */}
            <div className="relative">
              <button
                onClick={() => setLinkMenuOpen(!linkMenuOpen)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-all ${
                  comps.length > 1
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'border border-border dark:border-white/10 text-muted-foreground hover:text-purple-500 hover:border-purple-500/40'
                }`}
              >
                <Link size={12} />
                {comps.length > 1 ? `${comps.length} Linked` : 'Link'}
              </button>
              {linkMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                  {comps.length > 1 && (
                    <>
                      <div className="p-2 border-b border-border dark:border-white/6">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Linked accounts</p>
                      </div>
                      <div className="p-1">
                        {comps.map(c => (
                          <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg">
                            <span className="text-sm font-medium text-foreground flex-1">@{c.handle}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${
                              c.platform === 'tiktok'
                                ? 'bg-black/80 dark:bg-white/10 text-white border-white/15'
                                : c.platform === 'instagram'
                                ? 'bg-pink-500/20 border-pink-500/30 text-pink-500 dark:text-pink-400'
                                : 'bg-red-500/15 border-red-500/30 text-red-500 dark:text-red-400'
                            }`}>
                              {c.platform}
                            </span>
                            <button
                              onClick={() => handleUnlink(c.id)}
                              className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                              title="Unlink"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {linkableCompetitors.length > 0 && (
                    <>
                      <div className="p-2 border-b border-t border-border dark:border-white/6">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Link as same creator</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {linkableCompetitors.map(lc => (
                          <button
                            key={lc.id}
                            onClick={() => handleLink(lc.id)}
                            disabled={linking}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-muted dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                          >
                            <span className="text-sm font-medium text-foreground">@{lc.handle}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${
                              lc.platform === 'tiktok'
                                ? 'bg-black/80 dark:bg-white/10 text-white border-white/15'
                                : lc.platform === 'instagram'
                                ? 'bg-pink-500/20 border-pink-500/30 text-pink-500 dark:text-pink-400'
                                : 'bg-red-500/15 border-red-500/30 text-red-500 dark:text-red-400'
                            }`}>
                              {lc.platform}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Profile links — connect or visit per platform */}
            {comps.map(c => c.profile_url ? (
              <a
                key={c.id}
                href={c.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all hover:brightness-125 ${
                  c.platform === 'tiktok'
                    ? 'border-white/15 text-white/80 hover:text-white bg-white/5'
                    : c.platform === 'instagram'
                    ? 'border-pink-500/30 text-pink-500 dark:text-pink-400 bg-pink-500/5 hover:bg-pink-500/10'
                    : 'border-red-500/30 text-red-500 dark:text-red-400 bg-red-500/5 hover:bg-red-500/10'
                }`}
              >
                {c.platform === 'tiktok' ? 'TT' : c.platform === 'instagram' ? 'IG' : 'YT'} <ExternalLink size={10} />
              </a>
            ) : (
              <div key={c.id} className="relative">
                {connectingId === c.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="url"
                      value={connectUrl}
                      onChange={e => setConnectUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleConnectUrl(c.id); if (e.key === 'Escape') { setConnectingId(null); setConnectUrl('') } }}
                      placeholder={`Paste ${c.platform} profile URL`}
                      autoFocus
                      className="h-8 w-56 px-2.5 rounded-lg border border-purple-500/40 bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    />
                    <button
                      onClick={() => handleConnectUrl(c.id)}
                      disabled={!connectUrl.trim()}
                      className="h-8 px-2.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 disabled:opacity-40 transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setConnectingId(null); setConnectUrl('') }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setConnectingId(c.id); setConnectUrl('') }}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed text-xs font-semibold transition-all hover:border-purple-500/40 hover:text-purple-500 ${
                      c.platform === 'tiktok'
                        ? 'border-white/15 text-white/40'
                        : c.platform === 'instagram'
                        ? 'border-pink-500/20 text-pink-500/40'
                        : 'border-red-500/20 text-red-500/40'
                    }`}
                  >
                    {c.platform === 'tiktok' ? 'TT' : c.platform === 'instagram' ? 'IG' : 'YT'} <Link size={10} />
                  </button>
                )}
              </div>
            ))}

            <AddPostButton handle={primaryComp.handle} platform={primaryComp.platform as Platform} allTags={allTags} />

            {/* Divider before trash + chevron */}
            <div className="h-6 w-px bg-border dark:bg-white/8 mx-1" />

            <button
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {/* Notes field */}
        <div className="mt-3">
          <InlineNotes
            initialValue={primaryComp.notes ?? ''}
            placeholder="Add notes about this competitor..."
            onSave={(val) => updateCompetitorNotes(primaryComp.id, val)}
          />
        </div>
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <div className="px-5 pb-5 space-y-3">
          {/* Stats summary bar */}
          {posts.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-border dark:border-white/6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/6 text-xs" title="Total tracked posts">
                <span>📹</span>
                <span className="font-bold text-foreground">{posts.length}</span>
                <span className="text-muted-foreground">post{posts.length !== 1 ? 's' : ''}</span>
              </span>
              {avgViews > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/6 text-xs" title="Average views across all tracked posts">
                  <span>👁</span>
                  <span className="font-bold text-foreground">{formatNumber(Math.round(avgViews))}</span>
                  <span className="text-muted-foreground">avg views</span>
                </span>
              )}
              {avgComments > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/6 text-xs" title="Average comments per post">
                  <span>💬</span>
                  <span className="font-bold text-foreground">{formatNumber(Math.round(avgComments))}</span>
                  <span className="text-muted-foreground">avg comments</span>
                </span>
              )}
              {avgEng > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs" title="Average engagement rate = (likes + comments + shares) / views">
                  <span>⚡</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{avgEng.toFixed(1)}%</span>
                  <span className="text-amber-600/60 dark:text-amber-400/60">avg eng.</span>
                </span>
              )}
            </div>
          )}

          {/* Sort & Filter controls */}
          {posts.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap pb-3 border-b border-border dark:border-white/6">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mr-1">Sort by</span>
                {(['views', 'likes', 'date'] as SortMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all capitalize ${
                      sortMode === mode
                        ? 'bg-purple-500/15 text-white border border-purple-500/30'
                        : 'text-muted-foreground hover:text-foreground hover:underline'
                    }`}
                  >
                    {mode === 'date' ? 'Date' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              {platformsInPosts.length > 1 && (
                <>
                  <div className="h-4 w-px bg-border dark:bg-white/8" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mr-1">Platform</span>
                    <button
                      onClick={() => setPlatformFilter('all')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                        platformFilter === 'all'
                          ? 'bg-purple-500/15 text-white border border-purple-500/30'
                          : 'text-muted-foreground hover:text-foreground hover:underline'
                      }`}
                    >
                      All
                    </button>
                    {platformsInPosts.map(p => (
                      <button
                        key={p}
                        onClick={() => setPlatformFilter(p)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all capitalize ${
                          platformFilter === p
                            ? p === 'instagram'
                              ? 'bg-pink-500/15 text-pink-500 dark:text-pink-400 border border-pink-500/30'
                              : p === 'tiktok'
                              ? 'bg-white/10 text-white border border-white/20'
                              : 'bg-red-500/15 text-red-500 border border-red-500/30'
                            : 'text-muted-foreground hover:text-foreground hover:underline'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Posts or empty state */}
          {posts.length === 0 ? (
            <EmptyPostsState handle={primaryComp.handle} platform={primaryComp.platform as Platform} />
          ) : (
            <div className="space-y-2">
              {sortedPosts.map(post => (
                <PostCard key={post.id} post={post} handle={post.competitor_handle ?? primaryComp.handle} allTags={allTags} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm bg-background dark:bg-[#16161e] border-border dark:border-white/10 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete @{primaryComp.handle}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            What should happen to the {posts.length} tracked post{posts.length !== 1 ? 's' : ''}?
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => handleDelete(false)}
              className="w-full h-10 rounded-xl border border-border dark:border-white/10 text-sm font-medium text-foreground hover:bg-muted transition-all"
            >
              Keep posts as inspiration
            </button>
            <button
              onClick={() => handleDelete(true)}
              className="w-full h-10 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
            >
              Delete competitor + all posts
            </button>
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="w-full h-10 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
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
          className="flex-1 text-xs bg-transparent border border-purple-500/40 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-[3px] focus:ring-purple-500/20 transition-all"
        />
        {saving && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-white/[0.03] dark:bg-white/[0.03] border border-dashed border-white/10 hover:border-solid hover:border-white/20 transition-all group"
    >
      <Pencil size={11} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
      {value ? (
        <span className="text-foreground/80">{value}</span>
      ) : (
        <span className="italic text-muted-foreground/40">{placeholder}</span>
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

  async function handleDeletePost() {
    setDeleting(true)
    await deletePost(post.id)
    refreshKeepScroll(router)
  }

  const displayTitle = post.title || postTitle(post)
  const fullTitle = post.title || cleanCaption(post.caption) || 'Untitled post'

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

  return (
    <>
      <div className={`rounded-xl border overflow-hidden transition-all border-border dark:border-white/6 bg-muted/30 dark:bg-[#1a1a2e] hover:border-purple-500/20`}>
        {/* Header — clickable to expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4 flex items-start gap-3"
        >
          {/* Thumbnail */}
          <CompetitorThumbnail post={post} />
          <div className="flex-1 min-w-0 space-y-1">
            {/* Title row */}
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
                  {displayTitle}
                  <Pencil size={9} className="inline ml-1.5 opacity-0 group-hover/title:opacity-40 transition-opacity" />
                </p>
              )}
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
              <TagPills tags={tags} />
              <TagEditor tags={tags} allTags={allTags} onChange={(newTags) => { setTags(newTags); updatePostTags(post.id, newTags) }} />
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

            {/* Post notes */}
            <div className="rounded-lg bg-background border border-border dark:border-white/6 p-3">
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
                onClick={(e) => { e.stopPropagation(); handleDeletePost() }}
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
          <DialogTitle className="sr-only">Create idea from competitor post</DialogTitle>
          <CreateIdeaPanel post={post} allTags={allTags} onClose={() => setCreateIdeaOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}


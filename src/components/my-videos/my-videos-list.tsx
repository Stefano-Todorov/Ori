'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, ArrowUpDown, Eye, Heart, MessageCircle, Share2, Bookmark, TrendingUp, Link as LinkIcon, X, ExternalLink, FileText, Loader2, Zap, VideoIcon } from 'lucide-react'
import { linkVideoToIdea, unlinkVideoFromIdea } from '@/app/actions'
import type { Post, ContentIdea, Script } from '@/lib/types'

interface Props {
  posts: Post[]
  ideas: Pick<ContentIdea, 'id' | 'idea' | 'hook_idea' | 'status' | 'linked_post_id'>[]
  scripts: Pick<Script, 'id' | 'topic' | 'hook' | 'body' | 'cta' | 'eval_score' | 'eval_tags' | 'created_at'>[]
  lastSyncedAt: Record<string, string>
}

type SortKey = 'views' | 'likes' | 'comments' | 'engagement_rate' | 'posted_at'
type PlatformFilter = 'all' | 'tiktok' | 'instagram' | 'youtube'

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/15 text-red-400 border-red-500/30',
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '-'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

/** Normalize a social media URL by stripping query params and trailing slashes */
function normalizeUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    u.search = ''
    u.hash = ''
    return u.pathname.replace(/\/+$/, '')
  } catch {
    return url
  }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function MyVideosList({ posts, ideas, scripts, lastSyncedAt }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('posted_at')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [search, setSearch] = useState('')
  const [linking, setLinking] = useState<string | null>(null)
  const [scriptInput, setScriptInput] = useState<string | null>(null) // postId being edited
  const [scriptText, setScriptText] = useState('')
  const [scoring, setScoring] = useState<string | null>(null)
  const [evalResults, setEvalResults] = useState<Record<string, { score: number; tags: string[] }>>({})
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(new Set())

  const handleThumbError = useCallback((postId: string) => {
    setBrokenThumbs(prev => new Set(prev).add(postId))
  }, [])

  const availableIdeas = ideas.filter(i => !i.linked_post_id && i.status !== 'archived')

  const filteredPosts = useMemo(() => {
    // Deduplicate by normalized URL (keep the one with more views)
    const seen = new Map<string, Post>()
    for (const p of posts) {
      const key = normalizeUrl(p.url) ?? p.id
      const existing = seen.get(key)
      if (!existing || (p.views ?? 0) > (existing.views ?? 0)) {
        seen.set(key, p)
      }
    }
    let result = [...seen.values()]

    if (platformFilter !== 'all') {
      result = result.filter(p => p.platform === platformFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        (p.caption?.toLowerCase().includes(q)) ||
        (p.hashtags?.some(h => h.toLowerCase().includes(q)))
      )
    }

    result.sort((a, b) => {
      if (sortBy === 'posted_at') {
        const dateA = new Date(a.posted_at ?? a.created_at ?? 0).getTime()
        const dateB = new Date(b.posted_at ?? b.created_at ?? 0).getTime()
        return dateB - dateA
      }
      return ((b[sortBy] as number) ?? 0) - ((a[sortBy] as number) ?? 0)
    })

    return result
  }, [posts, platformFilter, search, sortBy])

  const platforms = [...new Set(posts.map(p => p.platform))]

  const lastSyncEntries = Object.entries(lastSyncedAt).filter(([, v]) => v)

  async function handleLink(postId: string, ideaId: string) {
    setLinking(postId)
    await linkVideoToIdea(postId, ideaId)
    setLinking(null)
  }

  async function handleUnlink(postId: string) {
    setLinking(postId)
    await unlinkVideoFromIdea(postId)
    setLinking(null)
  }

  async function handleScoreScript(postId: string) {
    if (!scriptText.trim()) return
    setScoring(postId)
    try {
      const res = await fetch('/api/posts/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, scriptText }),
      })
      if (res.ok) {
        const data = await res.json()
        setEvalResults(prev => ({ ...prev, [postId]: { score: data.eval.score, tags: data.eval.tags } }))
        setScriptInput(null)
        setScriptText('')
      }
    } catch { /* silently fail */ }
    setScoring(null)
  }

  async function handleLinkScript(postId: string, scriptId: string) {
    setLinking(postId)
    try {
      await fetch('/api/posts/link-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, scriptId }),
      })
    } catch { /* silently fail */ }
    setLinking(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Videos</h1>
          {lastSyncEntries.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Last synced: {lastSyncEntries.map(([platform, timestamp]) => (
                <span key={platform} className="mr-3">
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}: {timeAgo(timestamp)}
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredPosts.length} video{filteredPosts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search captions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Platform filter */}
        <div className="flex gap-1.5">
          <Button
            variant={platformFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPlatformFilter('all')}
          >
            All
          </Button>
          {platforms.map(p => (
            <Button
              key={p}
              variant={platformFilter === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlatformFilter(p as PlatformFilter)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="posted_at">Date Posted</SelectItem>
            <SelectItem value="views">Views</SelectItem>
            <SelectItem value="likes">Likes</SelectItem>
            <SelectItem value="comments">Comments</SelectItem>
            <SelectItem value="engagement_rate">Engagement %</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {posts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-2">No videos synced yet</p>
            <p className="text-sm text-muted-foreground">
              Visit your TikTok or Instagram profile with the Orianna extension installed, then click &quot;Sync My Videos&quot; to import your posts.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Video grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {filteredPosts.map(post => {
          const linkedIdea = post.linked_idea_id
            ? ideas.find(i => i.id === post.linked_idea_id)
            : null

          return (
            <Card key={post.id} className="overflow-hidden">
              {/* Thumbnail */}
              {post.thumbnail_url && !brokenThumbs.has(post.id) ? (
                <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                  <img
                    src={post.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => handleThumbError(post.id)}
                  />
                  <Badge
                    variant="outline"
                    className={`absolute top-2 left-2 text-[10px] ${PLATFORM_COLORS[post.platform] ?? ''}`}
                  >
                    {post.platform}
                  </Badge>
                </div>
              ) : (
                <div className="relative aspect-[3/4] overflow-hidden bg-muted flex items-center justify-center">
                  <VideoIcon className="h-8 w-8 text-muted-foreground/40" />
                  <Badge
                    variant="outline"
                    className={`absolute top-2 left-2 text-[10px] ${PLATFORM_COLORS[post.platform] ?? ''}`}
                  >
                    {post.platform}
                  </Badge>
                </div>
              )}

              <CardContent className="p-3 space-y-2">
                {/* Caption + Eval Score */}
                <div className="flex items-start gap-2">
                  <p className="text-sm line-clamp-2 min-h-[2.5rem] flex-1">
                    {post.caption || <span className="text-muted-foreground italic">No caption</span>}
                  </p>
                  {(post.eval_score != null || evalResults[post.id]) && (() => {
                    const score = evalResults[post.id]?.score ?? post.eval_score!
                    return (
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${
                        score >= 8
                          ? 'bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400'
                          : score >= 5
                          ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
                          : 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400'
                      }`} title={`Eval score: ${score}/10`}>
                        {score}/10
                      </span>
                    )
                  })()}
                </div>

                {/* Date */}
                {(post.posted_at || post.created_at) && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.posted_at ?? post.created_at).toLocaleDateString()}
                  </p>
                )}

                {/* Metrics row */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmt(post.views)}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmt(post.likes)}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{fmt(post.comments)}</span>
                  <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{fmt(post.shares)}</span>
                  <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" />{fmt(post.saves)}</span>
                  {post.engagement_rate != null && (
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{post.engagement_rate}%</span>
                  )}
                </div>

                {/* Eval Tags */}
                {(() => {
                  const tags = evalResults[post.id]?.tags ?? post.eval_tags
                  return tags && tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null
                })()}

                {/* Linked idea */}
                {linkedIdea && (
                  <div className="flex items-center gap-1.5 text-xs bg-purple-500/10 rounded-md px-2 py-1.5">
                    <LinkIcon className="h-3 w-3 text-purple-400 shrink-0" />
                    <span className="truncate text-purple-300">{linkedIdea.idea}</span>
                    <button
                      onClick={() => handleUnlink(post.id)}
                      className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                      disabled={linking === post.id}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Linked script */}
                {post.linked_script_id && (() => {
                  const linkedScript = scripts.find(s => s.id === post.linked_script_id)
                  return linkedScript ? (
                    <div className="flex items-center gap-1.5 text-xs bg-blue-500/10 rounded-md px-2 py-1.5">
                      <FileText className="h-3 w-3 text-blue-400 shrink-0" />
                      <span className="truncate text-blue-400">{linkedScript.topic}</span>
                      {linkedScript.eval_score != null && (
                        <span className="shrink-0 text-[10px] font-bold text-blue-400">{linkedScript.eval_score}/10</span>
                      )}
                    </div>
                  ) : null
                })()}

                {/* Script input for manual script entry */}
                {scriptInput === post.id ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                      placeholder="Paste your script here... The more detail, the better your insights."
                      className="w-full text-xs bg-muted dark:bg-white/[0.04] border border-border rounded-lg p-2 resize-none min-h-[80px] text-foreground placeholder:text-muted-foreground"
                      rows={4}
                    />
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleScoreScript(post.id)}
                        disabled={scoring === post.id || !scriptText.trim()}
                      >
                        {scoring === post.id ? (
                          <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Scoring...</>
                        ) : (
                          <><Zap className="h-3 w-3 mr-1" />Score it</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => { setScriptInput(null); setScriptText('') }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  {post.url && (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </a>
                  )}

                  {/* Add script button (only if no script text and no linked script) */}
                  {!post.script_text && !post.linked_script_id && scriptInput !== post.id && !evalResults[post.id] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => { setScriptInput(post.id); setScriptText('') }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Add Script
                    </Button>
                  )}

                  {/* Link to script */}
                  {!post.linked_script_id && scripts.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          disabled={linking === post.id}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Link Script
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto w-64">
                        {scripts.slice(0, 20).map(script => (
                          <DropdownMenuItem
                            key={script.id}
                            onClick={() => handleLinkScript(post.id, script.id)}
                            className="text-xs"
                          >
                            <span className="truncate flex-1">{script.topic}</span>
                            {script.eval_score != null && (
                              <span className="shrink-0 ml-2 text-muted-foreground">{script.eval_score}/10</span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {!linkedIdea && availableIdeas.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs ml-auto"
                          disabled={linking === post.id}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Link Idea
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto w-64">
                        {availableIdeas.slice(0, 20).map(idea => (
                          <DropdownMenuItem
                            key={idea.id}
                            onClick={() => handleLink(post.id, idea.id)}
                            className="text-xs"
                          >
                            <span className="truncate">{idea.idea}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

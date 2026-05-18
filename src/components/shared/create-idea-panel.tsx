'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Eye, Heart, MessageCircle, ExternalLink,
  Loader2, Check, Plus, Bookmark, Send,
} from 'lucide-react'
import { addIdea } from '@/app/actions'
import type { Post } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TagPills, TagEditor } from '@/components/ui/tag-editor'

// ─── Helpers ──────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function engagementRate(post: Post): number | null {
  if (!post.views || post.views === 0) return null
  return ((post.likes + post.comments + post.shares) / post.views) * 100
}

function cleanCaption(raw: string | null): string {
  if (!raw) return ''
  let text = raw.trim()
  const metaMatch = text.match(/^\d[\d,.KMB]+\s*likes?[\s\S]*?:\s*[""“]([\s\S]+)[""”]\s*\.?\s*$/)
  if (metaMatch) return metaMatch[1].trim()
  const metaMatch2 = text.match(/^\d[\d,.KMB]+\s*likes?[\s\S]*?:\s*[""“]([\s\S]+)/)
  if (metaMatch2) return metaMatch2[1].replace(/[""”]\s*\.?\s*$/, '').trim()
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

// ─── Thumbnail ────────────────────────────────────────

function PostThumbnail({ post }: { post: Post }) {
  const [hidden, setHidden] = useState(false)

  if (!post.thumbnail_url || hidden) {
    return (
      <div className="w-24 h-32 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-bold uppercase bg-muted text-muted-foreground border border-border dark:border-white/6">
        {post.platform?.[0] ?? '?'}
      </div>
    )
  }
  return (
    <img
      src={post.thumbnail_url}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setHidden(true)}
      className="w-24 h-32 rounded-xl object-cover shrink-0 bg-muted border border-border dark:border-white/6"
    />
  )
}

// ─── Types ────────────────────────────────────────────

interface IdeaFormState {
  idea: string
  inspirationUrl: string
  hookIdea: string
  scriptSnippet: string
  cta: string
  caption: string
  tags: string[]
}

function emptyForm(url: string, tags: string[]): IdeaFormState {
  return {
    idea: '', inspirationUrl: url, hookIdea: '',
    scriptSnippet: '', cta: '', caption: '', tags: [...tags],
  }
}

// ─── Styling (matches Add/Edit Idea dialogs) ──────────

const fieldInputClass = 'bg-muted dark:bg-[#1e1e2e] border-border text-foreground placeholder:text-muted-foreground/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 rounded-lg'

// ─── Create Idea Panel (side-by-side) ─────────────────

interface CreateIdeaPanelProps {
  post: Post
  allTags: string[]
  onClose: () => void
}

export function CreateIdeaPanel({ post, allTags, onClose }: CreateIdeaPanelProps) {
  const postTags = post.tags ?? []
  const [form, setForm] = useState<IdeaFormState>(() => emptyForm(post.url || '', postTags))
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [justSaved, setJustSaved] = useState(false)

  const combinedTags = [...new Set([...allTags, ...form.tags])].sort()

  function set<K extends keyof IdeaFormState>(key: K, val: IdeaFormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const persist = useCallback(async () => {
    const source = post.is_competitor
      ? `competitor: @${post.competitor_handle || 'unknown'} (${post.platform})`
      : `inspiration: @${post.competitor_handle || 'unknown'} (${post.platform})`
    await addIdea(form.idea.trim(), source, {
      inspiration_url: form.inspirationUrl.trim() || undefined,
      hook_idea: form.hookIdea.trim() || undefined,
      script_snippet: form.scriptSnippet.trim() || undefined,
      cta: form.cta.trim() || undefined,
      caption: form.caption.trim() || undefined,
      tags: form.tags.length > 0 ? form.tags : undefined,
    })
  }, [post, form])

  const handleSave = useCallback(async () => {
    if (!form.idea.trim() || saving) return
    setSaving(true)
    await persist()
    setSaving(false)
    onClose()
  }, [form.idea, saving, persist, onClose])

  const handleSaveAndNew = useCallback(async () => {
    if (!form.idea.trim() || saving) return
    setSaving(true)
    await persist()
    setSaving(false)
    setSavedCount(c => c + 1)
    setForm(prev => emptyForm(prev.inspirationUrl, prev.tags))
    setCaptionExpanded(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2500)
  }, [form.idea, saving, persist])

  // Keyboard: Cmd/Ctrl+Enter to save, Cmd/Ctrl+Shift+Enter to save & new
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) handleSaveAndNew()
        else handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleSaveAndNew])

  const er = engagementRate(post)

  return (
    <div className="flex h-full min-h-0">
      {/* Left — Original Post */}
      <div className="w-[45%] border-r border-border dark:border-white/6 overflow-y-auto min-h-0 p-6 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Original Post</p>
          <div className="flex gap-3">
            <PostThumbnail post={post} />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground leading-snug">{post.title || postTitle(post)}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {post.competitor_handle && (
                  <span className="text-xs text-muted-foreground">@{post.competitor_handle}</span>
                )}
                {post.platform && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
                    post.platform === 'tiktok' ? 'bg-black/80 dark:bg-white/10 text-white border-transparent'
                      : post.platform === 'instagram' ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/30 text-pink-600 dark:text-pink-400'
                      : 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400'
                  }`}>
                    {post.platform}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
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
            <div className={`grid gap-2 ${stats.length > 3 ? 'grid-cols-5' : 'grid-cols-3'}`}>
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center p-2 rounded-lg bg-muted/50 border border-border dark:border-white/6">
                  <Icon size={11} className="mx-auto mb-0.5 text-muted-foreground" />
                  <p className="text-xs font-bold text-foreground">{formatNumber(value)}</p>
                  <p className="text-[8px] uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )
        })()}

        {er != null && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`font-bold ${er >= 5 ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>{er.toFixed(1)}%</span>
            <span className="text-muted-foreground">engagement rate</span>
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-purple-500 dark:text-purple-400 font-bold mb-1">Caption</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {cleanCaption(post.caption)}
            </p>
          </div>
        )}

        {/* Hook */}
        {post.hook_text && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-purple-500 dark:text-purple-400 font-bold mb-1">Hook</p>
            <p className="text-sm text-muted-foreground">{post.hook_text}</p>
          </div>
        )}

        {/* Notes */}
        {post.ai_notes && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-purple-500 dark:text-purple-400 font-bold mb-1">Notes</p>
            <p className="text-sm text-muted-foreground">{post.ai_notes}</p>
          </div>
        )}

        {/* Link */}
        {post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-500 dark:text-purple-400 text-xs font-semibold hover:bg-purple-500/20 hover:border-purple-500/50 transition-all duration-200"
          >
            <ExternalLink size={12} /> View original post
          </a>
        )}
      </div>

      {/* Right — Idea Form (matches the Add/Edit idea box) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-white/6">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              New idea{savedCount > 0 ? <span className="text-muted-foreground font-medium"> · {savedCount} saved</span> : null}
            </h2>
            <div className="h-0.5 w-12 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full mt-1" />
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* ─── Section: Idea ─── */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                Video idea <span className="text-purple-400">*</span>
              </label>
              <Textarea
                placeholder="What's the video about? Topic, angle..."
                value={form.idea}
                onChange={(e) => set('idea', e.target.value)}
                rows={2}
                autoFocus
                className={fieldInputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                Inspiration URL
              </label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://..."
                  value={form.inspirationUrl}
                  onChange={(e) => set('inspirationUrl', e.target.value)}
                  className={`${fieldInputClass} flex-1`}
                />
                {form.inspirationUrl && (
                  <a
                    href={form.inspirationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all shrink-0"
                  >
                    <ExternalLink size={12} />
                    View
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ─── Section: The Script ─── */}
          <div className="rounded-xl border border-border/60 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.02] p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              The Script
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                Hook
              </label>
              <Textarea
                placeholder="Opening line — what makes someone stop scrolling?"
                value={form.hookIdea}
                onChange={(e) => set('hookIdea', e.target.value)}
                rows={2}
                className={fieldInputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                Body
              </label>
              <Textarea
                placeholder="The main content, points, or full script..."
                value={form.scriptSnippet}
                onChange={(e) => set('scriptSnippet', e.target.value)}
                rows={4}
                className={fieldInputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                CTA
              </label>
              <Input
                placeholder="e.g. Follow for more, Comment below..."
                value={form.cta}
                onChange={(e) => set('cta', e.target.value)}
                className={fieldInputClass}
              />
            </div>
          </div>

          {/* ─── Caption (progressive disclosure) ─── */}
          {captionExpanded ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                Caption
              </label>
              <Textarea
                placeholder="Post caption with hashtags..."
                value={form.caption}
                onChange={(e) => set('caption', e.target.value)}
                rows={3}
                className={fieldInputClass}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCaptionExpanded(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <Plus size={12} />
              Add caption
            </button>
          )}

          {/* ─── Tags ─── */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
              Tags
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <TagPills tags={form.tags} />
              <TagEditor tags={form.tags} allTags={combinedTags} onChange={(tags) => set('tags', tags)} />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-6 py-4 border-t border-border dark:border-white/6 space-y-2">
          {justSaved && (
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check size={13} className="text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Idea saved — add another below.</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndNew}
              disabled={!form.idea.trim() || saving}
              className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              Save &amp; add new
            </button>
            <button
              onClick={handleSave}
              disabled={!form.idea.trim() || saving}
              className="flex-1 h-11 rounded-xl bg-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save idea
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

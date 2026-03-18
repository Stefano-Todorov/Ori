'use client'

import { useState } from 'react'
import {
  Eye, Heart, MessageCircle, ExternalLink,
  Loader2, Check, Plus, Bookmark, Send,
} from 'lucide-react'
import { addIdea } from '@/app/actions'
import type { Post } from '@/lib/types'
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

// ─── Types ────────────────────────────────────────────

const VIDEO_TYPES = ['Talking head', 'B-roll', 'Vlog', 'Reaction', 'Trend', 'Educational']
const DIFFICULTY_PILL: Record<string, string> = {
  easy: 'bg-green-600 border-green-500 text-white',
  medium: 'bg-amber-600 border-amber-500 text-white',
  hard: 'bg-red-600 border-red-500 text-white',
}

interface IdeaForm {
  id: string
  idea: string
  inspirationUrl: string
  hookIdea: string
  scriptSnippet: string
  cta: string
  caption: string
  difficulty: 'easy' | 'medium' | 'hard' | ''
  videoType: string
  tags: string[]
  saving: boolean
  saved: boolean
}

function emptyIdeaForm(url: string, tags: string[] = []): IdeaForm {
  return {
    id: crypto.randomUUID(),
    idea: '', inspirationUrl: url, hookIdea: '',
    scriptSnippet: '', cta: '', caption: '',
    difficulty: '', videoType: '', tags: [...tags], saving: false, saved: false,
  }
}

// ─── Create Idea Panel (side-by-side) ─────────────────

interface CreateIdeaPanelProps {
  post: Post
  allTags: string[]
  onClose: () => void
}

export function CreateIdeaPanel({ post, allTags, onClose }: CreateIdeaPanelProps) {
  const postTags = post.tags ?? []
  const [forms, setForms] = useState<IdeaForm[]>([emptyIdeaForm(post.url || '', postTags)])

  const formTags = forms.flatMap(f => f.tags)
  const combinedTags = [...new Set([...allTags, ...formTags])].sort()

  function updateForm(id: string, updates: Partial<IdeaForm>) {
    setForms(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  function addForm() {
    setForms(prev => [...prev, emptyIdeaForm(post.url || '', postTags)])
  }

  function removeForm(id: string) {
    setForms(prev => prev.length > 1 ? prev.filter(f => f.id !== id) : prev)
  }

  async function saveForm(form: IdeaForm) {
    if (!form.idea.trim()) return
    updateForm(form.id, { saving: true })
    const source = post.is_competitor
      ? `competitor: @${post.competitor_handle || 'unknown'} (${post.platform})`
      : `inspiration: @${post.competitor_handle || 'unknown'} (${post.platform})`
    await addIdea(form.idea.trim(), source, {
      inspiration_url: form.inspirationUrl.trim() || undefined,
      hook_idea: form.hookIdea.trim() || undefined,
      script_snippet: form.scriptSnippet.trim() || undefined,
      cta: form.cta.trim() || undefined,
      caption: form.caption.trim() || undefined,
      difficulty: form.difficulty || undefined,
      video_type: form.videoType || undefined,
      tags: form.tags.length > 0 ? form.tags : undefined,
    })
    updateForm(form.id, { saving: false, saved: true })
  }

  async function saveAll() {
    const unsaved = forms.filter(f => !f.saved && f.idea.trim())
    for (const form of unsaved) {
      await saveForm(form)
    }
  }

  const er = engagementRate(post)

  return (
    <div className="flex h-full min-h-0">
      {/* Left — Original Post */}
      <div className="w-[45%] border-r border-border dark:border-white/6 overflow-y-auto min-h-0 p-6 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Original Post</p>
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
                <div key={label} className="text-center p-2 rounded-lg bg-muted/50 dark:bg-[#12121a] border border-border dark:border-white/6">
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

      {/* Right — Idea Forms */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-white/6">
          <div>
            <h2 className="text-lg font-bold text-foreground">New ideas</h2>
            <div className="h-0.5 w-12 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addForm}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border dark:border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-purple-500/40 transition-all"
            >
              <Plus size={12} /> Add another
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <span className="text-lg leading-none">&times;</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {forms.map((form, idx) => (
            <div key={form.id} className={`space-y-3 ${idx > 0 ? 'pt-6 border-t border-border dark:border-white/6' : ''}`}>
              {forms.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Idea {idx + 1}</span>
                  {!form.saved && (
                    <button onClick={() => removeForm(form.id)} className="text-xs text-muted-foreground hover:text-red-500 transition-colors">Remove</button>
                  )}
                </div>
              )}

              {form.saved ? (
                <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check size={14} className="text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Idea saved!</span>
                </div>
              ) : (
                <IdeaFormInline
                  form={form}
                  allTags={combinedTags}
                  urlLocked={!!post.url}
                  onChange={(updates) => updateForm(form.id, updates)}
                  onSave={() => saveForm(form)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="px-6 py-4 border-t border-border dark:border-white/6">
          <button
            onClick={saveAll}
            disabled={!forms.some(f => !f.saved && f.idea.trim())}
            className="w-full h-11 rounded-xl bg-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {forms.some(f => f.saving) ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {forms.filter(f => !f.saved && f.idea.trim()).length > 1 ? `Save ${forms.filter(f => !f.saved && f.idea.trim()).length} ideas` : 'Save idea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Inline Idea Form ─────────────────────────────────

const fieldInputClass = 'bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 rounded-lg'

function IdeaFormInline({ form, allTags, urlLocked, onChange, onSave }: {
  form: IdeaForm
  allTags: string[]
  urlLocked: boolean
  onChange: (updates: Partial<IdeaForm>) => void
  onSave: () => void
}) {
  return (
    <div className="space-y-3">
      {/* Content header with tags */}
      <div className="border-t border-border pt-3 mt-1">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] uppercase tracking-[0.08em] text-[#555570] font-semibold">Content</p>
          <div className="flex items-center gap-1.5">
            <TagPills tags={form.tags} />
            <TagEditor tags={form.tags} allTags={allTags} onChange={(tags) => onChange({ tags })} />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-[0.05em] text-[#a0a0b8] font-medium">
          Video idea <span className="text-purple-400">*</span>
        </label>
        <textarea
          placeholder="What's the video about? Topic, angle..."
          value={form.idea}
          onChange={(e) => onChange({ idea: e.target.value })}
          rows={2}
          autoFocus
          className={`w-full text-sm px-3 py-2 ${fieldInputClass}`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-[0.05em] text-[#a0a0b8] font-medium">Inspiration URL</label>
        <input
          value={form.inspirationUrl}
          onChange={(e) => onChange({ inspirationUrl: e.target.value })}
          className={`w-full text-sm px-3 py-2 h-9 ${fieldInputClass} ${urlLocked ? 'opacity-60' : ''}`}
          readOnly={urlLocked}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-[0.05em] text-[#a0a0b8] font-medium">Hook</label>
        <textarea
          placeholder="Opening line — what makes someone stop scrolling?"
          value={form.hookIdea}
          onChange={(e) => onChange({ hookIdea: e.target.value })}
          rows={2}
          className={`w-full text-sm px-3 py-2 ${fieldInputClass}`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-[0.05em] text-[#a0a0b8] font-medium">Body / Script</label>
        <textarea
          placeholder="The main content, points, or full script..."
          value={form.scriptSnippet}
          onChange={(e) => onChange({ scriptSnippet: e.target.value })}
          rows={4}
          className={`w-full text-sm px-3 py-2 ${fieldInputClass}`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-[0.05em] text-[#a0a0b8] font-medium">CTA</label>
        <input
          placeholder="e.g. Follow for more, Comment below..."
          value={form.cta}
          onChange={(e) => onChange({ cta: e.target.value })}
          className={`w-full text-sm px-3 py-2 h-9 ${fieldInputClass}`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-[0.05em] text-[#a0a0b8] font-medium">Caption</label>
        <textarea
          placeholder="Post caption with hashtags..."
          value={form.caption}
          onChange={(e) => onChange({ caption: e.target.value })}
          rows={2}
          className={`w-full text-sm px-3 py-2 ${fieldInputClass}`}
        />
      </div>

      {/* Settings row */}
      <div className="border-t border-border pt-3 mt-1">
        <p className="text-[9px] uppercase tracking-[0.08em] text-[#555570] font-semibold mb-2">Settings</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.05em] text-[#a0a0b8] font-medium">Difficulty</label>
            <div className="flex gap-1">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ difficulty: form.difficulty === d ? '' : d })}
                  className={`flex-1 py-1.5 text-[10px] rounded-full border font-semibold capitalize transition-all duration-200 ${
                    form.difficulty === d
                      ? DIFFICULTY_PILL[d]
                      : 'bg-muted border-border text-muted-foreground hover:border-purple-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.05em] text-[#a0a0b8] font-medium">Video type</label>
            <select
              value={form.videoType}
              onChange={(e) => onChange({ videoType: e.target.value })}
              className={`w-full text-xs px-2 py-1.5 h-8 ${fieldInputClass}`}
            >
              <option value="">Select...</option>
              {VIDEO_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={!form.idea.trim() || form.saving}
        className="w-full mt-1 h-10 rounded-xl bg-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {form.saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        Save idea
      </button>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, ExternalLink, Trash2, RotateCcw, ChevronDown, ChevronLeft, ChevronRight, Search, Link as LinkIcon, Tag, CalendarPlus, Check, Download, Loader2, X, SlidersHorizontal } from 'lucide-react'
import { addIdea, deleteIdea, updateProductionStatus, updateIdea, bulkDeleteIdeas, bulkUpdateProductionStatus, restoreIdea, updateIdeaTags, schedulePost } from '@/app/actions'
import { downloadVideo } from '@/lib/instagram-download'
import { TagPills, TagEditor, TagFilter } from '@/components/ui/tag-editor'
import type { ContentIdea, ProductionStatus } from '@/lib/types'

interface Props {
  ideas: ContentIdea[]
  allTags: string[]
}

type IdeaStatus = ProductionStatus

const STATUS_PILL: Record<IdeaStatus, string> = {
  new: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  recording: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
  editing: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30',
  ready: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
  posted: 'bg-green-400/15 text-green-400 border-green-400/30',
}

const STATUS_BAR_COLOR: Record<IdeaStatus, string> = {
  new: 'bg-blue-500',
  recording: 'bg-amber-500',
  editing: 'bg-cyan-500',
  ready: 'bg-purple-500',
  posted: 'bg-green-500',
}

const STATUS_LABEL: Record<IdeaStatus, string> = {
  new: 'New',
  recording: 'Recording',
  editing: 'Editing',
  ready: 'Ready to Post',
  posted: 'Posted',
}

// ─── Shared form state ────────────────────────────────────────────────────────

interface IdeaFormState {
  idea: string
  source: string
  inspirationUrl: string
  hookIdea: string
  scriptSnippet: string
  cta: string
  caption: string
  tags: string[]
}

function emptyForm(): IdeaFormState {
  return {
    idea: '', source: '', inspirationUrl: '', hookIdea: '',
    scriptSnippet: '', cta: '', caption: '', tags: [],
  }
}

function formFromIdea(item: ContentIdea): IdeaFormState {
  return {
    idea: item.idea,
    source: item.source ?? '',
    inspirationUrl: item.inspiration_url ?? '',
    hookIdea: item.hook_idea ?? '',
    scriptSnippet: item.script_snippet ?? '',
    cta: item.cta ?? '',
    caption: item.caption ?? '',
    tags: item.tags ?? [],
  }
}

// ─── Shared form fields ───────────────────────────────────────────────────────

const fieldInputClass = 'bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 rounded-lg'

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs uppercase tracking-[0.05em] text-[#a0a0b8]">
      {children}{required && <span className="text-purple-400 ml-0.5">*</span>}
    </Label>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="border-t border-border pt-4 mt-2">
      <p className="text-[10px] uppercase tracking-[0.08em] text-[#555570] font-semibold mb-3">{label}</p>
    </div>
  )
}

function IdeaFormFields({ form, setForm, allTags }: { form: IdeaFormState; setForm: (f: IdeaFormState) => void; allTags: string[] }) {
  function set<K extends keyof IdeaFormState>(key: K, val: IdeaFormState[K]) {
    setForm({ ...form, [key]: val })
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Content */}
      <SectionDivider label="Content" />

      <div className="space-y-2">
        <FormLabel required>Video idea</FormLabel>
        <Textarea
          placeholder="What's the video about? Topic, angle..."
          value={form.idea}
          onChange={(e) => set('idea', e.target.value)}
          rows={2}
          autoFocus
          className={fieldInputClass}
        />
      </div>

      <div className="space-y-2">
        <FormLabel>Inspiration URL</FormLabel>
        <Input
          placeholder="https://..."
          value={form.inspirationUrl}
          onChange={(e) => set('inspirationUrl', e.target.value)}
          className={fieldInputClass}
        />
      </div>

      <div className="space-y-2">
        <FormLabel>Hook</FormLabel>
        <Textarea
          placeholder="Opening line — what makes someone stop scrolling?"
          value={form.hookIdea}
          onChange={(e) => set('hookIdea', e.target.value)}
          rows={2}
          className={fieldInputClass}
        />
      </div>

      <div className="space-y-2">
        <FormLabel>Body / Script</FormLabel>
        <Textarea
          placeholder="The main content, points, or full script..."
          value={form.scriptSnippet}
          onChange={(e) => set('scriptSnippet', e.target.value)}
          rows={5}
          className={fieldInputClass}
        />
      </div>

      <div className="space-y-2">
        <FormLabel>CTA</FormLabel>
        <Input
          placeholder="e.g. Follow for more, Comment below..."
          value={form.cta}
          onChange={(e) => set('cta', e.target.value)}
          className={fieldInputClass}
        />
      </div>

      <div className="space-y-2">
        <FormLabel>Caption</FormLabel>
        <Textarea
          placeholder="Post caption with hashtags..."
          value={form.caption}
          onChange={(e) => set('caption', e.target.value)}
          rows={3}
          className={fieldInputClass}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <FormLabel>Tags</FormLabel>
        <div className="flex items-center gap-2 flex-wrap">
          <TagPills tags={form.tags} />
          <TagEditor tags={form.tags} allTags={allTags} onChange={(tags) => set('tags', tags)} />
        </div>
      </div>

    </div>
  )
}

// ─── Source parsing ──────────────────────────────────────────────────────────

function parseSource(source: string | null): { prefix: string; handle: string; platform: string } | null {
  if (!source) return null
  // "extension: @handle (platform)" or "inspiration: @handle (platform)"
  const m = source.match(/^(extension|inspiration):\s*@?(\S+)\s*\((\w+)\)$/i)
  if (m) return { prefix: m[1], handle: m[2], platform: m[3] }
  return null
}

// ─── Custom checkbox ────────────────────────────────────────────────────────

function IdeaCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-[18px] h-[18px] rounded flex items-center justify-center shrink-0 transition-all duration-150 border-[1.5px] ${
        checked
          ? 'bg-gradient-to-br from-purple-600 to-purple-500 border-purple-500'
          : 'bg-[#1a1a2e] border-white/20 hover:border-purple-500'
      }`}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

// ─── Content section ────────────────────────────────────────────────────────

// ─── Mini Calendar ──────────────────────────────────────────────────────────

function MiniCalendar({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' })

  function dayStr(d: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function isPast(d: number) {
    return dayStr(d) < todayStr
  }

  function prev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }

  function next() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="p-1 rounded hover:bg-white/10 text-[#71717a] hover:text-white transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-[#e4e4e7]">{monthLabel}</span>
        <button onClick={next} className="p-1 rounded hover:bg-white/10 text-[#71717a] hover:text-white transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <span key={d} className="text-[9px] font-medium text-[#52525b] py-1">{d}</span>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const ds = dayStr(d)
          const isSelected = ds === value
          const isToday = ds === todayStr
          const past = isPast(d)
          return (
            <button
              key={d}
              onClick={() => !past && onChange(ds)}
              disabled={past}
              className={`text-[11px] font-medium rounded-md py-1 transition-all ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                  : isToday
                    ? 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/25'
                    : past
                      ? 'text-[#3f3f46] cursor-not-allowed'
                      : 'text-[#a1a1aa] hover:bg-white/10 hover:text-white'
              }`}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Bulk Move Dropdown ──────────────────────────────────────────────────────

function BulkMoveDropdown({ disabled, onSelect }: { disabled: boolean; onSelect: (s: IdeaStatus) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="h-7 px-3 text-xs font-medium rounded-lg bg-[#1a1a2e] border border-white/[0.08] text-[#a1a1aa] hover:text-white hover:border-purple-500/40 transition-all disabled:opacity-50 flex items-center gap-1.5"
      >
        Move to
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#16161e] border border-white/10 rounded-lg shadow-xl py-1 min-w-[120px]">
          {(['new', 'recording', 'editing', 'ready', 'posted'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { onSelect(s); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-[#e4e4e7] hover:bg-purple-500/15 hover:text-white transition-colors"
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Idea card ────────────────────────────────────────────────────────────────

function IdeaCard({
  item,
  selected,
  allTags,
  onToggleSelect,
  onDelete,
  onStatusChange,
  onEdit,
  onTagsChange,
}: {
  item: ContentIdea
  selected: boolean
  allTags: string[]
  onToggleSelect: () => void
  onDelete: () => Promise<void>
  onStatusChange: (status: IdeaStatus) => void
  onEdit: () => void
  onTagsChange: (tags: string[]) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const scheduleRef = useRef<HTMLDivElement>(null)

  async function handleDownload() {
    if (!item.inspiration_url) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const platform = /tiktok\.com/i.test(item.inspiration_url) ? 'tiktok'
        : /instagram\.com/i.test(item.inspiration_url) ? 'instagram' : ''
      const blob = await downloadVideo(item.inspiration_url, platform)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `inspo_${platform || 'clip'}_${Date.now()}.mp4`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }
  const parsed = parseSource(item.source)

  useEffect(() => {
    if (!scheduleOpen) return
    function handle(e: MouseEvent) {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) setScheduleOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [scheduleOpen])

  async function handleDelete() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  async function handleSchedule() {
    if (!scheduleDate) return
    setScheduling(true)
    await schedulePost({
      content_idea_id: item.id,
      title: item.idea,
      scheduled_date: scheduleDate,
    })
    setScheduling(false)
    setScheduled(true)
    setTimeout(() => { setScheduleOpen(false); setScheduled(false); setScheduleDate('') }, 1200)
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-200 mb-2 cursor-pointer ${
        selected
          ? 'border-purple-500/50 bg-[#1a1a2e]/80 ring-1 ring-purple-500/30'
          : 'border-white/[0.06] bg-[#1a1a2e] hover:border-white/[0.12] hover:bg-[#1e1e34]'
      }`}
      style={{ padding: '16px 18px' }}
      onClick={() => onEdit()}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <IdeaCheckbox checked={selected} onChange={onToggleSelect} />
        </div>

        {/* Status accent bar */}
        <div className={`w-[3px] self-stretch rounded-full shrink-0 ${STATUS_BAR_COLOR[item.production_status]}`} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-bold text-[15px] text-white leading-snug">{item.idea}</h3>

          {/* Metadata row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
            {parsed ? (
              <>
                <span className="text-[#71717a]">via {parsed.prefix}:</span>
                <span className="text-purple-400 font-medium">@{parsed.handle}</span>
                <span className="text-[#52525b]">({parsed.platform})</span>
              </>
            ) : item.source ? (
              <span className="text-[#71717a]">via {item.source}</span>
            ) : null}
            {(item.source || item.inspiration_url) && (
              <span className="text-[#3f3f46]">&middot;</span>
            )}
            <span className="text-[#52525b]">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Tags row */}
          <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
            <TagPills tags={item.tags ?? []} />
            <span onClick={(e) => e.stopPropagation()}>
              <TagEditor tags={item.tags ?? []} allTags={allTags} onChange={onTagsChange} />
            </span>
          </div>

          {/* View original + Download buttons */}
          {item.inspiration_url && (
            <div className="flex items-center gap-2 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
              <a
                href={item.inspiration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all"
              >
                <ExternalLink size={13} />
                View original
              </a>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all disabled:opacity-60"
              >
                {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {downloading ? 'Downloading...' : 'Download'}
              </button>
              {downloadError && <span className="text-[11px] text-red-400">{downloadError}</span>}
            </div>
          )}

        </div>

        {/* Right side: thumbnail + actions */}
        <div className="flex items-start gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          {item.thumbnail_url && (
            <a href={item.inspiration_url ?? '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <img
                src={item.thumbnail_url}
                alt=""
                className="w-16 h-20 rounded-lg border border-white/[0.08] object-cover shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).closest('a')!.style.display = 'none'
                }}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement
                  if (img.naturalWidth === 0) img.closest('a')!.style.display = 'none'
                }}
              />
            </a>
          )}
          <div className="flex items-center gap-2">
            <Select value={item.production_status} onValueChange={(v) => onStatusChange(v as IdeaStatus)}>
              <SelectTrigger className={`h-8 w-auto text-[11px] font-semibold rounded-lg px-3 gap-1.5 border ${STATUS_PILL[item.production_status]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['new', 'recording', 'editing', 'ready', 'posted'] as const).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-[#a1a1aa] border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15] transition-all"
            >
              <Pencil size={13} />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <div className="relative" ref={scheduleRef}>
              <button
                type="button"
                onClick={() => setScheduleOpen(!scheduleOpen)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-all ${
                  scheduleOpen
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    : 'text-[#a1a1aa] border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15]'
                }`}
              >
                <CalendarPlus size={13} />
                <span className="hidden sm:inline">Schedule</span>
              </button>
              {scheduleOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#16161e] border border-white/10 rounded-xl shadow-2xl shadow-black/40 p-4 w-64">
                  <p className="text-xs font-semibold text-white mb-3">Schedule this idea</p>
                  <MiniCalendar value={scheduleDate} onChange={setScheduleDate} />
                  <button
                    onClick={handleSchedule}
                    disabled={!scheduleDate || scheduling || scheduled}
                    className="mt-3 w-full h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {scheduled ? <><Check size={12} /> Scheduled!</> : scheduling ? 'Scheduling...' : 'Schedule'}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-[#a1a1aa] border border-white/[0.08] bg-white/[0.03] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/25 transition-all disabled:opacity-50"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Source helpers ───────────────────────────────────────────────────────────

type SourceFilter = 'all' | 'mine' | 'saved' | 'ai'

function getSourceType(item: ContentIdea): SourceFilter {
  const s = item.source ?? ''
  if (s.startsWith('inspiration:') || s.startsWith('extension:')) return 'saved'
  if (s.startsWith('competitor:')) return 'ai'
  return 'mine'
}

const SOURCE_LABEL: Record<SourceFilter, string> = {
  all: 'All Sources',
  mine: 'Created by Me',
  saved: 'From Competitor',
  ai: 'Created by AI',
}

type SortBy = 'date' | 'status' | 'source'

const STATUS_ORDER: Record<IdeaStatus, number> = { new: 0, recording: 1, editing: 2, ready: 3, posted: 4 }

// ─── Collapsible status group ──────────────────────────────────────────────

const STATUS_GROUP_LIMIT = 5

function StatusGroup({
  status,
  ideas,
  defaultOpen = true,
  children,
}: {
  status: IdeaStatus
  ideas: ContentIdea[]
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [showAll, setShowAll] = useState(false)
  const count = ideas.length
  if (count === 0) return null

  const needsTruncation = count > STATUS_GROUP_LIMIT && !showAll
  const visibleChildren = needsTruncation
    ? (children as React.ReactElement[]).slice(0, STATUS_GROUP_LIMIT)
    : children
  const remaining = count - STATUS_GROUP_LIMIT

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 mb-3 py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
      >
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200 ${open ? 'bg-purple-500/20 text-purple-400' : 'bg-white/[0.06] text-[#71717a] group-hover:text-white'}`}>
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`} />
        </span>
        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${STATUS_PILL[status]}`}>
          {STATUS_LABEL[status]}
        </span>
        <span className="text-xs font-medium text-[#71717a] bg-white/[0.05] px-2 py-0.5 rounded-full">{count}</span>
        {!open && <span className="text-[11px] text-[#52525b] ml-auto">Click to expand</span>}
      </button>
      {open && (
        <>
          {visibleChildren}
          {needsTruncation && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full mt-2 py-2.5 rounded-lg border border-dashed border-white/[0.1] text-xs font-medium text-[#a1a1aa] hover:text-white hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
            >
              Show {remaining} more {STATUS_LABEL[status].toLowerCase()} idea{remaining !== 1 ? 's' : ''}
            </button>
          )}
          {showAll && count > STATUS_GROUP_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="w-full mt-2 py-2 text-xs text-[#71717a] hover:text-white transition-colors"
            >
              Show less
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────────────

// ─── localStorage-backed filter state ────────────────────────────────────────

const STORAGE_KEY = 'orianna-ideas-filters'

interface SavedFilters {
  filter: ProductionStatus | 'all'
  sourceFilter: SourceFilter
  tagFilter: string
  sortBy: SortBy
  groupByStatus: boolean
}

const DEFAULT_FILTERS: SavedFilters = {
  filter: 'all',
  sourceFilter: 'all',
  tagFilter: 'all',
  sortBy: 'date',
  groupByStatus: false,
}

function loadFilters(): SavedFilters {
  if (typeof window === 'undefined') return DEFAULT_FILTERS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FILTERS
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) }
  } catch { return DEFAULT_FILTERS }
}

function saveFilters(filters: SavedFilters) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(filters)) } catch {}
}

export function IdeasBoard({ ideas: initialIdeas, allTags: initialAllTags }: Props) {
  const [ideas, setIdeas] = useState(initialIdeas)
  const [hydrated, setHydrated] = useState(false)
  const [filter, setFilter] = useState<ProductionStatus | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [groupByStatus, setGroupByStatus] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadFilters()
    setFilter(saved.filter)
    setSourceFilter(saved.sourceFilter)
    setTagFilter(saved.tagFilter)
    setSortBy(saved.sortBy)
    setGroupByStatus(saved.groupByStatus)
    setHydrated(true)
  }, [])

  // Persist to localStorage on change (skip first render before hydration)
  useEffect(() => {
    if (!hydrated) return
    saveFilters({ filter, sourceFilter, tagFilter, sortBy, groupByStatus })
  }, [hydrated, filter, sourceFilter, tagFilter, sortBy, groupByStatus])

  const hasActiveFilters = filter !== 'all' || sourceFilter !== 'all' || tagFilter !== 'all' || sortBy !== 'date' || groupByStatus || searchQuery.trim() !== ''

  function resetFilters() {
    setFilter('all')
    setSourceFilter('all')
    setTagFilter('all')
    setSortBy('date')
    setGroupByStatus(false)
    setSearchQuery('')
  }

  // Derive live allTags from current ideas state
  const allTags = [...new Set([...initialAllTags, ...ideas.flatMap(i => i.tags ?? [])])].sort()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [recentlyDeleted, setRecentlyDeleted] = useState<ContentIdea[]>([])
  const [showDeleted, setShowDeleted] = useState(false)
  const [bulkAction, setBulkAction] = useState(false)

  // Add dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<IdeaFormState>(emptyForm())
  const [adding, setAdding] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<IdeaFormState>(emptyForm())
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!addForm.idea.trim()) return
    setAdding(true)
    await addIdea(addForm.idea.trim(), addForm.source.trim() || undefined, {
      inspiration_url: addForm.inspirationUrl.trim() || undefined,
      hook_idea: addForm.hookIdea.trim() || undefined,
      script_snippet: addForm.scriptSnippet.trim() || undefined,
      cta: addForm.cta.trim() || undefined,
      caption: addForm.caption.trim() || undefined,
      tags: addForm.tags.length > 0 ? addForm.tags : undefined,
    })
    setIdeas((prev) => [{
      id: crypto.randomUUID(),
      user_id: '',
      idea: addForm.idea.trim(),
      source: addForm.source.trim() || null,
      niche: null,
      inspiration_url: addForm.inspirationUrl.trim() || null,
      thumbnail_url: null,
      hook_idea: addForm.hookIdea.trim() || null,
      script_snippet: addForm.scriptSnippet.trim() || null,
      cta: addForm.cta.trim() || null,
      caption: addForm.caption.trim() || null,
      tags: addForm.tags,
      status: 'new',
      production_status: 'new',
      sort_order: 0,
      linked_post_id: null,
      created_at: new Date().toISOString(),
    }, ...prev])
    setAddForm(emptyForm())
    setAdding(false)
    setAddOpen(false)
  }

  function openEdit(item: ContentIdea) {
    setEditingId(item.id)
    setEditForm(formFromIdea(item))
    setEditOpen(true)
  }

  async function handleEdit() {
    if (!editingId || !editForm.idea.trim()) return
    setSaving(true)
    const fields = {
      idea: editForm.idea.trim(),
      source: editForm.source.trim() || null,
      inspiration_url: editForm.inspirationUrl.trim() || null,
      hook_idea: editForm.hookIdea.trim() || null,
      script_snippet: editForm.scriptSnippet.trim() || null,
      cta: editForm.cta.trim() || null,
      caption: editForm.caption.trim() || null,
      tags: editForm.tags,
    }
    await updateIdea(editingId, fields)
    setIdeas((prev) => prev.map((i) => i.id === editingId ? { ...i, ...fields } : i))
    setSaving(false)
    setEditOpen(false)
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    const item = ideas.find((i) => i.id === id)
    if (item) setRecentlyDeleted((prev) => [item, ...prev])
    await deleteIdea(id)
    setIdeas((prev) => prev.filter((i) => i.id !== id))
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  async function handleStatusChange(id: string, status: IdeaStatus) {
    await updateProductionStatus(id, status)
    setIdeas((prev) => prev.map((i) => i.id === id ? { ...i, production_status: status } : i))
  }

  // ─── Bulk actions ─────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    const filteredIds = filtered.map((i) => i.id)
    const allSelected = filteredIds.every((id) => selected.has(id))
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredIds))
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected)
    const deletedItems = ideas.filter((i) => ids.includes(i.id))
    setRecentlyDeleted((prev) => [...deletedItems, ...prev])
    setBulkAction(true)
    await bulkDeleteIdeas(ids)
    setIdeas((prev) => prev.filter((i) => !ids.includes(i.id)))
    setSelected(new Set())
    setBulkAction(false)
  }

  async function handleBulkStatus(status: IdeaStatus) {
    const ids = Array.from(selected)
    setBulkAction(true)
    await bulkUpdateProductionStatus(ids, status)
    setIdeas((prev) => prev.map((i) => ids.includes(i.id) ? { ...i, production_status: status } : i))
    setSelected(new Set())
    setBulkAction(false)
  }

  // ─── Recently deleted ──────────────────────────────────────────────────────

  async function handleRestore(item: ContentIdea) {
    const restored = await restoreIdea({
      idea: item.idea,
      source: item.source,
      hook_idea: item.hook_idea,
      inspiration_url: item.inspiration_url,
      script_snippet: item.script_snippet,
      cta: item.cta,
      caption: item.caption,
      status: item.status,
    })
    if (restored) {
      setIdeas((prev) => [restored, ...prev])
    } else {
      setIdeas((prev) => [item, ...prev])
    }
    setRecentlyDeleted((prev) => prev.filter((i) => i.id !== item.id))
  }

  function clearRecentlyDeleted() {
    setRecentlyDeleted([])
  }

  // ─── Filtering & sorting ──────────────────────────────────────────────────

  const q = searchQuery.toLowerCase().trim()

  const filtered = ideas
    .filter((i) => filter === 'all' || i.production_status === filter)
    .filter((i) => sourceFilter === 'all' || getSourceType(i) === sourceFilter)
    .filter((i) => tagFilter === 'all' || (i.tags ?? []).includes(tagFilter))
    .filter((i) => !q || i.idea.toLowerCase().includes(q) || (i.source ?? '').toLowerCase().includes(q) || (i.hook_idea ?? '').toLowerCase().includes(q))
    .sort((a, b) => {
      if (sortBy === 'status') return STATUS_ORDER[a.production_status] - STATUS_ORDER[b.production_status]
      if (sortBy === 'source') return (a.source ?? '').localeCompare(b.source ?? '')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const hasSelection = selected.size > 0
  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id))

  function renderCards(items: ContentIdea[]) {
    return items.map((item) => (
      <IdeaCard
        key={item.id}
        item={item}
        selected={selected.has(item.id)}
        allTags={allTags}
        onToggleSelect={() => toggleSelect(item.id)}
        onDelete={() => handleDelete(item.id)}
        onStatusChange={(status) => handleStatusChange(item.id, status)}
        onEdit={() => openEdit(item)}
        onTagsChange={(tags) => {
          setIdeas(prev => prev.map(i => i.id === item.id ? { ...i, tags } : i))
          updateIdeaTags(item.id, tags)
        }}
      />
    ))
  }

  return (
    <>
      {/* ─── Header row ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Ideas</h2>
          <span className="text-xs text-[#52525b] bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-0.5 font-medium">
            {hasActiveFilters ? `${filtered.length} of ${ideas.length}` : ideas.length} idea{(hasActiveFilters ? filtered.length : ideas.length) !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="h-9 px-4 rounded-lg bg-purple-600 text-white text-sm font-bold flex items-center gap-1.5 transition-all duration-200 hover:bg-purple-700"
        >
          <Plus size={16} />
          New idea
        </button>
      </div>

      {/* ─── Toolbar ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.06] bg-[#12121a] p-3 mb-4 space-y-2.5">
        {/* Row 1: Search + Sort + Group + Reset */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-[#1a1a2e] border border-white/[0.08] text-white placeholder:text-[#3f3f46] focus:border-purple-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-white transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-8 w-auto text-xs gap-1.5 bg-[#1a1a2e] border-white/[0.08]">
              <span className="text-[#71717a]">Sort:</span> <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="source">Source</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setGroupByStatus(!groupByStatus)}
            className={`h-8 px-3 text-xs rounded-lg border transition-all ${
              groupByStatus
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                : 'bg-[#1a1a2e] border-white/[0.08] text-[#71717a] hover:text-white hover:border-white/[0.15]'
            }`}
          >
            Group
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-8 px-3 text-xs rounded-lg border border-white/[0.08] bg-[#1a1a2e] text-[#71717a] hover:text-white hover:border-white/[0.15] transition-all flex items-center gap-1.5"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>

        {/* Row 2: Status pills + Source + Tags (all inline) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'new', 'recording', 'editing', 'posted'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`h-7 px-2.5 text-xs font-medium rounded-lg border transition-all ${
                filter === s
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                  : 'bg-transparent border-white/[0.06] text-[#71717a] hover:text-white hover:border-white/[0.15]'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
              {s !== 'all' && (
                <span className="ml-1 opacity-60">
                  {ideas.filter((i) => i.production_status === s).length}
                </span>
              )}
            </button>
          ))}
          <span className="w-px h-5 bg-white/[0.08] mx-1" />
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
            <SelectTrigger className="h-7 w-auto text-xs gap-1.5 bg-transparent border-white/[0.06] hover:border-white/[0.15]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['all', 'mine', 'saved', 'ai'] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {SOURCE_LABEL[s]}{s !== 'all' ? ` (${ideas.filter((i) => getSourceType(i) === s).length})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="w-px h-5 bg-white/[0.08] mx-1" />
          <TagFilter allTags={allTags} activeTag={tagFilter} onChange={setTagFilter} />
        </div>

        {/* Row 3: Select all + bulk actions (only when needed) */}
        <div className="flex items-center gap-3 flex-wrap pt-0.5 border-t border-white/[0.04]">
          <label className="flex items-center gap-2 text-xs text-[#71717a] cursor-pointer select-none">
            <IdeaCheckbox checked={allFilteredSelected} onChange={selectAll} />
            {allFilteredSelected ? 'Deselect all' : 'Select all'}
          </label>

          {hasSelection && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#52525b]">{selected.size} selected</span>

              <BulkMoveDropdown
                disabled={bulkAction}
                onSelect={(status) => handleBulkStatus(status)}
              />

              <button
                onClick={handleBulkDelete}
                disabled={bulkAction}
                className="h-7 px-3 text-xs font-medium rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 size={12} />
                Delete {selected.size}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Cards ───────────────────────────────────────────────── */}
      <div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#1a1a2e] py-16 text-center">
            <p className="text-[#52525b] text-sm">
              {filter === 'all' && !q
                ? 'No ideas yet. Add your first one!'
                : q
                  ? 'No ideas match your search.'
                  : `No ${STATUS_LABEL[filter as IdeaStatus].toLowerCase()} ideas.`}
            </p>
          </div>
        ) : groupByStatus ? (
          <div className="space-y-4">
            {(['new', 'recording', 'editing', 'ready', 'posted'] as const).map((s) => {
              const statusIdeas = filtered.filter((i) => i.production_status === s)
              return (
                <StatusGroup key={s} status={s} ideas={statusIdeas}>
                  {renderCards(statusIdeas)}
                </StatusGroup>
              )
            })}
          </div>
        ) : (
          renderCards(filtered)
        )}
      </div>

      {/* Recently Deleted */}
      {recentlyDeleted.length > 0 && (
        <div className="space-y-3 mt-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDeleted(!showDeleted)}
              className="flex items-center gap-2 text-sm font-medium text-[#71717a] hover:text-white transition-colors"
            >
              <Trash2 size={14} />
              Recently Deleted ({recentlyDeleted.length})
              <ChevronDown size={14} className={`transition-transform ${showDeleted ? 'rotate-180' : ''}`} />
            </button>
            {showDeleted && (
              <button
                onClick={clearRecentlyDeleted}
                className="text-xs text-[#52525b] hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {showDeleted && (
            <div className="space-y-2">
              {recentlyDeleted.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-dashed border-white/[0.08] bg-[#1a1a2e]/50 px-4 py-3 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white">{item.idea}</p>
                    <p className="text-xs text-[#52525b]">
                      {item.source ? `via ${item.source}` : 'My idea'} — {STATUS_LABEL[item.production_status]}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(item)}
                    className="shrink-0 h-7 px-3 text-xs font-medium rounded-lg border border-white/[0.1] text-[#a1a1aa] hover:text-white hover:border-white/[0.2] transition-all flex items-center gap-1"
                  >
                    <RotateCcw size={12} />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) setAddForm(emptyForm()) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border rounded-2xl p-6 shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">New idea</DialogTitle>
            <div className="h-0.5 w-16 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full mt-1" />
          </DialogHeader>
          <IdeaFormFields form={addForm} setForm={setAddForm} allTags={allTags} />
          <button
            onClick={handleAdd}
            disabled={!addForm.idea.trim() || adding}
            className="w-full mt-3 h-12 rounded-xl bg-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Saving...' : 'Save idea'}
          </button>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditingId(null) }}>
        <DialogContent className="!w-[95vw] sm:!w-[70vw] !max-w-[95vw] sm:!max-w-[70vw] max-h-[85vh] overflow-y-auto bg-background border-border rounded-2xl p-4 sm:p-6 shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Edit idea</DialogTitle>
            <div className="h-0.5 w-16 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full mt-1" />
          </DialogHeader>
          {editingId && (() => {
            const editingItem = ideas.find(i => i.id === editingId)
            if (!editingItem) return null
            return (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                <Select
                  value={editingItem.production_status}
                  onValueChange={(v) => {
                    const newStatus = v as IdeaStatus
                    handleStatusChange(editingId, newStatus)
                    setIdeas(prev => prev.map(i => i.id === editingId ? { ...i, production_status: newStatus } : i))
                  }}
                >
                  <SelectTrigger className={`h-8 w-auto text-[11px] font-semibold rounded-lg px-3 gap-1.5 border ${STATUS_PILL[editingItem.production_status]}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['new', 'recording', 'editing', 'ready', 'posted'] as const).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })()}
          <IdeaFormFields form={editForm} setForm={setEditForm} allTags={allTags} />
          <button
            onClick={handleEdit}
            disabled={!editForm.idea.trim() || saving}
            className="w-full mt-3 h-12 rounded-xl bg-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </DialogContent>
      </Dialog>
    </>
  )
}

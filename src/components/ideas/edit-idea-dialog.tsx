'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { ExternalLink, Plus, Copy, Check } from 'lucide-react'
import { TagPills, TagEditor } from '@/components/ui/tag-editor'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { updateIdea, addIdea, schedulePost } from '@/app/actions'
import type { ContentIdea, ProductionStatus } from '@/lib/types'

// ─── Shared constants ────────────────────────────────────────────────────────

const STATUS_PILL: Record<ProductionStatus, string> = {
  new: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  recording: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
  editing: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30',
  ready: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
  posted: 'bg-green-400/15 text-green-400 border-green-400/30',
}

const STATUS_LABEL: Record<ProductionStatus, string> = {
  new: 'New',
  recording: 'Recording',
  editing: 'Editing',
  ready: 'Ready to Post',
  posted: 'Posted',
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface EditIdeaDialogProps {
  idea: ContentIdea | null
  open?: boolean
  allTags?: string[]
  onClose: () => void
  onStatusChange: (ideaId: string, status: ProductionStatus) => void
  /** Called after a successful save with the updated fields */
  onSaved?: (id: string, fields: Record<string, unknown>) => void
  /** Called when user wants to add another idea from same inspiration */
  onAddAnother?: (inspirationUrl: string, source: string, tags: string[]) => void
  /** Called when user wants to duplicate & edit */
  onDuplicate?: (form: IdeaFormState) => void
  /** Called after the idea is added to the posting calendar */
  onScheduled?: () => void
}

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

// ─── Styling ─────────────────────────────────────────────────────────────────

const fieldInputClass = 'bg-muted dark:bg-[#1e1e2e] border-border text-foreground placeholder:text-muted-foreground/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 rounded-lg'

// ─── Component ───────────────────────────────────────────────────────────────

export function EditIdeaDialog({
  idea,
  open: openProp,
  allTags = [],
  onClose,
  onStatusChange,
  onSaved,
  onAddAnother,
  onDuplicate,
  onScheduled,
}: EditIdeaDialogProps) {
  const isOpen = openProp !== undefined ? openProp : !!idea
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<IdeaFormState>({
    idea: '', source: '', inspirationUrl: '', hookIdea: '',
    scriptSnippet: '', cta: '', caption: '', tags: [],
  })
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [justScheduled, setJustScheduled] = useState(false)

  // Sync form state when idea changes
  useEffect(() => {
    if (idea) {
      const f = formFromIdea(idea)
      setForm(f)
      setCaptionExpanded(!!f.caption)
      setScheduleDate('')
      setJustScheduled(false)
    }
  }, [idea?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof IdeaFormState>(key: K, val: IdeaFormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const handleSave = useCallback(() => {
    if (!idea || !form.idea.trim()) return
    startTransition(async () => {
      const fields = {
        idea: form.idea.trim(),
        source: form.source.trim() || null,
        inspiration_url: form.inspirationUrl.trim() || null,
        hook_idea: form.hookIdea.trim() || null,
        script_snippet: form.scriptSnippet.trim() || null,
        cta: form.cta.trim() || null,
        caption: form.caption.trim() || null,
        tags: form.tags,
      }
      await updateIdea(idea.id, fields)
      onSaved?.(idea.id, fields)
      onClose()
    })
  }, [idea, form, onSaved, onClose])

  const handleSaveAndNew = useCallback(() => {
    if (!idea || !form.idea.trim()) return
    startTransition(async () => {
      const fields = {
        idea: form.idea.trim(),
        source: form.source.trim() || null,
        inspiration_url: form.inspirationUrl.trim() || null,
        hook_idea: form.hookIdea.trim() || null,
        script_snippet: form.scriptSnippet.trim() || null,
        cta: form.cta.trim() || null,
        caption: form.caption.trim() || null,
        tags: form.tags,
      }
      await updateIdea(idea.id, fields)
      onSaved?.(idea.id, fields)
      onClose()
      onAddAnother?.(form.inspirationUrl.trim(), form.source.trim(), form.tags)
    })
  }, [idea, form, onSaved, onClose, onAddAnother])

  const handleSaveAndDuplicate = useCallback(() => {
    if (!idea || !form.idea.trim()) return
    startTransition(async () => {
      const fields = {
        idea: form.idea.trim(),
        source: form.source.trim() || null,
        inspiration_url: form.inspirationUrl.trim() || null,
        hook_idea: form.hookIdea.trim() || null,
        script_snippet: form.scriptSnippet.trim() || null,
        cta: form.cta.trim() || null,
        caption: form.caption.trim() || null,
        tags: form.tags,
      }
      await updateIdea(idea.id, fields)
      onSaved?.(idea.id, fields)
      onClose()
      onDuplicate?.(form)
    })
  }, [idea, form, onSaved, onClose, onDuplicate])

  const handleSchedule = useCallback((date: string) => {
    if (!idea || !date) return
    setScheduleDate(date)
    startTransition(async () => {
      await schedulePost({
        content_idea_id: idea.id,
        title: form.idea.trim() || idea.idea,
        scheduled_date: date,
      })
      setJustScheduled(true)
      onScheduled?.()
      setTimeout(() => { setJustScheduled(false); setScheduleDate('') }, 1800)
    })
  }, [idea, form.idea, onScheduled])

  // Keyboard: Cmd/Ctrl+Enter to save, Cmd/Ctrl+Shift+Enter to save & new
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          handleSaveAndNew()
        } else {
          handleSave()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleSave, handleSaveAndNew])

  if (!idea) return null

  const hasSecondaryActions = !!onAddAnother || !!onDuplicate

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border dark:border-white/10 max-h-[90vh] overflow-y-auto p-0">
        {/* ─── Header ─── */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-2.5">
            <DialogTitle className="text-foreground">Edit idea</DialogTitle>
            <Select
              value={idea.production_status}
              onValueChange={(v) => onStatusChange(idea.id, v as ProductionStatus)}
            >
              <SelectTrigger className={`h-7 w-auto text-[11px] font-semibold rounded-lg px-2.5 gap-1 border ${STATUS_PILL[idea.production_status]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['new', 'recording', 'editing', 'ready', 'posted'] as const).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {justScheduled ? (
              <span className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-green-400/15 text-green-500 border border-green-400/30">
                <Check size={12} /> Scheduled
              </span>
            ) : (
              <DatePicker value={scheduleDate} onChange={handleSchedule} compact placeholder="Schedule" />
            )}
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5 mt-4">
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

          {/* ─── Section: Caption (progressive disclosure) ─── */}
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
          {allTags.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                Tags
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <TagPills tags={form.tags} />
                <TagEditor tags={form.tags} allTags={allTags} onChange={(tags) => set('tags', tags)} />
              </div>
            </div>
          )}

          {/* ─── Actions ─── */}
          <div className="pt-2 space-y-2">
            {/* Primary row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                  {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to save
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.idea.trim() || isPending}
                  className="px-5 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold disabled:opacity-50 hover:bg-purple-700 transition-all"
                >
                  {isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Secondary actions */}
            {hasSecondaryActions && (
              <div className="flex items-center gap-2">
                {onAddAnother && (
                  <div className="flex-1 flex items-center gap-1">
                    <button
                      onClick={handleSaveAndNew}
                      disabled={!form.idea.trim() || isPending}
                      className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Plus size={13} />
                      Save & add new
                    </button>
                    <InfoTooltip placement="top" align="end" text="Save this idea and immediately open a blank form to add another one." />
                  </div>
                )}
                {onDuplicate && (
                  <div className="flex-1 flex items-center gap-1">
                    <button
                      onClick={handleSaveAndDuplicate}
                      disabled={!form.idea.trim() || isPending}
                      className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Copy size={13} />
                      Save & duplicate
                    </button>
                    <InfoTooltip placement="top" align="end" text="Save this idea and open a new form pre-filled with the same details — great for variations." />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Idea Dialog (for "add another" / "duplicate" flows) ─────────────────

interface AddIdeaDialogProps {
  open: boolean
  prefill?: Partial<IdeaFormState>
  allTags?: string[]
  onClose: () => void
  onSaved?: () => void
}

export function AddIdeaDialog({
  open,
  prefill,
  allTags = [],
  onClose,
  onSaved,
}: AddIdeaDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<IdeaFormState>({
    idea: '', source: '', inspirationUrl: '', hookIdea: '',
    scriptSnippet: '', cta: '', caption: '', tags: [],
  })
  const [captionExpanded, setCaptionExpanded] = useState(false)

  // Reset form when dialog opens with new prefill
  useEffect(() => {
    if (open) {
      setForm({
        idea: prefill?.idea ?? '',
        source: prefill?.source ?? '',
        inspirationUrl: prefill?.inspirationUrl ?? '',
        hookIdea: prefill?.hookIdea ?? '',
        scriptSnippet: prefill?.scriptSnippet ?? '',
        cta: prefill?.cta ?? '',
        caption: prefill?.caption ?? '',
        tags: prefill?.tags ?? [],
      })
      setCaptionExpanded(!!(prefill?.caption))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof IdeaFormState>(key: K, val: IdeaFormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleSave(keepOpen: boolean) {
    if (!form.idea.trim()) return
    const savedUrl = form.inspirationUrl.trim()
    const savedSource = form.source.trim()
    const savedTags = form.tags
    startTransition(async () => {
      await addIdea(form.idea.trim(), savedSource || undefined, {
        inspiration_url: savedUrl || undefined,
        hook_idea: form.hookIdea.trim() || undefined,
        script_snippet: form.scriptSnippet.trim() || undefined,
        cta: form.cta.trim() || undefined,
        caption: form.caption.trim() || undefined,
        tags: savedTags.length > 0 ? savedTags : undefined,
      })
      onSaved?.()
      if (keepOpen) {
        setForm({
          idea: '', source: savedSource, inspirationUrl: savedUrl,
          hookIdea: '', scriptSnippet: '', cta: '', caption: '',
          tags: savedTags,
        })
        setCaptionExpanded(false)
      } else {
        onClose()
      }
    })
  }

  // Keyboard: Cmd/Ctrl+Enter to save
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSave(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, form]) // eslint-disable-line react-hooks/exhaustive-deps

  const title = prefill?.idea ? 'Duplicate idea' : prefill?.inspirationUrl ? 'Add another idea' : 'New idea'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border dark:border-white/10 max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5 mt-4">
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
          {allTags.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                Tags
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <TagPills tags={form.tags} />
                <TagEditor tags={form.tags} allTags={allTags} onChange={(tags) => set('tags', tags)} />
              </div>
            </div>
          )}

          {/* ─── Actions ─── */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to save
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={!form.idea.trim() || isPending}
                  className="px-5 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold disabled:opacity-50 hover:bg-purple-700 transition-all"
                >
                  {isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1">
                <button
                  onClick={() => handleSave(true)}
                  disabled={!form.idea.trim() || isPending}
                  className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Plus size={13} />
                  Save & add new
                </button>
                <InfoTooltip placement="top" align="end" text="Save this idea and immediately open a blank form to add another one." />
              </div>
              <div className="flex-1 flex items-center gap-1">
                <button
                  onClick={() => {
                    if (!form.idea.trim()) return
                    const savedForm = { ...form }
                    startTransition(async () => {
                      await addIdea(form.idea.trim(), form.source.trim() || undefined, {
                        inspiration_url: form.inspirationUrl.trim() || undefined,
                        hook_idea: form.hookIdea.trim() || undefined,
                        script_snippet: form.scriptSnippet.trim() || undefined,
                        cta: form.cta.trim() || undefined,
                        caption: form.caption.trim() || undefined,
                        tags: form.tags.length > 0 ? form.tags : undefined,
                      })
                      onSaved?.()
                      // Reset with all fields pre-filled (duplicate)
                      setForm({ ...savedForm, idea: savedForm.idea })
                    })
                  }}
                  disabled={!form.idea.trim() || isPending}
                  className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Copy size={13} />
                  Save & duplicate
                </button>
                <InfoTooltip placement="top" align="end" text="Save this idea and open a new form pre-filled with the same details — great for variations." />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

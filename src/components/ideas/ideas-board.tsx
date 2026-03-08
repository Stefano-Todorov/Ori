'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/ui/delete-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, ExternalLink, Trash2, RotateCcw, ChevronDown } from 'lucide-react'
import { addIdea, deleteIdea, updateIdeaStatus, updateIdea, bulkDeleteIdeas, bulkUpdateIdeaStatus, restoreIdea } from '@/app/actions'
import { AiAssistPanel } from '@/components/ideas/ai-assist-panel'
import type { ContentIdea } from '@/lib/types'

interface Props {
  ideas: ContentIdea[]
}

type IdeaStatus = ContentIdea['status']

const STATUS_COLORS: Record<IdeaStatus, string> = {
  new: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  done: 'bg-green-100 text-green-700 hover:bg-green-200',
  archived: 'bg-gray-100 text-gray-500 hover:bg-gray-200',
}

const STATUS_LABEL: Record<IdeaStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  done: 'Done',
  archived: 'Archived',
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

const VIDEO_TYPES = ['Talking head', 'B-roll', 'Vlog', 'Reaction', 'Trend', 'Educational']

// ─── Shared form state ────────────────────────────────────────────────────────

interface IdeaFormState {
  idea: string
  source: string
  inspirationUrl: string
  hookIdea: string
  scriptSnippet: string
  cta: string
  caption: string
  difficulty: 'easy' | 'medium' | 'hard' | ''
  videoType: string
}

function emptyForm(): IdeaFormState {
  return {
    idea: '', source: '', inspirationUrl: '', hookIdea: '',
    scriptSnippet: '', cta: '', caption: '', difficulty: '', videoType: '',
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
    difficulty: item.difficulty ?? '',
    videoType: item.video_type ?? '',
  }
}

// ─── Shared form fields ───────────────────────────────────────────────────────

function IdeaFormFields({ form, setForm }: { form: IdeaFormState; setForm: (f: IdeaFormState) => void }) {
  function set<K extends keyof IdeaFormState>(key: K, val: IdeaFormState[K]) {
    setForm({ ...form, [key]: val })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Video idea *</Label>
        <Textarea
          placeholder="What's the video about? Topic, angle..."
          value={form.idea}
          onChange={(e) => set('idea', e.target.value)}
          rows={2}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Inspiration URL</Label>
        <Input
          placeholder="https://..."
          value={form.inspirationUrl}
          onChange={(e) => set('inspirationUrl', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Hook</Label>
        <Textarea
          placeholder="Opening line — what makes someone stop scrolling?"
          value={form.hookIdea}
          onChange={(e) => set('hookIdea', e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Body / Script</Label>
        <Textarea
          placeholder="The main content, points, or full script..."
          value={form.scriptSnippet}
          onChange={(e) => set('scriptSnippet', e.target.value)}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label>CTA</Label>
        <Input
          placeholder="e.g. Follow for more, Comment below..."
          value={form.cta}
          onChange={(e) => set('cta', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Caption</Label>
        <Textarea
          placeholder="Post caption with hashtags..."
          value={form.caption}
          onChange={(e) => set('caption', e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <div className="flex gap-1.5">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set('difficulty', form.difficulty === d ? '' : d)}
                className={`flex-1 py-1.5 text-xs rounded-md border-2 font-medium capitalize transition-all ${
                  form.difficulty === d ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Video type</Label>
          <Select value={form.videoType} onValueChange={(v) => set('videoType', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Source</Label>
        <Input
          placeholder="e.g. saw on TikTok, from a comment..."
          value={form.source}
          onChange={(e) => set('source', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Idea card ────────────────────────────────────────────────────────────────

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function IdeaCard({
  item,
  selected,
  onToggleSelect,
  onDelete,
  onStatusChange,
  onEdit,
}: {
  item: ContentIdea
  selected: boolean
  onToggleSelect: () => void
  onDelete: () => Promise<void>
  onStatusChange: (status: IdeaStatus) => void
  onEdit: () => void
}) {
  const hasContent = item.hook_idea || item.script_snippet || item.cta || item.caption || item.inspiration_url

  return (
    <Card className={`border-border transition-colors ${selected ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}>
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3 flex-wrap">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1.5 h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-snug">{item.idea}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {item.difficulty && (
                <Badge className={`text-xs ${DIFFICULTY_COLORS[item.difficulty]}`}>{item.difficulty}</Badge>
              )}
              {item.video_type && (
                <Badge variant="secondary" className="text-xs">{item.video_type}</Badge>
              )}
              {item.source && (
                <span className="text-xs text-muted-foreground">via {item.source}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={item.status} onValueChange={(v) => onStatusChange(v as IdeaStatus)}>
              <SelectTrigger className={`h-8 w-auto text-xs font-semibold border-0 rounded-full px-3 gap-1 ${STATUS_COLORS[item.status]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['new', 'in_progress', 'done', 'archived'] as const).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>

        {/* Content sections */}
        {hasContent && (
          <div className="space-y-3">
            {item.inspiration_url && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">URL</p>
                <a
                  href={item.inspiration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline flex items-center gap-1 break-all"
                >
                  {item.inspiration_url}
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              </div>
            )}
            {item.hook_idea && <Section label="Hook" text={item.hook_idea} />}
            {item.script_snippet && <Section label="Body / Script" text={item.script_snippet} />}
            {item.cta && <Section label="CTA" text={item.cta} />}
            {item.caption && <Section label="Caption" text={item.caption} />}
          </div>
        )}

        {!hasContent && (
          <p className="text-xs text-muted-foreground">
            No details yet — click <Pencil size={11} className="inline" /> to fill in hook, body, CTA and more.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Source helpers ───────────────────────────────────────────────────────────

type SourceFilter = 'all' | 'mine' | 'saved' | 'ai'

function getSourceType(item: ContentIdea): SourceFilter {
  const s = item.source ?? ''
  if (s.startsWith('inspiration:')) return 'saved'
  if (s.startsWith('competitor:')) return 'ai'
  return 'mine'
}

const SOURCE_LABEL: Record<SourceFilter, string> = {
  all: 'All Sources',
  mine: 'Created by Me',
  saved: 'From Competitor',
  ai: 'Created by AI',
}

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard'

const DIFFICULTY_LABEL: Record<DifficultyFilter, string> = {
  all: 'All Difficulties',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function IdeasBoard({ ideas: initialIdeas }: Props) {
  const [ideas, setIdeas] = useState(initialIdeas)
  const [filter, setFilter] = useState<IdeaStatus | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')
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
      difficulty: addForm.difficulty || undefined,
      video_type: addForm.videoType || undefined,
    })
    setIdeas((prev) => [{
      id: crypto.randomUUID(),
      user_id: '',
      idea: addForm.idea.trim(),
      source: addForm.source.trim() || null,
      niche: null,
      inspiration_url: addForm.inspirationUrl.trim() || null,
      hook_idea: addForm.hookIdea.trim() || null,
      script_snippet: addForm.scriptSnippet.trim() || null,
      cta: addForm.cta.trim() || null,
      caption: addForm.caption.trim() || null,
      difficulty: (addForm.difficulty || null) as ContentIdea['difficulty'],
      video_type: addForm.videoType || null,
      status: 'new',
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
      difficulty: (editForm.difficulty || null) as ContentIdea['difficulty'],
      video_type: editForm.videoType || null,
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
    await updateIdeaStatus(id, status)
    setIdeas((prev) => prev.map((i) => i.id === id ? { ...i, status } : i))
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
    await bulkUpdateIdeaStatus(ids, status)
    setIdeas((prev) => prev.map((i) => ids.includes(i.id) ? { ...i, status } : i))
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
      difficulty: item.difficulty,
      video_type: item.video_type,
      status: item.status,
    })
    if (restored) {
      setIdeas((prev) => [restored, ...prev])
    } else {
      // Fallback: add back with old data
      setIdeas((prev) => [item, ...prev])
    }
    setRecentlyDeleted((prev) => prev.filter((i) => i.id !== item.id))
  }

  function clearRecentlyDeleted() {
    setRecentlyDeleted([])
  }

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filtered = ideas
    .filter((i) => filter === 'all' || i.status === filter)
    .filter((i) => sourceFilter === 'all' || getSourceType(i) === sourceFilter)
    .filter((i) => difficultyFilter === 'all' || i.difficulty === difficultyFilter)

  const hasSelection = selected.size > 0
  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id))

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'new', 'in_progress', 'done', 'archived'] as const).map((s) => (
              <Button
                key={s}
                variant={filter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? 'All' : STATUS_LABEL[s]}
                {s !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    {ideas.filter((i) => i.status === s).length}
                  </span>
                )}
              </Button>
            ))}
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-2" />
            Add idea
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'mine', 'saved', 'ai'] as const).map((s) => (
            <Button
              key={s}
              variant={sourceFilter === s ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSourceFilter(s)}
            >
              {SOURCE_LABEL[s]}
              {s !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  {ideas.filter((i) => getSourceType(i) === s).length}
                </span>
              )}
            </Button>
          ))}
          <span className="w-px bg-border mx-1" />
          {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
            <Button
              key={d}
              variant={difficultyFilter === d ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDifficultyFilter(d)}
            >
              {DIFFICULTY_LABEL[d]}
              {d !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  {ideas.filter((i) => i.difficulty === d).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Select all + bulk actions bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={selectAll}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            {allFilteredSelected ? 'Deselect all' : 'Select all'}
          </label>

          {hasSelection && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>

              <Select
                value=""
                onValueChange={(v) => handleBulkStatus(v as IdeaStatus)}
              >
                <SelectTrigger className="h-8 w-auto text-xs gap-1" disabled={bulkAction}>
                  <span>Move to</span>
                  <ChevronDown size={12} />
                </SelectTrigger>
                <SelectContent>
                  {(['new', 'in_progress', 'done', 'archived'] as const).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkAction}
              >
                <Trash2 size={14} className="mr-1" />
                Delete {selected.size}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {filter === 'all'
                ? 'No ideas yet. Add your first one!'
                : `No ${filter === 'in_progress' ? 'in progress' : filter} ideas.`}
            </CardContent>
          </Card>
        ) : (
          filtered.map((item) => (
            <IdeaCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onDelete={() => handleDelete(item.id)}
              onStatusChange={(status) => handleStatusChange(item.id, status)}
              onEdit={() => openEdit(item)}
            />
          ))
        )}
      </div>

      {/* Recently Deleted */}
      {recentlyDeleted.length > 0 && (
        <div className="space-y-3 mt-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDeleted(!showDeleted)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 size={14} />
              Recently Deleted ({recentlyDeleted.length})
              <ChevronDown size={14} className={`transition-transform ${showDeleted ? 'rotate-180' : ''}`} />
            </button>
            {showDeleted && (
              <Button variant="ghost" size="sm" onClick={clearRecentlyDeleted} className="text-xs">
                Clear all
              </Button>
            )}
          </div>

          {showDeleted && (
            <div className="space-y-2">
              {recentlyDeleted.map((item) => (
                <Card key={item.id} className="border-dashed opacity-60 hover:opacity-100 transition-opacity">
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.idea}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.source ? `via ${item.source}` : 'My idea'} — {STATUS_LABEL[item.status]}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(item)}
                      className="shrink-0"
                    >
                      <RotateCcw size={14} className="mr-1" />
                      Restore
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) setAddForm(emptyForm()) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New idea</DialogTitle>
          </DialogHeader>
          <IdeaFormFields form={addForm} setForm={setAddForm} />
          <Button onClick={handleAdd} disabled={!addForm.idea.trim() || adding} className="w-full mt-2">
            {adding ? 'Saving...' : 'Save idea'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditingId(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit idea</DialogTitle>
          </DialogHeader>
          <IdeaFormFields form={editForm} setForm={setEditForm} />
          <AiAssistPanel
            idea={editForm.idea}
            context={{
              hook: editForm.hookIdea,
              caption: editForm.caption,
              cta: editForm.cta,
              scriptSnippet: editForm.scriptSnippet,
              inspirationUrl: editForm.inspirationUrl,
            }}
          />
          <Button onClick={handleEdit} disabled={!editForm.idea.trim() || saving} className="w-full mt-2">
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

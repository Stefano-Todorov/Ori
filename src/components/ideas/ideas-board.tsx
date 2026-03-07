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
import { Plus, Pencil, ExternalLink } from 'lucide-react'
import { addIdea, deleteIdea, updateIdeaStatus, updateIdea } from '@/app/actions'
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

const STATUS_NEXT: Record<IdeaStatus, IdeaStatus> = {
  new: 'in_progress',
  in_progress: 'done',
  done: 'archived',
  archived: 'new',
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
  onDelete,
  onStatusCycle,
  onEdit,
}: {
  item: ContentIdea
  onDelete: () => void
  onStatusCycle: () => void
  onEdit: () => void
}) {
  const hasContent = item.hook_idea || item.script_snippet || item.cta || item.caption || item.inspiration_url

  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3 flex-wrap">
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
            <button
              type="button"
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${STATUS_COLORS[item.status]}`}
              onClick={onStatusCycle}
              title="Click to advance status"
            >
              {STATUS_LABEL[item.status]}
            </button>
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

// ─── Main board ───────────────────────────────────────────────────────────────

export function IdeasBoard({ ideas: initialIdeas }: Props) {
  const [ideas, setIdeas] = useState(initialIdeas)
  const [filter, setFilter] = useState<IdeaStatus | 'all'>('all')

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
    await deleteIdea(id)
    setIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  async function handleStatusCycle(id: string, current: IdeaStatus) {
    const next = STATUS_NEXT[current]
    await updateIdeaStatus(id, next)
    setIdeas((prev) => prev.map((i) => i.id === id ? { ...i, status: next } : i))
  }

  const filtered = filter === 'all' ? ideas : ideas.filter((i) => i.status === filter)

  return (
    <>
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
              onDelete={() => handleDelete(item.id)}
              onStatusCycle={() => handleStatusCycle(item.id, item.status)}
              onEdit={() => openEdit(item)}
            />
          ))
        )}
      </div>

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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit idea</DialogTitle>
          </DialogHeader>
          <IdeaFormFields form={editForm} setForm={setEditForm} />
          <Button onClick={handleEdit} disabled={!editForm.idea.trim() || saving} className="w-full mt-2">
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

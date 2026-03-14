'use client'

import { useState, useRef, useEffect } from 'react'
import { Tag, X, Plus, Check } from 'lucide-react'

const TAG_COLORS = [
  'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
]

function tagColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// ─── Tag Pill (display only) ─────────────────────────────

export function TagPill({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${tagColor(name)}`}>
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 hover:opacity-70"
        >
          <X size={8} />
        </button>
      )}
    </span>
  )
}

// ─── Tag Pills Row (for display on cards) ────────────────

export function TagPills({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <TagPill key={t} name={t} />
      ))}
    </div>
  )
}

// ─── Tag Editor (dropdown to add/remove tags) ────────────

interface TagEditorProps {
  tags: string[]
  allTags: string[]
  onChange: (tags: string[]) => void
}

export function TagEditor({ tags, allTags, onChange }: TagEditorProps) {
  const [open, setOpen] = useState(false)
  const [newTag, setNewTag] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  function toggle(tag: string) {
    if (tags.includes(tag)) {
      onChange(tags.filter((t) => t !== tag))
    } else {
      onChange([...tags, tag])
    }
  }

  function addNew() {
    const trimmed = newTag.trim().toLowerCase()
    if (!trimmed) return
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setNewTag('')
  }

  const suggestions = allTags.filter((t) => !tags.includes(t))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
      >
        <Tag size={10} />
        {tags.length > 0 ? tags.length : <Plus size={8} />}
      </button>

      {open && (
        <div
          className="absolute z-50 top-full left-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-lg p-2 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Current tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <TagPill key={t} name={t} onRemove={() => toggle(t)} />
              ))}
            </div>
          )}

          {/* Existing tags to pick from */}
          {suggestions.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">Add tag</p>
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {suggestions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-xs text-foreground hover:bg-muted transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full border ${tagColor(t)}`} />
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create new */}
          <div className="flex gap-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="New tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNew() } }}
              className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={addNew}
              disabled={!newTag.trim()}
              className="px-1.5 py-1 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 disabled:opacity-30 transition-colors"
            >
              <Check size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tag Filter Bar ──────────────────────────────────────

interface TagFilterProps {
  allTags: string[]
  activeTag: string
  onChange: (tag: string) => void
  onDelete?: (tag: string) => void
}

export function TagFilter({ allTags, activeTag, onChange, onDelete }: TagFilterProps) {
  const [editing, setEditing] = useState(false)
  if (allTags.length === 0) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tag size={13} className="text-muted-foreground" />
      <span className="text-xs text-muted-foreground uppercase tracking-wide mr-0.5">Tag:</span>
      <button
        onClick={() => onChange('all')}
        className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
          activeTag === 'all'
            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        All
      </button>
      {allTags.map((tag) => (
        <span key={tag} className="relative inline-flex items-center">
          <button
            onClick={() => !editing && onChange(tag)}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
              activeTag === tag
                ? `border ${tagColor(tag)}`
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            } ${editing ? 'pr-6' : ''}`}
          >
            {tag}
          </button>
          {editing && onDelete && (
            <button
              onClick={() => { if (confirm(`Delete tag "${tag}"? It will be removed from all posts.`)) onDelete(tag) }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-red-500/15 text-red-500 hover:bg-red-500/30 transition-colors"
            >
              <X size={9} />
            </button>
          )}
        </span>
      ))}
      {onDelete && (
        <button
          onClick={() => setEditing(!editing)}
          className={`text-xs font-medium px-2 py-1 rounded-lg transition-all ${
            editing
              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title={editing ? 'Done editing' : 'Manage tags'}
        >
          {editing ? 'Done' : '...'}
        </button>
      )}
    </div>
  )
}

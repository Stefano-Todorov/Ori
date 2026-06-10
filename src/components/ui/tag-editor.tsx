'use client'

import { useState, useRef, useEffect } from 'react'
import { Tag, X, Plus } from 'lucide-react'

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
  /**
   * 'inline' (default) — compact, for cards/lists.
   * 'field' — framed like a form input, for dialogs.
   */
  variant?: 'inline' | 'field'
}

export function TagEditor({ tags, allTags, onChange, variant = 'inline' }: TagEditorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  function add(tag: string) {
    const t = tag.trim().toLowerCase()
    if (!t || tags.includes(t)) { setQuery(''); return }
    onChange([...tags, t])
    setQuery('')
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  const q = query.trim().toLowerCase()
  const suggestions = allTags.filter((t) => !tags.includes(t) && (!q || t.includes(q)))
  const canCreate = q.length > 0 && !tags.includes(q) && !allTags.includes(q)

  const isField = variant === 'field'
  const pillText = isField ? 'text-[11px]' : 'text-[10px]'

  return (
    <div
      className={
        isField
          ? 'relative flex items-center gap-1.5 flex-wrap w-full min-h-10 bg-muted dark:bg-[#1e1e2e] border border-border rounded-lg px-2.5 py-2 transition-colors focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20'
          : 'relative inline-flex items-center gap-1 flex-wrap'
      }
      ref={ref}
      onClick={(e) => { e.stopPropagation(); if (isField && !open) setOpen(true) }}
    >
      {/* Selected tags — removable pills, update instantly */}
      {tags.map((t) => (
        <span
          key={t}
          className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border font-medium ${pillText} ${tagColor(t)}`}
        >
          {t}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(t) }}
            className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label={`Remove ${t}`}
          >
            <X size={isField ? 10 : 9} />
          </button>
        </span>
      ))}

      {/* Add trigger */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed font-medium transition-colors ${pillText} ${
          open
            ? 'border-purple-500/50 text-purple-600 dark:text-purple-400 bg-purple-500/10'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted'
        }`}
      >
        <Plus size={isField ? 12 : 10} />
        {tags.length === 0 && (isField ? 'Add a tag' : 'Tag')}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 top-full left-0 mt-1.5 w-60 bg-card border border-border rounded-xl shadow-xl shadow-black/20 p-2 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or create…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (canCreate) add(query)
                  else if (suggestions.length > 0) add(suggestions[0])
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setOpen(false)
                  setQuery('')
                }
              }}
              className="w-full text-xs bg-muted border border-border rounded-lg pl-7 pr-2 py-1.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {(suggestions.length > 0 || canCreate) ? (
            <div className="max-h-44 overflow-y-auto space-y-0.5">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => add(query)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <Plus size={12} className="text-purple-500 shrink-0" />
                  Create <span className="font-semibold">{q}</span>
                </button>
              )}
              {suggestions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => add(t)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full border shrink-0 ${tagColor(t)}`} />
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/60 text-center py-1.5">
              {allTags.length === 0 ? 'Type to create your first tag' : 'No matching tags'}
            </p>
          )}
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
    <div className="flex items-center gap-1.5 flex-wrap border-t border-border/50 dark:border-white/5 pt-2.5">
      <Tag size={12} className="text-muted-foreground/60" />
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold mr-0.5">Tags</span>
      <button
        onClick={() => onChange('all')}
        className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
          activeTag === 'all'
            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-background dark:hover:bg-white/5'
        }`}
      >
        All
      </button>
      {allTags.map((tag) => (
        <span key={tag} className="relative inline-flex items-center">
          <button
            onClick={() => !editing && onChange(tag)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
              activeTag === tag
                ? `border ${tagColor(tag)}`
                : 'text-muted-foreground hover:text-foreground hover:bg-background dark:hover:bg-white/5'
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
          className={`text-[11px] font-medium px-2 py-1 rounded-md transition-all ${
            editing
              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
              : 'text-muted-foreground hover:text-foreground hover:bg-background dark:hover:bg-white/5'
          }`}
          title={editing ? 'Done editing' : 'Manage tags'}
        >
          {editing ? 'Done' : '...'}
        </button>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X } from 'lucide-react'
import { addSwipePost } from '@/app/actions'

const PLATFORMS = ['tiktok', 'instagram', 'youtube']

export function AddSwipeButton() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState('tiktok')
  const [notes, setNotes] = useState('')
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!url.trim()) return
    setLoading(true)
    await addSwipePost({
      url: url.trim(),
      platform,
      caption: notes.trim() || undefined,
      competitor_handle: handle.trim() || undefined,
    })
    setUrl('')
    setNotes('')
    setHandle('')
    setPlatform('tiktok')
    setLoading(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold shadow-md shadow-purple-500/20 hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200"
      >
        <Plus size={16} />
        Add video
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background dark:bg-[#16161e] border border-border dark:border-white/10 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.1)] w-full max-w-md space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Add to Swipe File</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
            Video URL <span className="text-purple-500">*</span>
          </label>
          <Input
            placeholder="https://www.tiktok.com/@..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            className="bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Platform</label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all duration-150 ${
                  platform === p
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20 border border-transparent'
                    : 'bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground hover:border-purple-500 hover:text-foreground'
                }`}
              >
                {p === 'youtube' ? 'YouTube' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Why does this work?</label>
          <Textarea
            placeholder="What makes this video effective? Hook style, editing, topic angle..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
            Creator handle
            <span className="text-[10px] font-medium normal-case tracking-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground/60">optional</span>
          </label>
          <Input
            placeholder="@username"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
          />
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-border dark:border-white/10 text-sm font-medium text-foreground hover:bg-muted dark:hover:bg-white/5 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim() || loading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold shadow-md shadow-purple-500/20 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

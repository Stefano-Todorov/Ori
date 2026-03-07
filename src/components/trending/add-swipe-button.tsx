'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} className="mr-2" />
        Add video
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add to Swipe File</h2>
          <button type="button" onClick={() => setOpen(false)}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-2">
          <Label>Video URL *</Label>
          <Input
            placeholder="https://www.tiktok.com/@..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>Platform</Label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-md border-2 text-sm font-medium capitalize transition-colors ${
                  platform === p ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                }`}
              >
                {p === 'youtube' ? 'YouTube' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Why does this work? (notes)</Label>
          <Textarea
            placeholder="What makes this video effective? Hook style, editing, topic angle..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Creator handle (optional)</Label>
          <Input
            placeholder="@username"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!url.trim() || loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

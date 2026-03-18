'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import { addCompetitor } from '@/app/actions'
import { useRouter } from 'next/navigation'

export function AddCompetitorButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState('')
  const [handle, setHandle] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  async function handleAdd() {
    if (!platform || !handle.trim()) return
    setLoading(true)
    setError(null)

    const result = await addCompetitor({
      handle: handle.trim(),
      platform: platform as 'tiktok' | 'instagram' | 'youtube',
      profile_url: profileUrl.trim() || undefined,
      notes: notes || undefined,
    })

    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }

    setOpen(false)
    setHandle('')
    setPlatform('')
    setProfileUrl('')
    setNotes('')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all duration-200"
      >
        <Plus size={16} />
        Add competitor
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background dark:bg-[#16161e] border-border dark:border-white/10 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add a competitor</DialogTitle>
            <DialogDescription>Track their content to find what works in your niche.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Select platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
                Handle / username <span className="text-purple-500">*</span>
              </label>
              <Input placeholder="@username" value={handle} onChange={(e) => setHandle(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
                Profile URL
                <span className="text-[10px] font-medium normal-case tracking-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground/60">optional</span>
              </label>
              <Input placeholder="https://www.tiktok.com/@username" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground flex items-center gap-2">
                Notes
                <span className="text-[10px] font-medium normal-case tracking-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground/60">optional</span>
              </label>
              <Textarea placeholder="e.g. Similar niche, great hooks..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              onClick={handleAdd}
              disabled={!platform || !handle.trim() || loading}
              className="w-full h-11 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add competitor'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

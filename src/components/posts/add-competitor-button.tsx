'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function AddCompetitorButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState('')
  const [handle, setHandle] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!platform || !handle.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('competitors').upsert({
      user_id: user.id,
      platform,
      handle: handle.replace('@', '').trim(),
      profile_url: profileUrl.trim() || null,
      notes: notes || null,
    })

    setOpen(false)
    setHandle('')
    setPlatform('')
    setProfileUrl('')
    setNotes('')
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} className="mr-2" />
        Add competitor
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a competitor</DialogTitle>
            <DialogDescription>Track their content to find what works in your niche.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Handle / username</Label>
              <Input
                placeholder="@username"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Profile URL (optional)</Label>
              <Input
                placeholder="https://www.tiktok.com/@username"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="e.g. Similar niche, great hooks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <Button onClick={handleAdd} disabled={!platform || !handle.trim() || loading} className="w-full">
              {loading ? 'Adding...' : 'Add competitor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

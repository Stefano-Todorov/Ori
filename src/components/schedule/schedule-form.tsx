'use client'

import { useState, useRef, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { createScheduledPost } from '@/app/actions'
import type { SocialAccount, Platform } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  accounts: SocialAccount[]
}

const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube Shorts',
  tiktok: 'TikTok',
  instagram: 'Instagram',
}

export function ScheduleForm({ accounts }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const [selectedAccount, setSelectedAccount] = useState<SocialAccount | null>(
    accounts.length === 1 ? accounts[0] : null
  )
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>No connected accounts yet.</p>
          <p className="text-sm mt-1">Go to <strong>Settings → Connected Accounts</strong> to connect YouTube, TikTok, or Instagram.</p>
        </CardContent>
      </Card>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!selectedAccount) return setError('Select a platform account')
    if (!caption.trim()) return setError('Caption is required')
    if (!scheduledAt) return setError('Schedule time is required')
    if (!videoFile) return setError('Upload a video file')

    if (new Date(scheduledAt) <= new Date()) {
      return setError('Scheduled time must be in the future')
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const ext = videoFile.name.split('.').pop()
      const path = `${selectedAccount.user_id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('scheduled-videos')
        .upload(path, videoFile, { upsert: false })

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

      const hashtagList = hashtags
        .split(/[\s,#]+/)
        .map(h => h.trim())
        .filter(Boolean)

      const { data: publicUrlData } = supabase.storage
        .from('scheduled-videos')
        .getPublicUrl(path)

      setUploading(false)

      startTransition(async () => {
        const result = await createScheduledPost({
          platform: selectedAccount.platform,
          social_account_id: selectedAccount.id,
          caption: caption.trim(),
          hashtags: hashtagList,
          video_storage_path: path,
          video_public_url: publicUrlData?.publicUrl ?? undefined,
          scheduled_at: new Date(scheduledAt).toISOString(),
        })

        if (result?.error) {
          setError(result.error)
          return
        }

        setSuccess(true)
        setCaption('')
        setHashtags('')
        setScheduledAt('')
        setVideoFile(null)
        if (fileRef.current) fileRef.current.value = ''
        setTimeout(() => setSuccess(false), 3000)
        router.refresh()
      })
    } catch (err) {
      setUploading(false)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const isLoading = uploading || isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule a post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAccount(a)}
                  className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
                    selectedAccount?.id === a.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {PLATFORM_LABELS[a.platform]}
                  {a.display_name && <span className="ml-1 text-muted-foreground">({a.display_name})</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Video file</Label>
            <Input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            {videoFile && (
              <p className="text-xs text-muted-foreground">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post caption..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Hashtags</Label>
            <Input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="fitness gym motivation (space or comma separated)"
            />
          </div>

          <div className="space-y-2">
            <Label>Schedule for</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Post scheduled successfully!</p>}

          <Button type="submit" disabled={isLoading} className="w-full">
            {uploading ? 'Uploading video...' : isPending ? 'Scheduling...' : 'Schedule post'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

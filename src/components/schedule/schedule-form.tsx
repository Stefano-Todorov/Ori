'use client'

import { useState, useRef, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { createScheduledPost } from '@/app/actions'
import type { SocialAccount, Platform } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'

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

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  if (accounts.length === 0) {
    return (
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-10 text-center text-muted-foreground">
        <p className="font-medium text-foreground">No connected accounts yet.</p>
        <p className="text-sm mt-1">Go to <strong>Settings &rarr; Connected Accounts</strong> to connect YouTube, TikTok, or Instagram.</p>
      </div>
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
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-5">
      <p className="text-sm font-bold text-foreground">Schedule a post</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2.5">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Platform</label>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAccount(a)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  selectedAccount?.id === a.id
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20 border border-transparent'
                    : 'bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground hover:border-purple-500 hover:text-foreground'
                }`}
              >
                {PLATFORM_LABELS[a.platform]}
                {a.display_name && <span className="ml-1 opacity-70">({a.display_name})</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Video file</label>
          <div
            className="border-2 border-dashed border-border dark:border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/[0.02] transition-all duration-150"
            onClick={() => fileRef.current?.click()}
          >
            {videoFile ? (
              <p className="text-sm font-medium text-foreground">{videoFile.name} <span className="text-muted-foreground">({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</span></p>
            ) : (
              <>
                <Upload size={20} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to select a video file</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Caption</label>
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write your post caption..." rows={4} className={inputClass} />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Hashtags</label>
          <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="fitness gym motivation (space or comma separated)" className={inputClass} />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Schedule for</label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} className={inputClass} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400 font-medium">Post scheduled successfully!</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {uploading ? 'Uploading video...' : isPending ? 'Scheduling...' : 'Schedule post'}
        </button>
      </form>
    </div>
  )
}

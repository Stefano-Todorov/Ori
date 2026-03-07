'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Loader2, Link, ImageIcon, X } from 'lucide-react'
import { addCompetitorPost } from '@/app/actions'
import { useRouter } from 'next/navigation'
import type { Platform } from '@/lib/types'

interface Props {
  handle: string
  platform: Platform
}

type Tab = 'url' | 'screenshot'

export function AddPostButton({ handle, platform }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('screenshot')
  const [isPending, startTransition] = useTransition()

  // URL fetch state
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchMsg, setFetchMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Screenshot state
  const [screenshot, setScreenshot] = useState<{ base64: string; mediaType: string; preview: string } | null>(null)
  const [reading, setReading] = useState(false)
  const [readMsg, setReadMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Form fields
  const [caption, setCaption] = useState('')
  const [hookText, setHookText] = useState('')
  const [views, setViews] = useState('')
  const [likes, setLikes] = useState('')
  const [comments, setComments] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  function resetForm() {
    setUrl('')
    setCaption('')
    setHookText('')
    setViews('')
    setLikes('')
    setComments('')
    setFetchMsg(null)
    setReadMsg(null)
    setScreenshot(null)
    setSaveError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose() {
    setOpen(false)
    resetForm()
  }

  function applyExtracted(data: Record<string, unknown>) {
    if (data.caption && typeof data.caption === 'string') setCaption(data.caption)
    if (data.hook_text && typeof data.hook_text === 'string') setHookText(data.hook_text)
    if (data.views != null) setViews(String(data.views))
    if (data.likes != null) setLikes(String(data.likes))
    if (data.comments != null) setComments(String(data.comments))
  }

  async function handleFetchUrl() {
    if (!url.trim()) return
    setFetching(true)
    setFetchMsg(null)
    try {
      const res = await fetch(`/api/competitors/extract?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      applyExtracted(data)
      const gotSomething = data.caption || data.views != null
      setFetchMsg({
        ok: gotSomething,
        text: gotSomething
          ? '✓ Data extracted — review and edit below'
          : 'Could not extract stats — fill in manually below',
      })
    } catch {
      setFetchMsg({ ok: false, text: 'Could not reach URL — fill in manually below' })
    } finally {
      setFetching(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      // dataUrl = "data:image/jpeg;base64,XXXX"
      const [meta, base64] = dataUrl.split(',')
      const mediaType = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      setScreenshot({ base64, mediaType, preview: dataUrl })
      setReadMsg(null)
    }
    reader.readAsDataURL(file)
  }

  async function handleReadScreenshot() {
    if (!screenshot) return
    setReading(true)
    setReadMsg(null)
    try {
      const res = await fetch('/api/competitors/extract-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: screenshot.base64, mediaType: screenshot.mediaType }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      applyExtracted(data)
      setReadMsg({ ok: true, text: '✓ Stats extracted — review and edit below' })
    } catch (err) {
      setReadMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to read screenshot' })
    } finally {
      setReading(false)
    }
  }

  function handleSubmit() {
    setSaveError(null)
    startTransition(async () => {
      const result = await addCompetitorPost({
        competitor_handle: handle,
        platform,
        caption: caption || undefined,
        hook_text: hookText || undefined,
        url: url || undefined,
        views: views ? Number(views) : undefined,
        likes: likes ? Number(likes) : undefined,
        comments: comments ? Number(comments) : undefined,
      })
      if (result?.error) { setSaveError(result.error); return }
      handleClose()
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} className="mr-1" />
        Add post
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add post from @{handle}</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setTab('screenshot')}
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'screenshot' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <ImageIcon size={14} />
              Screenshot
            </button>
            <button
              type="button"
              onClick={() => setTab('url')}
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Link size={14} />
              URL
            </button>
          </div>

          <div className="space-y-4">
            {/* Screenshot tab */}
            {tab === 'screenshot' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Take a screenshot of the post on your phone or browser, then upload it. Claude will read the stats directly from the image.
                </p>
                {screenshot ? (
                  <div className="relative">
                    <img
                      src={screenshot.preview}
                      alt="Screenshot preview"
                      className="w-full max-h-48 object-contain rounded-lg border"
                    />
                    <button
                      onClick={() => { setScreenshot(null); setReadMsg(null); if (fileRef.current) fileRef.current.value = '' }}
                      className="absolute top-2 right-2 bg-background rounded-full p-1 border shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <ImageIcon size={20} className="text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">Click to upload screenshot</span>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                )}
                {screenshot && (
                  <Button onClick={handleReadScreenshot} disabled={reading} className="w-full" variant="outline">
                    {reading ? <><Loader2 size={14} className="mr-2 animate-spin" />Reading...</> : '✦ Read stats with AI'}
                  </Button>
                )}
                {readMsg && (
                  <p className={`text-xs ${readMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {readMsg.text}
                  </p>
                )}
              </div>
            )}

            {/* URL tab */}
            {tab === 'url' && (
              <div className="space-y-2">
                <Label>Post URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={`https://www.${platform}.com/...`}
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setFetchMsg(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleFetchUrl() }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleFetchUrl} disabled={!url.trim() || fetching} className="shrink-0">
                    {fetching ? <Loader2 size={14} className="animate-spin" /> : 'Fetch'}
                  </Button>
                </div>
                {fetchMsg && (
                  <p className={`text-xs ${fetchMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {fetchMsg.text}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Works best for YouTube (full stats). TikTok/Instagram return caption only — use the Screenshot tab for stats.
                </p>
              </div>
            )}

            {/* Manual fields */}
            <div className="space-y-3 pt-1 border-t">
              <div className="space-y-2">
                <Label>Caption</Label>
                <Textarea
                  placeholder="What the video is about..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Hook (opening line)</Label>
                <Input
                  placeholder="The first line that grabbed attention..."
                  value={hookText}
                  onChange={(e) => setHookText(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Views</Label>
                  <Input type="number" placeholder="0" value={views} onChange={(e) => setViews(e.target.value)} min={0} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Likes</Label>
                  <Input type="number" placeholder="0" value={likes} onChange={(e) => setLikes(e.target.value)} min={0} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Comments</Label>
                  <Input type="number" placeholder="0" value={comments} onChange={(e) => setComments(e.target.value)} min={0} />
                </div>
              </div>
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <Button onClick={handleSubmit} disabled={isPending || (!caption && !url && !screenshot)} className="w-full">
              {isPending ? 'Saving...' : 'Save post'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

const HOW_TO: Record<string, { title: string; steps: string[] }> = {
  tiktok: {
    title: 'Export from TikTok Studio',
    steps: [
      'Go to TikTok Studio at studio.tiktok.com and sign in',
      'Click "Analytics" in the left sidebar',
      'At the top right, click "Export data"',
      'Select the date range you want (up to 365 days)',
      'Choose "Video data" and click "Export"',
      'Download the .xlsx file — open it in Excel/Google Sheets, then export as CSV',
    ],
  },
  instagram: {
    title: 'Export from Meta Business Suite',
    steps: [
      'Go to business.facebook.com and select your Instagram account',
      'Click "Insights" in the left menu',
      'Select "Content" tab at the top',
      'Set your desired date range using the filter',
      'Click "Export" (top right of the content table)',
      'Choose CSV format and download',
    ],
  },
  youtube: {
    title: 'Export from YouTube Studio',
    steps: [
      'Go to studio.youtube.com and sign in',
      'Click "Analytics" in the left sidebar',
      'Click the "Advanced mode" link (bottom right of the overview)',
      'Set your date range at the top',
      'Click the download icon (top right) → "Export current view as CSV"',
      'The file downloads immediately',
    ],
  },
}

export function ImportCsvButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHowTo, setShowHowTo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    if (!file || !platform) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('platform', platform)

    const res = await fetch('/api/posts/upload-csv', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Import failed')
    } else {
      setResult(data)
      router.refresh()
    }
    setLoading(false)
  }

  function handleClose() {
    setOpen(false)
    setFile(null)
    setPlatform('')
    setResult(null)
    setError(null)
    setShowHowTo(false)
  }

  const howTo = platform ? HOW_TO[platform] : null

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload size={16} className="mr-2" />
        Import CSV
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import post analytics</DialogTitle>
            <DialogDescription>
              Export your analytics CSV from TikTok, Instagram, or YouTube Studio and upload it here.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="text-green-500" size={48} />
              <p className="text-lg font-semibold">
                {result.imported} posts imported!
              </p>
              <Button onClick={handleClose}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v) => { setPlatform(v); setShowHowTo(true) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* How-to guide — auto-expands when platform is selected */}
              {howTo && (
                <div className="rounded-lg border bg-muted/40 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/60 transition-colors"
                    onClick={() => setShowHowTo(!showHowTo)}
                  >
                    <span>How to get your CSV from {platform === 'youtube' ? 'YouTube' : platform === 'tiktok' ? 'TikTok' : 'Instagram'}</span>
                    {showHowTo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showHowTo && (
                    <div className="px-4 pb-4">
                      <p className="text-xs font-semibold text-primary mb-3">{howTo.title}</p>
                      <ol className="space-y-2">
                        {howTo.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-xs text-muted-foreground">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px]">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>CSV File</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {file ? (
                    <p className="text-sm font-medium">{file.name}</p>
                  ) : (
                    <>
                      <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                onClick={handleImport}
                disabled={!file || !platform || loading}
                className="w-full"
              >
                {loading ? 'Importing...' : 'Import'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

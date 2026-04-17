'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { refreshKeepScroll } from '@/lib/router-utils'

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
      refreshKeepScroll(router)
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
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border dark:border-white/10 text-foreground text-sm font-medium hover:bg-muted dark:hover:bg-white/5 transition-all duration-150"
      >
        <Upload size={14} />
        Import CSV
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true) }}>
        <DialogContent className="max-w-lg bg-background dark:bg-[#16161e] border-border dark:border-white/10 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Import post analytics</DialogTitle>
            <DialogDescription>
              Export your analytics CSV from TikTok or Instagram and upload it here.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="text-green-500" size={48} />
              <p className="text-lg font-bold text-foreground">
                {result.imported} posts imported!
              </p>
              <button
                onClick={handleClose}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Platform</label>
                <Select value={platform} onValueChange={(v) => { setPlatform(v); setShowHowTo(true) }}>
                  <SelectTrigger className="bg-muted dark:bg-[#1e1e2e] border-border rounded-lg">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {howTo && (
                <div className="rounded-xl border border-border bg-muted/40 dark:bg-[#1a1a2e] overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/60 dark:hover:bg-[#1e1e38] transition-colors"
                    onClick={() => setShowHowTo(!showHowTo)}
                  >
                    <span>How to get your CSV from {platform === 'tiktok' ? 'TikTok' : 'Instagram'}</span>
                    {showHowTo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showHowTo && (
                    <div className="px-4 pb-4">
                      <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-3">{howTo.title}</p>
                      <ol className="space-y-2">
                        {howTo.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-xs text-muted-foreground">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-[10px]">
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
                <label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">CSV File</label>
                <div
                  className="border-2 border-dashed border-border dark:border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/[0.02] transition-all duration-150"
                  onClick={() => fileRef.current?.click()}
                >
                  {file ? (
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                  ) : (
                    <>
                      <Upload size={20} className="mx-auto mb-2 text-muted-foreground" />
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

              <button
                onClick={handleImport}
                disabled={!file || !platform || loading}
                className="w-full h-11 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Importing...' : 'Import'}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

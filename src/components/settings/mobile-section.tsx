'use client'

import { useEffect, useState } from 'react'
import { Smartphone, Copy, Check, RefreshCw, Loader2, ExternalLink } from 'lucide-react'
import { getOrCreateShareToken, regenerateShareToken } from '@/app/actions'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://ori-nine.vercel.app'

export function MobileSection() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<'token' | 'url' | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    getOrCreateShareToken().then(r => {
      setToken(r.token)
      setLoading(false)
    })
  }, [])

  const shareUrl = token ? `${SITE_URL}/api/share?token=${token}` : ''

  async function copy(text: string, kind: 'token' | 'url') {
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  async function regen() {
    if (!confirm('Regenerate token? Your existing iOS Shortcut will stop working until you update it.')) return
    setRegenerating(true)
    const r = await regenerateShareToken()
    setToken(r.token)
    setRegenerating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Smartphone size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Save from your phone</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Share videos directly from TikTok, Instagram, or YouTube into your Inspiration tab — without leaving the app.
            </p>
          </div>
        </div>

        <div className="space-y-3 mt-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your share URL</label>
            <div className="flex gap-2 mt-1.5">
              <input
                readOnly
                value={shareUrl}
                onFocus={e => e.currentTarget.select()}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted/50 border border-border font-mono"
              />
              <button
                onClick={() => copy(shareUrl, 'url')}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-1.5"
              >
                {copied === 'url' ? <Check size={14} /> : <Copy size={14} />}
                {copied === 'url' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Keep this private — it acts like a password.</p>
          </div>

          <button
            onClick={regen}
            disabled={regenerating}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Regenerate token
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">iOS</span>
          Set up the Shortcut (one-time, ~30 sec)
        </h3>

        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">1</span>
            <div>
              Open the <strong>Shortcuts</strong> app on your iPhone (built into iOS — no download needed).
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">2</span>
            <div>
              Tap <strong>+</strong> to create a new Shortcut. Name it <em>"Save to Orianna"</em>.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">3</span>
            <div>
              Tap the settings icon (ⓘ) → enable <strong>"Use as Quick Action"</strong> → <strong>"Show in Share Sheet"</strong> → set <strong>"Receive"</strong> to <em>URLs</em>.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">4</span>
            <div>
              Add action <strong>"Get Contents of URL"</strong>. Set URL to your share URL above (tap Copy first), method <strong>POST</strong>, request body <strong>JSON</strong> with key <code className="text-xs px-1 py-0.5 rounded bg-muted">url</code> set to <em>Shortcut Input</em>.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">5</span>
            <div>
              (Optional) Add a <strong>"Show Notification"</strong> action after, with text <em>"Saved to Orianna ✓"</em>.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">6</span>
            <div>
              Done. Now in TikTok/Instagram/YouTube: tap <strong>Share</strong> → scroll → <strong>Save to Orianna</strong>. The video lands in your Inspiration tab instantly.
            </div>
          </li>
        </ol>
      </div>

      <div className="rounded-xl border border-border bg-background p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="inline-flex items-center justify-center px-2 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">Android</span>
          Quick test
        </h3>
        <p className="text-sm text-muted-foreground">
          Android share-sheet support is coming. For now, you can test the endpoint from any device — open the URL below in your browser with a video URL appended:
        </p>
        <div className="rounded-lg bg-muted/50 border border-border p-3 font-mono text-xs break-all">
          {shareUrl}&url=https://www.tiktok.com/@username/video/1234567890
        </div>
        <a
          href="https://support.apple.com/guide/shortcuts/intro-to-shortcuts-apd163b0ba38/ios"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          Apple Shortcuts guide <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}

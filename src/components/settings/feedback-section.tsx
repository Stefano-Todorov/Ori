'use client'

import { useState, useEffect } from 'react'
import { Bug, Lightbulb, MessageSquare, Send, Check, Loader2, Clock } from 'lucide-react'
import { submitFeedback, getUserFeedback } from '@/app/actions'

type FeedbackType = 'bug' | 'feature' | 'other'

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: typeof Bug; description: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Something isn\'t working right' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, description: 'Suggest an improvement' },
  { value: 'other', label: 'Other', icon: MessageSquare, description: 'General feedback' },
]

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  new: { label: 'Submitted', className: 'bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400' },
  reviewed: { label: 'Reviewed', className: 'bg-amber-500/10 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400' },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/10 dark:text-emerald-400' },
}

interface FeedbackItem {
  id: string
  type: string
  subject: string
  description: string
  status: string
  created_at: string
}

export function FeedbackSection() {
  const [type, setType] = useState<FeedbackType>('bug')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<FeedbackItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    getUserFeedback().then(data => {
      setHistory(data as FeedbackItem[])
      setLoadingHistory(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return

    setSubmitting(true)
    setError(null)

    const result = await submitFeedback({
      type,
      subject: subject.trim(),
      description: description.trim(),
      page_url: typeof window !== 'undefined' ? window.location.href : undefined,
    })

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSubmitted(true)
      setSubject('')
      setDescription('')
      // Refresh history
      const data = await getUserFeedback()
      setHistory(data as FeedbackItem[])
      setTimeout(() => setSubmitted(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Submit form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold">Report a problem or share feedback</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Let us know what went wrong or what could be better. We read every report.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon
              const isActive = type === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:block">{opt.description}</span>
                </button>
              )
            })}
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="fb-subject" className="block text-sm font-medium mb-1.5">
              Subject
            </label>
            <input
              id="fb-subject"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={type === 'bug' ? 'e.g. Script generator shows blank page' : 'e.g. Add dark mode for coach chat'}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="fb-desc" className="block text-sm font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="fb-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={type === 'bug'
                ? 'What happened? What did you expect to happen? Any steps to reproduce?'
                : 'Tell us more about your idea or feedback...'
              }
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !subject.trim() || !description.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Sending...</>
            ) : submitted ? (
              <><Check size={14} /> Sent! Thank you</>
            ) : (
              <><Send size={14} /> Submit</>
            )}
          </button>
        </form>
      </div>

      {/* History */}
      {loadingHistory ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading...
        </div>
      ) : history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Your submissions</h3>
          <div className="space-y-2">
            {history.map(item => {
              const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.new
              const TypeIcon = TYPE_OPTIONS.find(o => o.value === item.type)?.icon ?? MessageSquare
              return (
                <div key={item.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TypeIcon size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{item.subject}</span>
                    </div>
                    <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-[22px]">{item.description}</p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 pl-[22px]">
                    <Clock size={10} />
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

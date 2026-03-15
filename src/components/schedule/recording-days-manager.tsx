'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { addRecordingDay, deleteRecordingDay, addIdeaToRecordingDay, removeIdeaFromRecordingDay, updateProductionStatus } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { ContentIdea, ProductionStatus } from '@/lib/types'

interface RecordingDayWithIdeas {
  id: string
  recording_date: string
  notes: string | null
  ideas: ContentIdea[]
}

interface Props {
  recordingDays: RecordingDayWithIdeas[]
  availableIdeas: ContentIdea[]
}

const STATUS_COLORS: Record<ProductionStatus, string> = {
  new: 'bg-gray-500/10 text-gray-500',
  recording: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  editing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  posted: 'bg-green-500/10 text-green-600 dark:text-green-400',
}

export function RecordingDaysManager({ recordingDays, availableIdeas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [newDate, setNewDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const inputClass = "bg-muted dark:bg-[#1e1e2e] border-border dark:border-white/8 rounded-lg focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"

  function handleAddDay(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate) return
    startTransition(async () => {
      await addRecordingDay(newDate, newNotes.trim() || undefined)
      setNewDate('')
      setNewNotes('')
      router.refresh()
    })
  }

  function handleDeleteDay(id: string) {
    startTransition(async () => {
      await deleteRecordingDay(id)
      router.refresh()
    })
  }

  function handleAddIdea(dayId: string, ideaId: string) {
    startTransition(async () => {
      await addIdeaToRecordingDay(dayId, ideaId)
      router.refresh()
    })
  }

  function handleRemoveIdea(dayId: string, ideaId: string) {
    startTransition(async () => {
      await removeIdeaFromRecordingDay(dayId, ideaId)
      router.refresh()
    })
  }

  function handleStatusChange(ideaId: string, status: ProductionStatus) {
    startTransition(async () => {
      await updateProductionStatus(ideaId, status)
      router.refresh()
    })
  }

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
      <p className="text-sm font-bold text-foreground">Recording Days</p>

      {/* Add new recording day */}
      <form onSubmit={handleAddDay} className="flex gap-2 items-end">
        <DatePicker value={newDate} onChange={setNewDate} className="flex-1" placeholder="Pick a date" />
        <Input placeholder="Notes (optional)" value={newNotes} onChange={e => setNewNotes(e.target.value)} className={`${inputClass} flex-1`} />
        <button
          type="submit"
          disabled={isPending || !newDate}
          className="h-9 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-bold shrink-0 disabled:opacity-50 hover:brightness-110 transition-all"
        >
          <Plus size={16} />
        </button>
      </form>

      {/* List of recording days */}
      <div className="space-y-3">
        {recordingDays.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No recording days planned yet.</p>
        )}
        {recordingDays.map(day => {
          const isExpanded = expandedDay === day.id
          const assignedIds = new Set(day.ideas.map(i => i.id))
          const unassigned = availableIdeas.filter(i => !assignedIds.has(i.id))

          return (
            <div key={day.id} className="border border-border dark:border-white/8 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedDay(isExpanded ? null : day.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-foreground">{formatDate(day.recording_date)}</span>
                  {day.notes && <span className="text-xs text-muted-foreground">— {day.notes}</span>}
                  <span className="text-[10px] text-muted-foreground bg-muted/50 dark:bg-white/[0.04] px-1.5 py-0.5 rounded">
                    {day.ideas.length} idea{day.ideas.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteDay(day.id) }}
                    className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                    disabled={isPending}
                  >
                    <Trash2 size={14} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border dark:border-white/8 p-3 space-y-2">
                  {/* Assigned ideas */}
                  {day.ideas.map(idea => (
                    <div key={idea.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-muted/30 dark:bg-white/[0.02]">
                      <span className="text-xs font-medium text-foreground truncate flex-1">{idea.idea}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={idea.production_status}
                          onChange={e => handleStatusChange(idea.id, e.target.value as ProductionStatus)}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border-0 cursor-pointer ${STATUS_COLORS[idea.production_status]}`}
                          disabled={isPending}
                        >
                          <option value="new">New</option>
                          <option value="recording">Recording</option>
                          <option value="editing">Editing</option>
                          <option value="posted">Posted</option>
                        </select>
                        <button
                          onClick={() => handleRemoveIdea(day.id, idea.id)}
                          className="p-0.5 text-muted-foreground hover:text-red-400 transition-colors"
                          disabled={isPending}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add idea selector */}
                  {unassigned.length > 0 && (
                    <select
                      onChange={e => { if (e.target.value) handleAddIdea(day.id, e.target.value); e.target.value = '' }}
                      className={`w-full h-8 px-2 text-xs ${inputClass}`}
                      disabled={isPending}
                    >
                      <option value="">+ Add idea to this day...</option>
                      {unassigned.map(idea => (
                        <option key={idea.id} value={idea.id}>
                          {idea.idea.slice(0, 60)}{idea.idea.length > 60 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

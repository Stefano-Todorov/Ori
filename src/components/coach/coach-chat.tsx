'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, Sparkles } from 'lucide-react'
import type { CoachMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  initialHistory: CoachMessage[]
}

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Analyze my best performing posts and tell me what to do more of',
  'Write me 5 hook ideas for my next video',
  'What content should I post this week?',
  'How do I improve my engagement rate?',
]

export function CoachChat({ initialHistory }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>(
    initialHistory.map((m) => ({ role: m.role, content: m.content }))
  )
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return

    const userMsg: DisplayMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    // Prepare history for API (last 20 messages to stay within context)
    const history = [...messages, userMsg].slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const assistantMsg: DisplayMessage = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMsg])

    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
    })

    if (!res.body) { setStreaming(false); return }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: updated[updated.length - 1].content + chunk,
        }
        return updated
      })
    }

    setStreaming(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 text-center">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg shadow-purple-500/20">
                O
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Hey, I&apos;m Orianna</h2>
              <p className="text-muted-foreground max-w-md">
                I know your content, your niche, and your goals. Ask me anything.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left p-4 rounded-xl border border-border dark:border-white/8 text-sm text-foreground hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-150 group"
                >
                  <Sparkles size={12} className="text-purple-500 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm shadow-purple-500/20">
                  O
                </div>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-tr-sm shadow-md shadow-purple-500/15'
                    : 'bg-muted dark:bg-[#1a1a2e] border border-border dark:border-white/6 text-foreground rounded-tl-sm'
                )}
              >
                {msg.content}
                {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                  <span className="inline-block w-1.5 h-4 bg-purple-500 ml-0.5 animate-pulse rounded-full" />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border dark:border-white/6 p-4 bg-card dark:bg-[#12121a]">
        <div className="flex gap-3 items-end max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Orianna anything... (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="resize-none min-h-[44px] max-h-32 overflow-y-auto bg-muted dark:bg-[#1a1a2e] border-border dark:border-white/8 rounded-xl focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20 transition-all"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

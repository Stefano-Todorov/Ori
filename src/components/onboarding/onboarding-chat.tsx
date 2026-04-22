'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGE: DisplayMessage = {
  role: 'assistant',
  content:
    "Hey! I'm Orianna, your AI content coach. Before we dive into strategy, I'd love to get to know you and your content journey a bit. What kind of content do you create (or want to create)?",
}

export function OnboardingChat() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')
  const billing = searchParams.get('billing')

  const [messages, setMessages] = useState<DisplayMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [completed, setCompleted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      const sh = inputRef.current.scrollHeight
      inputRef.current.style.height = Math.min(sh, 128) + 'px'
      inputRef.current.style.overflowY = sh > 128 ? 'auto' : 'hidden'
    }
  }, [input])

  async function sendMessage(text: string) {
    if (!text.trim() || streaming || completed) return

    const userMsg: DisplayMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    // Build history excluding the initial hardcoded message (send all messages for context)
    const allMessages = [...messages, userMsg]
    const history = allMessages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const assistantMsg: DisplayMessage = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/onboarding-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      if (!res.body) {
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk

        // Check for completion sentinel
        if (fullText.includes('__ONBOARDING_COMPLETE__')) {
          const cleanText = fullText.replace('\n__ONBOARDING_COMPLETE__', '')
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: cleanText,
            }
            return updated
          })
          setStreaming(false)
          setCompleted(true)

          // Redirect after a brief pause so the user can read the welcome message
          setTimeout(() => {
            if (plan) {
              router.push(
                `/dashboard/settings?tab=billing&plan=${plan}${billing ? `&billing=${billing}` : ''}`
              )
            } else {
              router.push('/dashboard')
            }
          }, 3000)
          return
        }

        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText,
          }
          return updated
        })
      }

      setStreaming(false)
    } catch {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ maxHeight: 'calc(100vh - 80px)' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0 text-white text-[11px] font-semibold">
                  O
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-sm'
                    : 'bg-muted dark:bg-white/[0.04] border border-border dark:border-white/[0.06] text-foreground rounded-tl-sm'
                )}
              >
                {msg.content}
                {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                  <span className="inline-block w-1.5 h-4 bg-purple-500 ml-0.5 animate-pulse rounded-full" />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Completion banner */}
      {completed && (
        <div className="px-4 sm:px-6 py-3 bg-purple-600/10 border-t border-purple-500/20 text-center">
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
            Profile saved! Redirecting to your dashboard...
          </p>
        </div>
      )}

      {/* Input bar */}
      {!completed && (
        <div className="px-4 sm:px-6 py-4 border-t border-border bg-background">
          <div className="relative max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              rows={1}
              className="w-full bg-muted dark:bg-white/[0.04] border border-border dark:border-white/[0.08] rounded-xl py-3.5 pl-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
              style={{ minHeight: 48, maxHeight: 128 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {streaming ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            Enter to send &middot; Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  )
}

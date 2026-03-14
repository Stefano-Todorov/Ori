'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ArrowRight } from 'lucide-react'
import type { CoachMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  initialHistory: CoachMessage[]
}

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS: { icon: string; text: string }[] = [
  { icon: '📊', text: 'Analyze my best performing posts and tell me what to do more of' },
  { icon: '✍️', text: 'Write me 5 hook ideas for my next video' },
  { icon: '📅', text: 'What content should I post this week?' },
  { icon: '📈', text: 'How do I improve my engagement rate?' },
]

export function CoachChat({ initialHistory }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>(
    initialHistory.map((m) => ({ role: m.role, content: m.content }))
  )
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 128) + 'px'
    }
  }, [input])

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return

    const userMsg: DisplayMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)

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
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* ── Empty state with glows ── */
          <div
            className="flex flex-col items-center justify-center text-center px-6"
            style={{
              minHeight: 'calc(100vh - 140px)',
              paddingBottom: 40,
              background: `
                radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.18), transparent 70%),
                radial-gradient(ellipse 30% 25% at 50% 60%, rgba(168,85,247,0.06), transparent)
              `,
            }}
          >
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-full mb-6"
              style={{
                width: 72,
                height: 72,
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                animation: 'coach-pulse 3s ease-in-out infinite',
              }}
            >
              <span style={{ color: 'white', fontSize: 24, fontWeight: 700 }}>✦</span>
            </div>

            {/* Title */}
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              <span style={{ color: 'white' }}>Hey, I&apos;m </span>
              <span
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Orianna
              </span>
            </h2>
            <p
              style={{
                color: '#9ca3af',
                fontSize: 15,
                maxWidth: 400,
                lineHeight: 1.6,
                marginBottom: 32,
              }}
            >
              I know your content, your niche, and your goals. Ask me anything.
            </p>

            {/* Suggestion cards */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 w-full"
              style={{ maxWidth: 640, gap: 12 }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className="group relative text-left"
                  style={{
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget
                    el.style.borderColor = 'rgba(124,58,237,0.4)'
                    el.style.background = '#1e1e38'
                    el.style.boxShadow = '0 0 20px rgba(124,58,237,0.1)'
                    el.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    el.style.borderColor = 'rgba(255,255,255,0.07)'
                    el.style.background = '#1a1a2e'
                    el.style.boxShadow = 'none'
                    el.style.transform = 'translateY(0)'
                  }}
                >
                  <span style={{ fontSize: 16, display: 'block', marginBottom: 10 }}>{s.icon}</span>
                  <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500, lineHeight: '1.5' }}>
                    {s.text}
                  </span>
                  <ArrowRight
                    size={14}
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: '#7c3aed' }}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Chat messages ── */
          <div className="p-6 space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      boxShadow: '0 0 0 3px rgba(124,58,237,0.15)',
                    }}
                  >
                    <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✦</span>
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-tr-sm shadow-md shadow-purple-500/15'
                      : 'rounded-tl-sm'
                  )}
                  style={msg.role === 'assistant' ? {
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#e2e8f0',
                  } : undefined}
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
        )}
      </div>

      {/* ── Input bar ── */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#0a0a0f',
        }}
      >
        <div className="relative max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Orianna anything..."
            rows={1}
            style={{
              width: '100%',
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px 50px 14px 16px',
              color: 'white',
              fontSize: 14,
              resize: 'none',
              outline: 'none',
              minHeight: 48,
              maxHeight: 128,
              overflowY: 'auto',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              lineHeight: '1.5',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#7c3aed'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.filter = 'brightness(1.15)'
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none'
              e.currentTarget.style.transform = 'translateY(-50%)'
            }}
          >
            {streaming ? (
              <Loader2 size={16} className="animate-spin" style={{ color: 'white' }} />
            ) : (
              <Send size={16} style={{ color: 'white' }} />
            )}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#4b5563', textAlign: 'center', marginTop: 6 }}>
          Press Enter to send &middot; Shift+Enter for new line
        </p>
      </div>

      {/* Pulse animation for avatar */}
      <style jsx global>{`
        @keyframes coach-pulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(124,58,237,0.15), 0 0 40px rgba(124,58,237,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(124,58,237,0.2), 0 0 60px rgba(124,58,237,0.45); }
        }
        textarea::placeholder {
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

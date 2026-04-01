'use client'

import { useState, useTransition, useEffect } from 'react'
import { disconnectAccount } from '@/app/actions'
import type { SocialAccount, Platform } from '@/lib/types'
import { useSearchParams } from 'next/navigation'

const PLATFORMS: { id: Platform; label: string; dotColor: string }[] = [
  { id: 'tiktok', label: 'TikTok', dotColor: 'bg-black dark:bg-white' },
  { id: 'instagram', label: 'Instagram', dotColor: 'bg-pink-500' },
]

interface Props {
  accounts: SocialAccount[]
}

export function ConnectedAccounts({ accounts }: Props) {
  const searchParams = useSearchParams()
  const [notification, setNotification] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [disconnecting, setDisconnecting] = useState<Platform | null>(null)

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) setNotification(`${connected} connected successfully`)
    if (error) setNotification(`Error: ${decodeURIComponent(error)}`)
    if (connected || error) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  function handleConnect(platform: Platform) {
    window.location.href = `/api/social/oauth/${platform}/connect`
  }

  function handleDisconnect(platform: Platform) {
    setDisconnecting(platform)
    startTransition(async () => {
      await disconnectAccount(platform)
      setDisconnecting(null)
    })
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div>
        <p className="text-sm font-bold text-foreground">Connected Accounts</p>
        <p className="text-xs text-muted-foreground mt-0.5">Connect your social media accounts to schedule and publish posts</p>
      </div>

      {notification && (
        <div className={`text-sm p-3 rounded-xl ${notification.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400'}`}>
          {notification}
        </div>
      )}

      <div className="space-y-2">
        {PLATFORMS.map((p) => {
          const account = accounts.find(a => a.platform === p.id)
          return (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-white/6 bg-muted/30 dark:bg-[#1a1a2e] transition-colors hover:bg-muted/50 dark:hover:bg-[#1e1e38]">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${p.dotColor}`} />
                <div>
                  <div className="font-medium text-sm text-foreground">{p.label}</div>
                  {account && (
                    <div className="text-xs text-muted-foreground">
                      {account.display_name ?? account.username}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {account ? (
                  <>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400">
                      Connected
                    </span>
                    <button
                      onClick={() => handleDisconnect(p.id)}
                      disabled={isPending && disconnecting === p.id}
                      className="text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-all duration-150"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(p.id)}
                    className="text-xs font-medium px-3.5 py-1.5 rounded-xl border border-border dark:border-white/10 text-foreground hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-150"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

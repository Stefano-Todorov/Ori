'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { disconnectAccount } from '@/app/actions'
import type { SocialAccount, Platform } from '@/lib/types'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: 'youtube', label: 'YouTube Shorts', color: 'bg-red-500' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-black' },
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-500' },
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
    if (connected) setNotification(`✓ ${connected} connected successfully`)
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
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>Connect your social media accounts to schedule and publish posts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notification && (
          <div className={`text-sm p-3 rounded-md ${notification.startsWith('Error') ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400'}`}>
            {notification}
          </div>
        )}

        {PLATFORMS.map((p) => {
          const account = accounts.find(a => a.platform === p.id)
          return (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${p.color}`} />
                <div>
                  <div className="font-medium text-sm">{p.label}</div>
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
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                      Connected
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(p.id)}
                      disabled={isPending && disconnecting === p.id}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleConnect(p.id)}>
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

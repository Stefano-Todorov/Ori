import { createServiceClient } from '@/lib/supabase/service'
import type { Platform } from '@/lib/types'

export async function getValidToken(userId: string, platform: Platform): Promise<string> {
  const supabase = createServiceClient()

  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single()

  if (error || !account) {
    throw new Error(`No connected ${platform} account for user ${userId}`)
  }

  // TikTok: always refresh before use (safe to do idempotently)
  if (platform === 'tiktok' && account.refresh_token) {
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null
    const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 60 * 60 * 1000

    if (needsRefresh) {
      const refreshed = await refreshTikTokToken(account.refresh_token)
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

      await supabase
        .from('social_accounts')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? account.refresh_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id)

      return refreshed.access_token
    }
  }

  // Instagram: long-lived token (60 days), warn if close to expiry but still return it
  if (platform === 'instagram') {
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      throw new Error('Instagram token expired. Please reconnect your Instagram account.')
    }
  }

  if (!account.access_token) {
    throw new Error(`No access token for ${platform} account`)
  }

  return account.access_token
}

async function refreshTikTokToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TikTok token refresh failed: ${text}`)
  }

  const json = await res.json()
  return json.data
}

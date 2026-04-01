import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/settings?error=${encodeURIComponent(error)}`, BASE_URL))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=no_code', BASE_URL))
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value
  cookieStore.delete('oauth_state')

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_state', BASE_URL))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', BASE_URL))

  try {
    let accountData: Record<string, unknown>

    if (platform === 'tiktok') {
      accountData = await handleTikTok(code)
    } else if (platform === 'instagram') {
      accountData = await handleInstagram(code)
    } else {
      return NextResponse.redirect(new URL('/dashboard/settings?error=unknown_platform', BASE_URL))
    }

    await supabase.from('social_accounts').upsert(
      { user_id: user.id, platform, ...accountData, connected_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,platform' }
    )

    return NextResponse.redirect(new URL(`/dashboard/settings?connected=${platform}`, BASE_URL))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error'
    return NextResponse.redirect(new URL(`/dashboard/settings?error=${encodeURIComponent(msg)}`, BASE_URL))
  }
}

async function handleTikTok(code: string) {
  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      redirect_uri: `${BASE_URL}/api/social/oauth/tiktok/callback`,
      grant_type: 'authorization_code',
      code,
    }),
  })
  if (!tokenRes.ok) throw new Error(await tokenRes.text())
  const { data: tokens } = await tokenRes.json()

  // Get user info
  const userRes = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  )
  const userData = await userRes.json()
  const userInfo = userData.data?.user

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    platform_user_id: userInfo?.open_id ?? tokens.open_id ?? null,
    display_name: userInfo?.display_name ?? null,
    avatar_url: userInfo?.avatar_url ?? null,
    username: userInfo?.username ?? userInfo?.open_id ?? 'tiktok',
    scopes: ['user.info.basic', 'video.upload', 'video.publish', 'video.list'],
  }
}

async function handleInstagram(code: string) {
  // Exchange code for short-lived token
  const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri: `${BASE_URL}/api/social/oauth/instagram/callback`,
      grant_type: 'authorization_code',
      code,
    }),
  })
  if (!tokenRes.ok) throw new Error(await tokenRes.text())
  const { access_token: shortLivedToken } = await tokenRes.json()

  // Exchange for long-lived token (60 days)
  const longLivedRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`
  )
  if (!longLivedRes.ok) throw new Error(await longLivedRes.text())
  const { access_token: longLivedToken, expires_in } = await longLivedRes.json()

  // Get Facebook Pages → find connected IG Business Account
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`
  )
  const pagesData = await pagesRes.json()
  const page = pagesData.data?.[0]

  let igUserId: string | null = null
  let igUsername: string | null = null
  let igAvatar: string | null = null

  if (page) {
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igRes.json()
    igUserId = igData.instagram_business_account?.id ?? null

    if (igUserId) {
      const profileRes = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}?fields=username,profile_picture_url&access_token=${longLivedToken}`
      )
      const profileData = await profileRes.json()
      igUsername = profileData.username ?? null
      igAvatar = profileData.profile_picture_url ?? null
    }
  }

  return {
    access_token: longLivedToken,
    refresh_token: null,
    token_expires_at: expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    platform_user_id: igUserId,
    display_name: igUsername,
    avatar_url: igAvatar,
    username: igUsername ?? 'instagram',
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
  }
}

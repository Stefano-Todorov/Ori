import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function buildYouTubeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${BASE_URL}/api/social/oauth/youtube/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

function buildTikTokUrl(state: string) {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: `${BASE_URL}/api/social/oauth/tiktok/callback`,
    response_type: 'code',
    scope: 'user.info.basic,video.upload,video.publish,video.list',
    state,
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`
}

function buildInstagramUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: `${BASE_URL}/api/social/oauth/instagram/callback`,
    response_type: 'code',
    scope: 'instagram_basic,instagram_content_publish,instagram_manage_insights,pages_read_engagement',
    state,
  })
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', BASE_URL))

  const state = crypto.randomBytes(16).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 })

  let authUrl: string
  if (platform === 'youtube') {
    authUrl = buildYouTubeUrl(state)
  } else if (platform === 'tiktok') {
    authUrl = buildTikTokUrl(state)
  } else if (platform === 'instagram') {
    authUrl = buildInstagramUrl(state)
  } else {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  return NextResponse.redirect(authUrl)
}

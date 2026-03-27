import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, RATE_LIMITS, type RateLimitKey } from '@/lib/rate-limit'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const APP_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://ori-nine.vercel.app'

function getAllowedOrigin(origin: string | null): string {
  if (!origin) return APP_ORIGIN
  if (origin === APP_ORIGIN) return origin
  if (origin.startsWith('chrome-extension://')) return origin
  return APP_ORIGIN
}

export function getCorsHeaders(request?: NextRequest) {
  const origin = request?.headers.get('origin') ?? null
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export function optionsResponse() {
  return NextResponse.json(null, { headers: corsHeaders })
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: corsHeaders })
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders })
}

export interface ExtensionAuthResult {
  user: User
  supabase: SupabaseClient
  authMethod: 'bearer' | 'cookie'
}

/**
 * Authenticate an extension API request and apply rate limiting.
 *
 * Supports two auth methods:
 * - Bearer token (Chrome extension) — validated via service client
 * - Cookie-based (webapp) — only attempted if `allowCookieAuth` is true
 *
 * Returns { user, supabase, authMethod } on success, or a NextResponse error.
 */
export async function authenticateExtensionRequest(
  req: NextRequest,
  rateLimitKey: RateLimitKey,
  options?: { allowCookieAuth?: boolean },
): Promise<ExtensionAuthResult | NextResponse> {
  const allowCookieAuth = options?.allowCookieAuth ?? false

  let user: User | null = null
  let supabase: SupabaseClient
  let authMethod: 'bearer' | 'cookie' = 'bearer'

  // Try Bearer token first
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    supabase = createServiceClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (!error && data.user) {
      user = data.user
    }
  }

  // Fallback to cookie auth if allowed and Bearer didn't work
  if (!user && allowCookieAuth) {
    supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      user = data.user
      authMethod = 'cookie'
    }
  }

  if (!user) {
    return errorResponse('Unauthorized', 401)
  }

  // Rate limit (per user, per route)
  const rl = checkRateLimit(`${user.id}:${rateLimitKey}`, RATE_LIMITS[rateLimitKey])
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: {
          ...getCorsHeaders(req),
          'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      },
    )
  }

  return { user, supabase: supabase!, authMethod }
}

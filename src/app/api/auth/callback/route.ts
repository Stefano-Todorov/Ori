import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  // Prevent open redirect: must be a relative path, not protocol-relative
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Send welcome email for new users (fire and forget)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const isNewUser = user.created_at && (Date.now() - new Date(user.created_at).getTime()) < 60_000
        if (isNewUser) {
          fetch(`${origin}/api/email/welcome`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({
              email: user.email,
              name: user.user_metadata?.name || '',
            }),
          }).catch(() => {}) // Non-critical, don't block redirect
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

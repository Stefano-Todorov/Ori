import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { welcomeEmail, featureHighlightEmail, upgradeNudgeEmail } from '@/lib/email-templates'

// Called internally after signup to send the welcome email sequence
// POST /api/email/welcome { userId: string }
export async function POST(request: Request) {
  try {
    // Auth: require CRON_SECRET for all calls (used by internal server-to-server calls and cron jobs)
    const authHeader = request.headers.get('authorization')
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, email: directEmail, name: directName, step } = await request.json()

    // Determine which email to send based on step
    const emailStep = step || 'welcome'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ori-nine.vercel.app'

    let toEmail = directEmail
    let userName = directName

    // If userId provided, look up the user
    if (userId && (!toEmail || !userName)) {
      const supabase = createServiceClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('user_id', userId)
        .single()

      if (profile) {
        toEmail = toEmail || profile.email
        userName = userName || profile.name
      }
    }

    if (!toEmail) {
      return NextResponse.json({ error: 'No email address' }, { status: 400 })
    }

    let emailContent: { subject: string; html: string }

    switch (emailStep) {
      case 'feature_highlight':
        emailContent = featureHighlightEmail(userName || '', appUrl)
        break
      case 'upgrade_nudge':
        emailContent = upgradeNudgeEmail(userName || '', appUrl)
        break
      case 'welcome':
      default:
        emailContent = welcomeEmail(userName || '', appUrl)
        break
    }

    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Schedule follow-up emails if this is the welcome email
    if (emailStep === 'welcome') {
      // Schedule Day 2: Feature highlight
      try {
        const scheduledAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        await getResend().emails.send({
          from: FROM_EMAIL,
          to: toEmail,
          subject: featureHighlightEmail(userName || '', appUrl).subject,
          html: featureHighlightEmail(userName || '', appUrl).html,
          scheduledAt,
        })
      } catch (e) {
        // Non-critical: log but don't fail the welcome email
        console.error('Failed to schedule feature highlight email:', e)
      }

      // Schedule Day 7: Upgrade nudge
      try {
        const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        await getResend().emails.send({
          from: FROM_EMAIL,
          to: toEmail,
          subject: upgradeNudgeEmail(userName || '', appUrl).subject,
          html: upgradeNudgeEmail(userName || '', appUrl).html,
          scheduledAt,
        })
      } catch (e) {
        console.error('Failed to schedule upgrade nudge email:', e)
      }
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

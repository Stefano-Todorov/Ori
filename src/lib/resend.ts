import { Resend } from 'resend'

// Lazy singleton — avoids build-time crash when RESEND_API_KEY is not set
let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY!)
  }
  return _resend
}

// Default sender — update domain after setting up a custom domain in Resend
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Orianna <onboarding@resend.dev>'

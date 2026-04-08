import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

// Default sender — update domain after setting up a custom domain in Resend
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Orianna <onboarding@resend.dev>'

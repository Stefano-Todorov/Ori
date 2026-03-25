import { NextResponse } from 'next/server'

// Temporary debug endpoint — DELETE after verifying Stripe config
export async function GET() {
  return NextResponse.json({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? `${process.env.STRIPE_SECRET_KEY.slice(0, 8)}...` : 'NOT SET',
    STRIPE_PRICE_PLUS: process.env.STRIPE_PRICE_PLUS ?? 'NOT SET',
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO ?? 'NOT SET',
    STRIPE_PRICE_MAX: process.env.STRIPE_PRICE_MAX ?? 'NOT SET',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'NOT SET',
    CRON_SECRET: process.env.CRON_SECRET ? 'SET' : 'NOT SET',
  })
}

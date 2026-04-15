/**
 * One-off cleanup: delete all Instagram posts synced for a given user email,
 * plus today's follower snapshot for that user/platform. Use when the extension
 * ingested posts from the wrong IG account and you need a clean slate to resync.
 *
 * Usage:
 *   npx tsx scripts/cleanup-wrong-posts.ts <email>
 *   npx tsx scripts/cleanup-wrong-posts.ts stefanotodorov@gmail.com
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const email = process.argv[2]
if (!email) {
  console.error('Usage: npx tsx scripts/cleanup-wrong-posts.ts <email>')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

async function main() {
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('user_id, email')
    .eq('email', email)
    .single()

  if (profileErr || !profile) {
    console.error('Could not find profile for', email, profileErr?.message)
    process.exit(1)
  }

  const userId = profile.user_id
  console.log(`Found user_id=${userId} for ${email}`)

  const { count: existingCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('platform', 'instagram')
    .eq('is_competitor', false)
    .eq('is_trending', false)

  console.log(`Will delete ${existingCount ?? 0} Instagram posts for this user.`)

  const { error: delErr } = await supabase
    .from('posts')
    .delete()
    .eq('user_id', userId)
    .eq('platform', 'instagram')
    .eq('is_competitor', false)
    .eq('is_trending', false)

  if (delErr) {
    console.error('Delete failed:', delErr.message)
    process.exit(1)
  }
  console.log('Posts deleted.')

  const today = new Date().toISOString().split('T')[0]
  const { error: snapErr } = await supabase
    .from('follower_snapshots')
    .delete()
    .eq('user_id', userId)
    .eq('platform', 'instagram')
    .eq('recorded_at', today)

  if (snapErr) {
    console.error('Follower snapshot delete failed (non-fatal):', snapErr.message)
  } else {
    console.log(`Today's follower snapshot for instagram cleared.`)
  }

  console.log('\nDone. Now:')
  console.log('  1. Reload the Chrome extension (chrome://extensions → reload Orianna)')
  console.log('  2. Open a FRESH tab, go directly to your own IG profile')
  console.log('  3. Click Sync')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

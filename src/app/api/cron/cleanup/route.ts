import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Delete archived inspo posts older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: deleted, error } = await supabase
    .from('posts')
    .delete()
    .eq('is_trending', true)
    .eq('status', 'archived')
    .lt('updated_at', sevenDaysAgo)
    .select('id')

  if (error) {
    console.error('[cron/cleanup] DB error:', error.message)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }

  return NextResponse.json({ deleted: deleted?.length ?? 0 })
}

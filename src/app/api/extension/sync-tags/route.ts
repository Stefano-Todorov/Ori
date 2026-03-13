import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  const { tags } = await req.json()
  if (!Array.isArray(tags)) {
    return NextResponse.json({ error: 'tags must be an array' }, { status: 400, headers: corsHeaders })
  }

  // Merge with existing tags so we never lose any
  const { data: profile } = await supabase
    .from('profiles')
    .select('inspo_tags')
    .eq('user_id', user.id)
    .single()

  const existing: string[] = profile?.inspo_tags ?? []
  const merged = [...new Set([...existing, ...tags])].sort()

  await supabase.from('profiles').update({ inspo_tags: merged }).eq('user_id', user.id)

  return NextResponse.json({ ok: true, tags: merged }, { headers: corsHeaders })
}

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

  const token = authHeader.slice(7)
  const supabase = createServiceClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  const body = await req.json()
  const { ideas } = body

  if (!Array.isArray(ideas) || ideas.length === 0) {
    return NextResponse.json({ error: 'No ideas provided' }, { status: 400, headers: corsHeaders })
  }

  const rows = ideas.map((item: { idea: string; inspiration_url?: string; thumbnail_url?: string; source?: string; tags?: string[] }) => ({
    user_id: user.id,
    idea: item.idea,
    inspiration_url: item.inspiration_url || null,
    thumbnail_url: item.thumbnail_url || null,
    source: item.source || null,
    tags: item.tags ?? [],
  }))

  const { error } = await supabase.from('content_ideas').insert(rows)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }

  return NextResponse.json({ ok: true, count: rows.length }, { headers: corsHeaders })
}

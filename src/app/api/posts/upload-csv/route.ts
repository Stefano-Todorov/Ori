import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

// Normalize various CSV column names to our schema
const FIELD_MAP: Record<string, string> = {
  // Views
  'video views': 'views',
  'views': 'views',
  'view count': 'views',
  'plays': 'views',
  // Likes
  'likes': 'likes',
  'like count': 'likes',
  'hearts': 'likes',
  // Comments
  'comments': 'comments',
  'comment count': 'comments',
  // Shares
  'shares': 'shares',
  'share count': 'shares',
  // Saves
  'saves': 'saves',
  'bookmarks': 'saves',
  // Caption / title
  'caption': 'caption',
  'title': 'title',
  'description': 'caption',
  'video description': 'caption',
  // URL
  'url': 'url',
  'link': 'url',
  'video url': 'url',
  'post url': 'url',
  // Date
  'date': 'posted_at',
  'post date': 'posted_at',
  'video publish time': 'posted_at',
  'published at': 'posted_at',
  'created at': 'posted_at',
  // Hashtags
  'hashtags': 'hashtags',
  'tags': 'hashtags',
  // Duration
  'duration': 'duration_seconds',
  'video duration': 'duration_seconds',
  'length': 'duration_seconds',
}

function parseNumber(val: string | undefined): number {
  if (!val) return 0
  return parseInt(val.replace(/[^0-9]/g, ''), 10) || 0
}

function parseDate(val: string | undefined): string | null {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function parseDuration(val: string | undefined): number | null {
  if (!val) return null
  // Handle formats: "00:01:23", "83", "1:23"
  if (val.includes(':')) {
    const parts = val.split(':').map(Number)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
  }
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  const platform = formData.get('platform') as string

  if (!file || !platform) {
    return NextResponse.json({ error: 'Missing file or platform' }, { status: 400 })
  }

  const text = await file.text()
  const { data: rows, errors } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  if (errors.length > 0 && rows.length === 0) {
    return NextResponse.json({ error: 'Could not parse CSV' }, { status: 400 })
  }

  const posts = (rows as Record<string, string>[]).map((row) => {
    // Normalize fields
    const normalized: Record<string, unknown> = {}
    for (const [rawKey, rawVal] of Object.entries(row)) {
      const mappedKey = FIELD_MAP[rawKey.toLowerCase()]
      if (mappedKey) normalized[mappedKey] = rawVal
    }

    const views = parseNumber(normalized.views as string)
    const likes = parseNumber(normalized.likes as string)
    const comments = parseNumber(normalized.comments as string)
    const shares = parseNumber(normalized.shares as string)
    const engagementRate = views > 0 ? parseFloat((((likes + comments + shares) / views) * 100).toFixed(2)) : 0

    const hashtags = normalized.hashtags
      ? (normalized.hashtags as string).split(/[\s,#]+/).filter(Boolean)
      : []

    return {
      user_id: user.id,
      platform,
      url: (normalized.url as string) || null,
      title: (normalized.title as string) || null,
      caption: (normalized.caption as string) || null,
      hashtags,
      views,
      likes,
      comments,
      shares,
      saves: parseNumber(normalized.saves as string),
      engagement_rate: engagementRate,
      posted_at: parseDate(normalized.posted_at as string),
      duration_seconds: parseDuration(normalized.duration_seconds as string),
    }
  })

  const { error } = await supabase.from('posts').insert(posts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: posts.length })
}

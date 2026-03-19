export type Platform = 'tiktok' | 'instagram' | 'youtube'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type PostStatus = 'draft' | 'used' | 'archived'
export type ProductionStatus = 'new' | 'recording' | 'editing' | 'posted'

export interface Profile {
  id: string
  email: string
  name: string | null
  niche: string | null
  sub_niche: string | null
  goals: string | null
  platforms: Platform[]
  posting_target: number
  telegram_chat_id: string | null
  onboarding_completed: boolean
  auto_sync_own_profile: boolean
  last_synced_at: Record<string, string>
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  platform: Platform
  url: string | null
  title: string | null
  caption: string | null
  hashtags: string[]
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  engagement_rate: number | null
  posted_at: string | null
  duration_seconds: number | null
  transcript: string | null
  hook_text: string | null
  hook_score: number | null
  difficulty: Difficulty | null
  edit_style: string | null
  thumbnail_description: string | null
  thumbnail_url: string | null
  ai_notes: string | null
  is_competitor: boolean
  competitor_handle: string | null
  is_trending: boolean
  tags: string[]
  linked_idea_id: string | null
  linked_script_id: string | null
  script_text: string | null
  eval_score: number | null
  eval_tags: string[]
  imported_at: string
  created_at: string
}

export interface Script {
  id: string
  user_id: string
  topic: string
  niche: string | null
  hook: string
  body: string
  cta: string | null
  hashtags: string[]
  difficulty: Difficulty | null
  estimated_duration: string | null
  status: PostStatus
  variants: ScriptVariant[]
  eval_score: number | null
  eval_tags: string[]
  created_at: string
}

export interface ScriptVariant {
  hook: string
  angle: string
}

export interface Competitor {
  id: string
  user_id: string
  group_id: string
  platform: Platform
  handle: string
  display_name: string | null
  follower_count: number | null
  avg_views: number | null
  notes: string | null
  profile_url: string | null
  last_scraped_at: string | null
  created_at: string
}

export interface CoachMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ContentIdea {
  id: string
  user_id: string
  idea: string
  source: string | null
  niche: string | null
  hook_idea: string | null
  inspiration_url: string | null
  thumbnail_url: string | null
  script_snippet: string | null
  cta: string | null
  caption: string | null
  difficulty: Difficulty | null
  video_type: string | null
  tags: string[]
  status: 'new' | 'in_progress' | 'done' | 'archived'
  production_status: ProductionStatus
  linked_post_id: string | null
  created_at: string
}

export interface FollowerSnapshot {
  id: string
  user_id: string
  platform: Platform
  count: number
  recorded_at: string
  created_at: string
}

export interface ScheduledPost {
  id: string
  user_id: string
  content_idea_id: string | null
  platform: Platform | null
  title: string | null
  scheduled_date: string
  notes: string | null
  created_at: string
}

export interface RecordingDay {
  id: string
  user_id: string
  recording_date: string
  notes: string | null
  created_at: string
}

export interface RecordingDayIdea {
  id: string
  recording_day_id: string
  content_idea_id: string
}

export interface SocialAccount {
  id: string
  user_id: string
  platform: Platform
  username: string | null
  display_name: string | null
  access_token: string | null
  refresh_token: string | null
  created_at: string
}

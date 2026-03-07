import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddSwipeButton } from '@/components/trending/add-swipe-button'
import { SwipeList } from '@/components/trending/swipe-list'

export default async function TrendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: swipePosts } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_trending', true)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Swipe File</h1>
          <p className="text-muted-foreground mt-1">
            Paste URLs of videos that inspire you. Study what&apos;s working before you create.
          </p>
        </div>
        <AddSwipeButton />
      </div>

      <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground border">
        <p className="font-medium text-foreground mb-1">How to use your Swipe File</p>
        <p>
          When you see a video that resonates — great hook, clever angle, high engagement — save it here.
          Add notes on <em>why</em> it works. Review it before scripting your next video.
          The Chrome extension (coming later) will auto-fill this from your browser.
        </p>
      </div>

      <SwipeList posts={swipePosts ?? []} />
    </div>
  )
}

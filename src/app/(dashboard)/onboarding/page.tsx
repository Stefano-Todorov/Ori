import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingChat } from '@/components/onboarding/onboarding-chat'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Welcome to Orianna</h1>
        <p className="text-muted-foreground text-[15px] mt-1">
          Let&apos;s get to know you. You can skip this and come back any time from the sidebar.
        </p>
      </div>
      <OnboardingChat />
    </div>
  )
}

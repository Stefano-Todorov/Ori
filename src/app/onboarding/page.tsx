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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="text-center pt-8 pb-4 px-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent">
          Orianna
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Let&apos;s get to know you
        </p>
      </div>
      <OnboardingChat />
    </div>
  )
}

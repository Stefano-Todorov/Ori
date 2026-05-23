import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileSidebarProvider } from '@/components/layout/mobile-sidebar-context'
import { MobileHeader } from '@/components/layout/mobile-header'
import { CoachDrawer } from '@/components/coach/floating-coach'
import { CoachProvider } from '@/components/coach/coach-context'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let unreadCoachCount = 0
  let onboardingPending = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_coach_read_at, onboarding_completed')
        .eq('user_id', user.id)
        .single()

      const lastReadAt = profile?.last_coach_read_at ?? '1970-01-01T00:00:00Z'
      onboardingPending = !profile?.onboarding_completed

      const { count } = await supabase
        .from('coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('proactive', true)
        .gt('created_at', lastReadAt)

      unreadCoachCount = count ?? 0
    }
  } catch {
    // Silently fail
  }

  return (
    <MobileSidebarProvider>
      <CoachProvider initialUnread={unreadCoachCount}>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar onboardingPending={onboardingPending} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <MobileHeader />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
          <CoachDrawer />
        </div>
      </CoachProvider>
    </MobileSidebarProvider>
  )
}

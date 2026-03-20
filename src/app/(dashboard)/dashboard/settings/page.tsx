import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  // social_accounts.user_id FK references profiles(id), not auth.users.id
  const { data: socialAccounts } = profile
    ? await supabase.from('social_accounts').select('platform, username').eq('user_id', profile.id)
    : { data: [] }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile, preferences, and subscription</p>
      </div>
      <SettingsTabs profile={profile} socialAccounts={socialAccounts ?? []} />
    </div>
  )
}

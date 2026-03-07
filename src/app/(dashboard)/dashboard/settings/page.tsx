import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings/settings-form'
import { ConnectedAccounts } from '@/components/social/connected-accounts'
import { Suspense } from 'react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('social_accounts').select('*').eq('user_id', user.id),
  ])

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
      </div>
      <Suspense>
        <ConnectedAccounts accounts={accounts ?? []} />
      </Suspense>
      <SettingsForm profile={profile} />
    </div>
  )
}

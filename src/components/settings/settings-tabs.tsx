'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { SettingsForm } from '@/components/settings/settings-form'
import { BillingSection } from '@/components/settings/billing-section'
import { UsageSection } from '@/components/settings/usage-section'
import { User, CreditCard, BarChart3 } from 'lucide-react'
import type { Profile } from '@/lib/types'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
] as const

type TabId = (typeof TABS)[number]['id']

export function SettingsTabs({ profile, socialAccounts }: { profile: Profile | null; socialAccounts: { platform: string; username: string | null }[] }) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'billing') setActiveTab('billing')
    if (tab === 'usage') setActiveTab('usage')
  }, [searchParams])

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50 dark:bg-white/[0.03] border border-border w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-background text-foreground shadow-sm border border-border dark:border-white/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && <SettingsForm profile={profile} socialAccounts={socialAccounts} />}
      {activeTab === 'usage' && <UsageSection />}
      {activeTab === 'billing' && <BillingSection />}
    </div>
  )
}

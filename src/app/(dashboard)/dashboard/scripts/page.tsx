import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScriptGenerator } from '@/components/scripts/script-generator'
import { ScriptList } from '@/components/scripts/script-list'

export default async function ScriptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: scripts }] = await Promise.all([
    supabase.from('profiles').select('niche, platforms').eq('user_id', user.id).single(),
    supabase
      .from('scripts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Script Generator</h1>
        <p className="text-muted-foreground mt-1">
          Generate hooks, full scripts, and content variations for your videos
        </p>
      </div>

      <ScriptGenerator
        defaultPlatform={profile?.platforms?.[0] ?? 'tiktok'}
      />

      {scripts && scripts.length > 0 && (
        <ScriptList scripts={scripts} />
      )}
    </div>
  )
}

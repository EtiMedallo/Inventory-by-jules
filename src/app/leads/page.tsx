import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LeadsBoardClient from './LeadsBoardClient'

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id

  if (!orgId) return <div>No organization found.</div>

  // Fetch Pipeline Stages
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('organization_id', orgId)
    .order('stage_order')

  // Fetch Leads
  const { data: leads } = await supabase
    .from('leads')
    .select('*, projects(name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Leads Pipeline</h1>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <LeadsBoardClient
          initialStages={stages || []}
          initialLeads={leads || []}
          orgId={orgId}
        />
      </div>
    </div>
  )
}

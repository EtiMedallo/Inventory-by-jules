import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Filter } from 'lucide-react'

export default async function PipelineSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id
  if (!orgId) return <div>No organization found.</div>

  if (profile.role === 'commercial') {
     return <div className="p-8 text-center text-red-500">Access Denied. You need to be an Organization Admin.</div>
  }

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6 px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Pipeline Stages</h1>
           <p className="text-gray-500 text-sm mt-1">Configure the columns for your CRM board.</p>
        </div>
        <button className="flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
           Add Stage
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-100">
           {stages?.map(stage => (
              <li key={stage.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                 <div className="flex items-center gap-4">
                    <Filter className="w-5 h-5 text-gray-400 cursor-grab" />
                    <div>
                       <p className="text-sm font-medium text-gray-900 flex items-center">
                          <span className={`w-3 h-3 rounded-full mr-2 bg-${stage.color}-500`} style={{ backgroundColor: getHexColor(stage.color) }}></span>
                          {stage.name}
                       </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button>
                 </div>
              </li>
           ))}
        </ul>
      </div>
    </div>
  )
}

function getHexColor(colorName: string) {
  const map: Record<string, string> = {
    blue: '#3b82f6', yellow: '#eab308', purple: '#a855f7',
    orange: '#f97316', pink: '#ec4899', green: '#22c55e',
    red: '#ef4444', gray: '#6b7280'
  }
  return map[colorName] || map.gray
}

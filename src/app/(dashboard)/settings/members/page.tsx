import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Mail, UserPlus, Shield } from 'lucide-react'

export default async function OrganizationMembersPage() {
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

  // Only org_admins and super_admins should see this natively, but RLS handles data access.
  if (profile.role === 'commercial') {
     return <div className="p-8 text-center text-red-500">Access Denied. You need to be an Organization Admin.</div>
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('*, auth_user:id(email)')
    .eq('organization_id', orgId)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6 px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
           <p className="text-gray-500 text-sm mt-1">Manage users and roles in your organization.</p>
        </div>
        <button className="flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
           <UserPlus className="w-4 h-4 mr-2" /> Invite Member
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-100">
           {members?.map(member => (
              <li key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
                       {member.first_name?.[0]}{member.last_name?.[0]}
                    </div>
                    <div>
                       <p className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                       <Shield className="w-3 h-3 mr-1" /> {member.role.replace('_', ' ')}
                    </span>
                    <button className="text-sm font-medium text-red-600 hover:text-red-800">
                       Remove
                    </button>
                 </div>
              </li>
           ))}
        </ul>
      </div>
    </div>
  )
}

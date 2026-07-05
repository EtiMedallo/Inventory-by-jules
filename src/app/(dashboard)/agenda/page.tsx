import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Phone, MessageCircle, Mail } from 'lucide-react'

export default async function AgendaPage() {
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

  // Fetch pending tasks assigned to this user
  const { data: tasks } = await supabase
    .from('lead_tasks')
    .select(`
       *,
       leads (
         first_name,
         last_name,
         phone,
         projects (name)
       )
    `)
    .eq('organization_id', orgId)
    .eq('assigned_to', user.id)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6 px-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Agenda</h1>
      </div>

      {!tasks || tasks.length === 0 ? (
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">You&apos;re all caught up!</h3>
            <p className="text-gray-500 mt-1">No pending tasks for today. Great job.</p>
         </div>
      ) : (
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-100">
               {tasks.map(task => (
                  <li key={task.id} className="p-6 hover:bg-gray-50 flex items-center justify-between">
                     <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full
                           ${task.action_type === 'call' ? 'bg-blue-100 text-blue-600' :
                             task.action_type === 'whatsapp' ? 'bg-green-100 text-green-600' :
                             'bg-purple-100 text-purple-600'}`}>
                           {task.action_type === 'call' && <Phone className="w-5 h-5" />}
                           {task.action_type === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                           {task.action_type === 'email' && <Mail className="w-5 h-5" />}
                        </div>
                        <div>
                           <h4 className="text-base font-semibold text-gray-900">
                              {task.action_type === 'call' ? 'Call' : task.action_type === 'whatsapp' ? 'WhatsApp' : 'Email'} {task.leads?.first_name} {task.leads?.last_name}
                           </h4>
                           <p className="text-sm text-gray-500 mt-1">
                              Project: {task.leads?.projects?.name || 'N/A'} • Phone: {task.leads?.phone || 'No phone'}
                           </p>
                           {task.template_text && (
                              <div className="mt-3 bg-gray-100 rounded-md p-3 text-sm text-gray-700 italic border-l-4 border-gray-300">
                                 "{task.template_text}"
                              </div>
                           )}
                        </div>
                     </div>
                     <div className="flex flex-col items-end gap-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full
                           ${new Date(task.due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                           Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                        <Link href="/leads">
                           <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                              Go to Lead &rarr;
                           </button>
                        </Link>
                     </div>
                  </li>
               ))}
            </ul>
         </div>
      )}
    </div>
  )
}

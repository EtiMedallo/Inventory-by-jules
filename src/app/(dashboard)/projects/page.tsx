import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { PlusCircle, Map, Eye, Settings } from 'lucide-react'

export default async function ProjectsPage() {
  const supabase = await createClient()

  // Fetch user's org
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id

  let projects = []
  if (orgId) {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    projects = data || []
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Your Projects</h1>
        <Link href="/projects/new">
          <Button>
            <PlusCircle className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No projects</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: { id: string; name: string; description: string; floor_plan_url: string; is_public: boolean; slug: string }) => (
            <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {project.floor_plan_url ? (
                <div className="h-48 w-full bg-gray-100 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={project.floor_plan_url} alt={project.name} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="h-48 w-full bg-slate-100 flex items-center justify-center border-b border-gray-100">
                  <Building2 className="w-12 h-12 text-slate-300" />
                </div>
              )}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{project.description || 'No description'}</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    {project.is_public ? 'Public' : 'Private'}
                  </span>

                  <div className="flex gap-2">
                    {project.is_public && (
                      <Link href={`/p/${project.slug}`} target="_blank">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Link href={`/projects/${project.id}/settings`}>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/projects/${project.id}/map-editor`}>
                      <Button variant="secondary" size="sm">
                        <Map className="h-4 w-4 mr-2" />
                        Map
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Building2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  )
}

import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import MapEditorClient from './MapEditorClient'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'

export default async function MapEditorPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { id } = await params;

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    notFound()
  }

  // Fetch existing lots for this project
  const { data: lots } = await supabase
    .from('lots')
    .select('*')
    .eq('project_id', id)
    .order('identifier')

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500">Map Editor</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <MapEditorClient
          project={project}
          initialLots={lots || []}
        />
      </div>
    </div>
  )
}

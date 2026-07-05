import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import PublicMapClient from './PublicMapClient'

export const revalidate = 60 // Revalidate every minute

export default async function PublicProjectPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const { slug } = await params;

  // Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('*, organizations(name), organization_id')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!project) {
    notFound()
  }

  // Fetch lots and media
  const { data: lots } = await supabase
    .from('lots')
    .select(`
      *,
      lot_media (*)
    `)
    .eq('project_id', project.id)

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <PublicMapClient project={project} lots={lots || []} />
    </div>
  )
}

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from "@/components/ui/button"
import Link from 'next/link'

export default async function NewProjectPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  async function createProject(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const name = formData.get('name') as string
    const slug = formData.get('slug') as string
    const description = formData.get('description') as string
    const is_public = formData.get('is_public') === 'on'

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name,
          slug,
          description,
          is_public,
          organization_id: profile?.organization_id,
        }
      ])
      .select()

    if (error) {
      console.error(error)
      // Redirect to error or show error
      return
    }

    redirect('/projects')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create New Project</h1>
        <Link href="/projects">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <form action={createProject} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name</label>
          <input type="text" name="name" id="name" required className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="e.g. Sunny Valley Estates" />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700">Public Slug URL</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">aypinventory.com/p/</span>
            <input type="text" name="slug" id="slug" required className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-gray-300 py-2 px-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm" placeholder="sunny-valley" />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea id="description" name="description" rows={3} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm" placeholder="A brief description of the project..."></textarea>
        </div>

        <div className="flex items-center">
          <input id="is_public" name="is_public" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
          <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">Make this project public immediately</label>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <Button type="submit">Create Project</Button>
        </div>
      </form>
    </div>
  )
}

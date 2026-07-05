import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { id } = await params;

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()

  async function updateSettings(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const name = formData.get('name') as string
    const slug = formData.get('slug') as string
    const description = formData.get('description') as string
    const is_public = formData.get('is_public') === 'on'
    const show_prices = formData.get('show_prices') === 'on'
    const show_sold_prices = formData.get('show_sold_prices') === 'on'
    const show_sqm = formData.get('show_sqm') === 'on'
    const enable_public_quotes = formData.get('enable_public_quotes') === 'on'
    const whatsapp_number = formData.get('whatsapp_number') as string

    await supabase.from('projects').update({
      name,
      slug,
      description,
      is_public,
      show_prices,
      show_sold_prices,
      show_sqm,
      enable_public_quotes,
      whatsapp_number
    }).eq('id', id)

    redirect(`/projects/${id}/settings?success=true`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
          <p className="text-sm text-gray-500">{project.name}</p>
        </div>
      </div>

      <form action={updateSettings} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-8">

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 border-b pb-2">General Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name</label>
            <input type="text" name="name" defaultValue={project.name} required className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Public Slug URL</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">aypinventory.com/p/</span>
              <input type="text" name="slug" defaultValue={project.slug} required className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-gray-300 py-2 px-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" defaultValue={project.description || ''} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"></textarea>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Public Map Visibility</h2>

          <div className="flex items-center">
            <input name="is_public" type="checkbox" defaultChecked={project.is_public} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            <label className="ml-2 block text-sm font-medium text-gray-900">Project is Public</label>
          </div>

          <div className="flex items-center">
            <input name="show_prices" type="checkbox" defaultChecked={project.show_prices} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            <label className="ml-2 block text-sm text-gray-700">Show unit prices on the public map</label>
          </div>

          <div className="flex items-center">
            <input name="show_sold_prices" type="checkbox" defaultChecked={project.show_sold_prices} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            <label className="ml-2 block text-sm text-gray-700">Show prices for units that are already SOLD</label>
          </div>

          <div className="flex items-center">
            <input name="show_sqm" type="checkbox" defaultChecked={project.show_sqm} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            <label className="ml-2 block text-sm text-gray-700">Show area (sqm) on the public map</label>
          </div>

          <div className="flex items-center">
            <input name="enable_public_quotes" type="checkbox" defaultChecked={project.enable_public_quotes} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            <label className="ml-2 block text-sm text-gray-700">Enable automatic public quotes / Payment Simulator</label>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Contact Integrations</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
            <p className="text-xs text-gray-500 mb-1">If provided, a floating WhatsApp button will appear on the public map. Include country code without plus sign.</p>
            <input type="text" name="whatsapp_number" defaultValue={project.whatsapp_number || ''} placeholder="573001234567" className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm" />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" className="flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}

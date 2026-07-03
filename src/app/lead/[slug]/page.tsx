import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'

export default async function PublicLeadFormPage({ params, searchParams }: { params: { slug: string }, searchParams: { lotId?: string; success?: string; error?: string } }) {
  const supabase = await createClient()
  const { slug } = await params;
  const sParams = await searchParams;

  // Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, organization_id, is_public')
    .eq('slug', slug)
    .single()

  if (!project || !project.is_public) {
    notFound()
  }

  // Fetch optional lot details if inquiry is specific
  let lot = null
  if (sParams.lotId) {
     const { data: l } = await supabase.from('lots').select('identifier').eq('id', sParams.lotId).single()
     lot = l
  }

  async function submitLead(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const firstName = formData.get('first_name') as string
    const lastName = formData.get('last_name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const pId = formData.get('project_id') as string
    const orgId = formData.get('organization_id') as string
    const source = formData.get('source') as string
    const lotId = formData.get('lot_id') as string
    const lotIdentifier = formData.get('lot_identifier') as string

    // 1. Get default stage for org (first stage by order)
    const { data: defaultStage } = await supabase
       .from('pipeline_stages')
       .select('id')
       .eq('organization_id', orgId)
       .order('stage_order', { ascending: true })
       .limit(1)
       .single()

    // 2. Insert Lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: orgId,
        project_id: pId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        source,
        stage_id: defaultStage?.id
      })
      .select('id')
      .single()

    if (leadError || !leadData) {
       console.error("Error creating lead", leadError)
       redirect(`/lead/${slug}?error=true`)
    }

    // 3. Insert Activity
    const activityType = lotId ? 'lot_inquiry' : 'form_submitted'
    const description = lotId
       ? `Customer inquired about unit ${lotIdentifier}`
       : `Customer filled out the public contact form`

    await supabase.from('lead_activities').insert({
       organization_id: orgId,
       lead_id: leadData.id,
       activity_type: activityType,
       description: description,
       metadata: lotId ? { lot_id: lotId, lot_identifier: lotIdentifier } : {}
    })

    redirect(`/lead/${slug}?success=true`)
  }

  if (sParams.success) {
     return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
           <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                 <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                 </svg>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900">Thank you!</h2>
              <p className="mt-2 text-gray-600">Your information has been received. Our sales team will contact you shortly.</p>
           </div>
        </div>
     )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Interested in {project.name}?
        </h2>
        {lot && (
           <p className="mt-2 text-center text-sm text-indigo-600 font-medium bg-indigo-50 py-1.5 px-3 rounded-full w-max mx-auto border border-indigo-100">
              Inquiring about Unit: {lot.identifier}
           </p>
        )}
        <p className="mt-4 text-center text-sm text-gray-600">
          Leave your details below and an advisor will reach out to you.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {sParams.error && (
             <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">
                There was an error submitting your request. Please try again.
             </div>
          )}
          <form className="space-y-5" action={submitLead}>
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="organization_id" value={project.organization_id} />
            <input type="hidden" name="source" value={lot ? 'public_map' : 'contact_form'} />
            {lot && (
               <>
                  <input type="hidden" name="lot_id" value={sParams.lotId} />
                  <input type="hidden" name="lot_identifier" value={lot.identifier} />
               </>
            )}

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</label>
                  <div className="mt-1">
                  <input id="first_name" name="first_name" type="text" required className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
               </div>
               <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last Name</label>
                  <div className="mt-1">
                  <input id="last_name" name="last_name" type="text" required className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
               </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input id="email" name="email" type="email" autoComplete="email" required className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="mt-1">
                <input id="phone" name="phone" type="tel" required className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                Request Information
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

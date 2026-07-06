'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { X, Mail, Phone, Calendar, Clock, MapPin, Activity } from 'lucide-react'
import { format } from 'date-fns'
import PaymentSimulator from '@/components/custom/PaymentSimulator'
import { generateQuotePDF } from '@/utils/pdf'

type LeadDrawerProps = {
  leadId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function LeadDrawer({ leadId, isOpen, onClose }: LeadDrawerProps) {
  const [lead, setLead] = useState<any>(null)
  const [activities, setActivities] = useState<{id: string, activity_type: string, description: string, created_at: string, metadata?: { lot_identifier?: string }}[]>([])
  const [discountRules, setDiscountRules] = useState<any[]>([])
  const [showSimulator, setShowSimulator] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!leadId || !isOpen) return

    const fetchLeadData = async () => {
      setLoading(true)

      const { data: leadData } = await supabase
        .from('leads')
        .select('*, projects(name), pipeline_stages(name)')
        .eq('id', leadId)
        .single()

      setLead(leadData)

      const { data: acts } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      setActivities(acts || [])

      const { data: rules } = await supabase.from('discount_rules').select('*').eq('project_id', leadData.project_id)
      setDiscountRules(rules || [])
      setLoading(false)
    }

    fetchLeadData()
  }, [leadId, isOpen]) // Added dependencies

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-gray-200">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : lead ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h2>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset uppercase
                    ${lead.temperature === 'hot' ? 'bg-red-50 text-red-700 ring-red-600/10' :
                      lead.temperature === 'warm' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                      'bg-blue-50 text-blue-700 ring-blue-600/20'}`}
                  >
                    {lead.temperature}
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-medium">{lead.projects?.name} • Stage: {lead.pipeline_stages?.name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full -mr-2">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto">

              {/* Contact Info Card */}
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center text-sm">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-3">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Email</p>
                      <p className="font-medium text-gray-900">{lead.email || 'No email provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-3">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Phone</p>
                      <p className="font-medium text-gray-900">{lead.phone || 'No phone provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-3">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Source</p>
                      <p className="font-medium text-gray-900 capitalize">{lead.source?.replace('_', ' ') || 'Direct'}</p>
                    </div>
                  </div>
                </div>
              </div>


              {showSimulator && lead.projects && (
                 <div className="p-6 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Quotation Simulator</h3>
                    <p className="text-xs text-gray-500 mb-4">Select a base price to simulate. In a real scenario, the commercial would select a lot and it would pull the price.</p>
                    <PaymentSimulator basePrice={150000} discountRules={discountRules} />
                 </div>
              )}
              {/* Timeline */}

              <div className="p-6">
                <div className="flex items-center mb-6">
                  <Activity className="w-5 h-5 text-gray-400 mr-2" />
                  <h3 className="text-sm font-semibold text-gray-900">Activity Timeline</h3>
                </div>

                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">

                  {activities.map((act, idx) => (
                    <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      {/* Icon */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <ActivityIcon type={act.activity_type} />
                      </div>

                      {/* Card */}
                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900 text-sm capitalize">{act.activity_type.replace('_', ' ')}</span>
                          <time className="text-xs font-medium text-gray-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {format(new Date(act.created_at), 'MMM d, h:mm a')}
                          </time>
                        </div>
                        <p className="text-sm text-gray-600">{act.description}</p>

                        {act.metadata?.lot_identifier && (
                          <div className="mt-3 bg-gray-50 rounded p-2 text-xs border border-gray-100 flex items-center">
                            <span className="font-medium text-gray-700">Unit: </span>
                            <span className="ml-1 bg-white px-1.5 py-0.5 rounded border border-gray-200">{act.metadata.lot_identifier}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {activities.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No activities recorded yet.
                    </div>
                  )}

                  {/* Creation Event at the bottom */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-green-100 text-green-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4">
                      <time className="font-medium text-gray-400 text-sm">
                        {format(new Date(lead.created_at), 'MMMM d, yyyy')}
                      </time>
                      <p className="text-sm text-gray-600 mt-1">Lead created in system</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex gap-3">
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={async () => {
                 // Demo Quote Generation
                 if (!lead.projects) {
                    alert('Lead has no associated project.');
                    return;
                 }
                 const { data: lots } = await supabase.from('lots').select('*').eq('project_id', lead.projects.id).limit(1);
                 if (!lots || lots.length === 0) {
                    alert('No lots available in this project to quote.');
                    return;
                 }
                 const demoLot = lots[0];
                 const code = 'QT-' + Math.random().toString(36).substr(2, 6).toUpperCase();

                 const quoteData = {
                    organization_id: lead.organization_id,
                    project_id: lead.project_id,
                    lot_id: demoLot.id,
                    lead_id: lead.id,
                    human_readable_code: code,
                    base_price: demoLot.price || 100000,
                    final_price: demoLot.price || 100000,
                    down_payment_percent: 30,
                    down_payment_amount: (demoLot.price || 100000) * 0.3,
                    financed_amount: (demoLot.price || 100000) * 0.7,
                    term_months: 24,
                    monthly_installment: ((demoLot.price || 100000) * 0.7) / 24,
                    valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                 };

                 const { data, error } = await supabase.from('quotations').insert(quoteData).select().single();

                 if (!error && data) {
                    generateQuotePDF(data, lead.projects, demoLot);
                 } else {
                    alert('Failed to generate quote. Check console.');
                    console.error(error);
                 }

              }}>Generate PDF Quote</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowSimulator(!showSimulator)}>Simulator</Button>
              <Button variant="outline" className="flex-1">Add Note</Button>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

function ActivityIcon({ type }: { type: string }) {
  switch(type) {
    case 'form_submitted': return <Mail className="w-4 h-4" />
    case 'lot_inquiry': return <MapPin className="w-4 h-4" />
    case 'stage_changed': return <Activity className="w-4 h-4" />
    default: return <Clock className="w-4 h-4" />
  }
}

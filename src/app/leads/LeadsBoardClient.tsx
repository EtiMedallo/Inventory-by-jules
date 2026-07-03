'use client'

import React, { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import LeadDrawer from './components/LeadDrawer'

type Stage = {
  id: string
  name: string
  color: string
}

type Lead = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  stage_id: string
  source: string
  temperature: 'cold' | 'warm' | 'hot'
  created_at: string
  projects: { name: string } | null
}

export default function LeadsBoardClient({
  initialStages,
  initialLeads,
  orgId
}: {
  initialStages: Stage[]
  initialLeads: Lead[]
  orgId: string
}) {
  const [stages] = useState(initialStages)
  const [leads, setLeads] = useState(initialLeads)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const supabase = createClient()

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const newStageId = destination.droppableId
    const leadId = draggableId

    // Optimistic UI update
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, stage_id: newStageId } : lead
      )
    )

    // Update DB
    const { error } = await supabase
      .from('leads')
      .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
      .eq('id', leadId)

    if (error) {
      console.error("Failed to move lead", error)
      // Revert on error
      setLeads(initialLeads)
    } else {
       // Log activity
       await supabase.from('lead_activities').insert({
         organization_id: orgId,
         lead_id: leadId,
         activity_type: 'stage_changed',
         description: `Lead moved to stage ${stages.find(s => s.id === newStageId)?.name}`
       })
    }
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 h-full items-start min-w-max">
          {stages.map(stage => {
            const stageLeads = leads.filter(l => l.stage_id === stage.id)

            return (
              <div key={stage.id} className="w-80 bg-gray-100/50 rounded-xl flex flex-col max-h-full overflow-hidden border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white/50">
                  <h3 className="font-semibold text-gray-700 flex items-center">
                    <span className={`w-2.5 h-2.5 rounded-full mr-2 bg-${stage.color}-500`} style={{ backgroundColor: getHexColor(stage.color) }}></span>
                    {stage.name}
                  </h3>
                  <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium">
                    {stageLeads.length}
                  </span>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                    >
                      {stageLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedLeadId(lead.id)}
                              className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-indigo-300 hover:shadow transition-all
                                ${snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500/20' : ''}
                              `}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900">{lead.first_name} {lead.last_name}</h4>
                                <TemperatureBadge temp={lead.temperature} />
                              </div>
                              <p className="text-sm text-gray-500 truncate mb-3">{lead.projects?.name || 'No Project'}</p>

                              <div className="flex justify-between items-center text-xs text-gray-400">
                                <span className="capitalize bg-gray-100 px-2 py-1 rounded">{lead.source?.replace('_', ' ') || 'Direct'}</span>
                                <span>{formatDistanceToNow(new Date(lead.created_at))} ago</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {/* Slide-out Drawer */}
      <LeadDrawer
        leadId={selectedLeadId}
        isOpen={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
    </>
  )
}

function TemperatureBadge({ temp }: { temp: string }) {
  const colors = {
    cold: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    warm: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
    hot: 'bg-red-50 text-red-700 ring-red-600/10'
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset uppercase ${colors[temp as keyof typeof colors]}`}>
      {temp}
    </span>
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

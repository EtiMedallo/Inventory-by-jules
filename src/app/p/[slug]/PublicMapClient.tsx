'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Map, Info, Image as ImageIcon, X, Heart, MessageCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Project = { slug: string;
  id: string
  name: string
  description: string
  floor_plan_url: string | null
  organizations: { name: string }
  organization_id: string
  show_prices: boolean
  show_sold_prices: boolean
  show_sqm: boolean
  whatsapp_number: string | null
  enable_public_quotes: boolean
}

type LotMedia = {
  id: string
  media_url: string
  media_type: string
}

type Lot = {
  id: string
  identifier: string
  status: string
  description: string | null
  area_sqm: number | null
  price: number | null
  polygon_data: { points: { x: number; y: number }[] }
  lot_media: LotMedia[]
}

export default function PublicMapClient({ project, lots }: { project: Project, lots: Lot[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null)

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return

    const { clientWidth, clientHeight } = wrapperRef.current

    const c = new fabric.Canvas(canvasRef.current, {
      width: clientWidth,
      height: clientHeight,
      selection: false,
      preserveObjectStacking: true,
      renderOnAddRemove: false
    })

    setCanvas(c)

    const handleResize = () => {
      if (wrapperRef.current && c) {
        c.setDimensions({
          width: wrapperRef.current.clientWidth,
          height: wrapperRef.current.clientHeight
        })
        c.renderAll()
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      c.dispose()
    }
  }, [])

  // Load Map and Polygons
  useEffect(() => {
    if (!canvas) return

    const loadCanvasData = async () => {
      if (project.floor_plan_url) {
        try {
          const img = await fabric.FabricImage.fromURL(project.floor_plan_url, {
             crossOrigin: 'anonymous'
          })

          const scale = Math.min(
            (canvas.width || 800) / img.width!,
            (canvas.height || 600) / img.height!
          );

          img.set({
            scaleX: scale * 0.95,
            scaleY: scale * 0.95,
            left: (canvas.width || 800) / 2,
            top: (canvas.height || 600) / 2,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          })

          canvas.add(img)
          canvas.sendObjectToBack(img)

        } catch (e) {
          console.error("Failed to load background image", e)
        }
      }

      lots.forEach(lot => {
        if (lot.polygon_data && lot.polygon_data.points) {
          const poly = new fabric.Polygon(lot.polygon_data.points, {
            fill: getStatusColor(lot.status),
            stroke: 'white',
            strokeWidth: 1,
            opacity: 0.6,
            selectable: false,
            hoverCursor: 'pointer',
            perPixelTargetFind: true,
          })

          poly.set('id', lot.id)

          poly.on('mouseover', () => {
             poly.set('opacity', 0.8)
             poly.set('strokeWidth', 2)
             canvas.renderAll()
          })

          poly.on('mouseout', () => {
             poly.set('opacity', 0.6)
             poly.set('strokeWidth', 1)
             canvas.renderAll()
          })

          poly.on('mousedown', () => {
             setSelectedLot(lot)
          })

          canvas.add(poly)
        }
      })

      canvas.renderAll()
    }

    loadCanvasData()
  }, [canvas, project.floor_plan_url]) // intentional dependency limit

  return (
    <>
      {/* Sidebar / Project Info */}
      <div className={`bg-white shadow-2xl transition-all duration-300 flex flex-col z-20
      fixed md:relative bottom-0 w-full md:w-auto h-[50vh] md:h-full rounded-t-3xl md:rounded-none
      ${selectedLot ? 'md:w-96 translate-y-0' : 'md:w-80 translate-y-full md:translate-y-0'}`}>
        {!selectedLot ? (
           <div className="p-6 h-full flex flex-col">
              <div className="mb-8">
                 <h2 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">{project.organizations?.name}</h2>
                 <h1 className="text-3xl font-bold text-gray-900 mt-1">{project.name}</h1>
                 {project.description && (
                    <p className="mt-4 text-gray-600 leading-relaxed">{project.description}</p>
                 )}
              </div>

              <div className="mt-auto bg-gray-50 p-4 rounded-xl border border-gray-100">
                 <h3 className="font-semibold text-gray-800 mb-3 text-sm">Legend</h3>
                 <div className="space-y-2 text-sm">
                    <LegendItem color="bg-green-500" label="Available" />
                    <LegendItem color="bg-yellow-500" label="Reserved" />
                    <LegendItem color="bg-red-500" label="Sold" />
                    <LegendItem color="bg-purple-500" label="Negotiation" />
                    <LegendItem color="bg-blue-500" label="Social Zone" />
                 </div>
              </div>
           </div>
        ) : (
           <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h2 className="font-bold text-xl text-gray-900">Unit {selectedLot.identifier}</h2>
                 <Button variant="ghost" size="icon" onClick={() => setSelectedLot(null)}>
                    <X className="w-5 h-5 text-gray-500" />
                 </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                 <div className="inline-flex px-3 py-1 rounded-full text-sm font-medium mb-6 capitalize"
                      style={{ backgroundColor: getStatusColor(selectedLot.status).replace('0.8', '0.1'), color: getStatusColor(selectedLot.status).replace('0.8', '1') }}>
                    {selectedLot.status.replace('_', ' ')}
                 </div>

                 {selectedLot.description && (
                    <div className="mb-6">
                       <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                       <p className="text-gray-700">{selectedLot.description}</p>
                    </div>
                 )}

                 {(selectedLot.area_sqm || selectedLot.price) && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                       {selectedLot.area_sqm && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <span className="text-xs text-gray-500 block mb-1">Area</span>
                             <span className="font-semibold text-gray-900">{selectedLot.area_sqm} m²</span>
                          </div>
                       )}
                       {selectedLot.price && selectedLot.status === 'available' && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <span className="text-xs text-gray-500 block mb-1">Price</span>
                             <span className="font-semibold text-gray-900">${selectedLot.price.toLocaleString()}</span>
                          </div>
                       )}
                    </div>
                 )}

                 {selectedLot.lot_media && selectedLot.lot_media.length > 0 && (
                    <div>
                       <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Gallery</h4>
                       <div className="grid grid-cols-2 gap-2">
                          {selectedLot.lot_media.map((media, i) => (
                             <div key={media.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={media.media_url} alt={`Media ${i+1}`} className="w-full h-full object-cover" />
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {(!selectedLot.lot_media || selectedLot.lot_media.length === 0) && (
                     <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No media available</p>
                     </div>
                 )}
              </div>


                 <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
                    <Link href={`/lead/${project.slug}?lotId=${selectedLot.id}`} className="col-span-2">
                      <button className="flex justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 w-full h-12 items-center text-lg">Contact Sales</button>
                    </Link>
                    <button className="flex justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold leading-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 w-full" onClick={async () => {
                        const supabase = createClient();
                        await supabase.from('leads').insert({
                            project_id: project.id,
                            organization_id: project.organization_id,
                            first_name: 'Anonymous',
                            source: 'public_map_like'
                        }).select().single().then(async ({ data }) => {
                            if(data) {
                                await supabase.from('lead_activities').insert({
                                    organization_id: project.organization_id,
                                    lead_id: data.id,
                                    activity_type: 'like',
                                    description: `Anonymous liked unit ${selectedLot.identifier}`,
                                    metadata: { lot_id: selectedLot.id, lot_identifier: selectedLot.identifier }
                                });
                                alert("Thanks for your interest! We registered your like.");
                            }
                        });
                    }}>
                       <Heart className="w-4 h-4 mr-2" /> Like
                    </button>
                    {project.whatsapp_number && (
                        <a href={`https://wa.me/${project.whatsapp_number}?text=Hi, I am interested in unit ${selectedLot.identifier} in ${project.name}`} target="_blank" rel="noreferrer">
                            <button className="flex justify-center rounded-md bg-green-50 px-3 py-1.5 text-sm font-semibold leading-6 text-green-700 shadow-sm ring-1 ring-inset ring-green-300 hover:bg-green-100 w-full items-center">
                               <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                            </button>
                        </a>
                    )}
                 </div>

           </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-slate-200" ref={wrapperRef}>
         <canvas ref={canvasRef} />

         <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm flex items-center text-sm font-medium text-gray-700">
            <Map className="w-4 h-4 mr-2" />
            Interactive Map
         </div>
      </div>
    </>
  )
}

function LegendItem({ color, label }: { color: string, label: string }) {
   return (
      <div className="flex items-center">
         <div className={`w-3 h-3 rounded-full mr-2 ${color}`}></div>
         <span className="text-gray-600">{label}</span>
      </div>
   )
}

function getStatusColor(status: string) {
  switch (status) {
    case 'available': return 'rgba(34, 197, 94, 0.8)' // Green
    case 'reserved': return 'rgba(234, 179, 8, 0.8)' // Yellow
    case 'sold': return 'rgba(239, 68, 68, 0.8)' // Red
    case 'negotiation': return 'rgba(168, 85, 247, 0.8)' // Purple
    case 'social_zone': return 'rgba(59, 130, 246, 0.8)' // Blue
    default: return 'rgba(156, 163, 175, 0.8)' // Gray
  }
}

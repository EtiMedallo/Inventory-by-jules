'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { MousePointer2, PenTool, Trash2, Save, Upload, Image as ImageIcon, FileSpreadsheet, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'

type Project = {
  id: string
  name: string
  organization_id: string
  floor_plan_url: string | null
}

type Lot = {
  id: string
  identifier: string
  status: string
  polygon_data: { points: { x: number; y: number }[] }
}

type EditorMode = 'select' | 'draw'

export default function MapEditorClient({ project, initialLots }: { project: Project, initialLots: Lot[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [mode, setMode] = useState<EditorMode>('select')
  const [lots, setLots] = useState<Lot[]>(initialLots)
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'mapped' | 'unmapped'>('all')
  const [linkingLotId, setLinkingLotId] = useState<string | null>(null)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  // Drawing state
  const [points, setPoints] = useState<{x: number, y: number}[]>([])
  const [activeShape, setActiveShape] = useState<fabric.Polygon | null>(null)
  const [activeLine, setActiveLine] = useState<fabric.Line | null>(null)

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return

    const { clientWidth, clientHeight } = wrapperRef.current

    const c = new fabric.Canvas(canvasRef.current, {
      width: clientWidth,
      height: clientHeight,
      selection: mode === 'select',
      preserveObjectStacking: true,
    })

    setCanvas(c)

    // Zoom and Pan
    c.on('mouse:wheel', function(opt) {
      const delta = opt.e.deltaY;
      let zoom = c.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      c.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    c.on('mouse:down', function(opt) {
      if (opt.e.altKey || mode === 'select') {
         // Allow dragging only if alt key is pressed OR if in select mode and clicking on empty space
         if (opt.e.altKey || !opt.target) {
             isDragging = true;
             c.selection = false;
             lastPosX = (opt.e as MouseEvent).clientX;
             lastPosY = (opt.e as MouseEvent).clientY;
         }
      }
    });

    c.on('mouse:move', function(opt) {
      if (isDragging) {
        const e = opt.e;
        const vpt = c.viewportTransform;
        if(vpt) {
            vpt[4] += (e as MouseEvent).clientX - lastPosX;
            vpt[5] += (e as MouseEvent).clientY - lastPosY;
        }
        c.requestRenderAll();
        lastPosX = (e as MouseEvent).clientX;
        lastPosY = (e as MouseEvent).clientY;
      }
    });

    c.on('mouse:up', function(opt) {
      c.setViewportTransform(c.viewportTransform!);
      isDragging = false;
      c.selection = mode === 'select';
    });


    const handleResize = () => {
      if (wrapperRef.current && c) {
        c.setDimensions({
          width: wrapperRef.current.clientWidth,
          height: wrapperRef.current.clientHeight
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      c.dispose()
    }
  }, []) // Empty dependency array, initialize once

  // Load Background Image and initial polygons
  useEffect(() => {
    if (!canvas) return

    const loadCanvasData = async () => {
      if (project.floor_plan_url) {
        try {
          const img = await fabric.FabricImage.fromURL(project.floor_plan_url, {
             crossOrigin: 'anonymous'
          })

          // Calculate scale to fit canvas width or height while maintaining aspect ratio
          const scale = Math.min(
            (canvas.width || 800) / img.width!,
            (canvas.height || 600) / img.height!
          );

          img.set({
            scaleX: scale * 0.9,
            scaleY: scale * 0.9,
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

      // Load existing polygons
      lots.forEach(lot => {
        if (lot.polygon_data && lot.polygon_data.points) {
          const poly = new fabric.Polygon(lot.polygon_data.points, {
            fill: getStatusColor(lot.status),
            stroke: 'black',
            strokeWidth: 2,
            opacity: 0.5,
            selectable: true,
            hasControls: false,
            hasBorders: true,
            hoverCursor: 'pointer',
          })
          poly.set('id', lot.id)
          poly.set('identifier', lot.identifier)
          canvas.add(poly)
        }
      })

      canvas.renderAll()
    }

    loadCanvasData()
  }, [canvas, project.floor_plan_url]) // Removed lots from dependencies to prevent infinite loops, polygons are added once on mount

  // Update canvas interactions based on mode
  useEffect(() => {
    if (!canvas) return
    canvas.set({ selection: mode === 'select' })
    canvas.setCursor(mode === 'draw' ? 'crosshair' : 'default')
    canvas.getObjects().forEach(obj => {
      if (obj.type === 'polygon') {
        obj.set({
           selectable: mode === 'select',
           evented: mode === 'select'
        })
      }
    })
    canvas.renderAll()
  }, [mode, canvas])



  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'polygon' && activeObj.get('id')) {
         const id = activeObj.get('id') as string;
         const lot = lots.find(l => l.id === id);
         if (lot) setSelectedLot(lot);
      } else {
         setSelectedLot(null);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedLot(null));

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared');
    };
  }, [canvas, lots]);


  const finishDrawing = async () => {
     if (!canvas || points.length < 3) return

     // Remove temporary shapes
     if (activeShape) canvas.remove(activeShape)
     if (activeLine) canvas.remove(activeLine)

     // Remove drawing circles
     canvas.getObjects().forEach(obj => {
        if (obj.type === 'circle') canvas.remove(obj)
     })

     let identifier = "";
     let targetLotId = null;
     if (linkingLotId) {
         const target = lots.find(l => l.id === linkingLotId);
         identifier = target?.identifier || "";
         targetLotId = linkingLotId;
     } else {
         identifier = prompt("Enter Lot/Unit Identifier (e.g. L-01):") || "";
         if (!identifier) {
            setPoints([])
            setActiveShape(null)
            setActiveLine(null)
            canvas.renderAll()
            return
         }
     }

     const finalPoly = new fabric.Polygon([...points], {
        fill: getStatusColor('available'),
        stroke: 'black',
        strokeWidth: 2,
        opacity: 0.5,
        selectable: mode === 'select',
        hasControls: false,
        hasBorders: true,
     })

     canvas.add(finalPoly)

     // Save to database
     try {
        let data, error;
        if (targetLotId) {
            // Update existing unmapped lot
            const res = await supabase.from('lots')
               .update({ polygon_data: { points: points } })
               .eq('id', targetLotId)
               .select().single();
            data = res.data; error = res.error;
            setLinkingLotId(null);
            setMode('select');
        } else {
            // Insert new lot
            const res = await supabase.from('lots').insert({
               project_id: project.id,
               organization_id: project.organization_id,
               identifier: identifier,
               status: 'available',
               polygon_data: { points: points }
            }).select().single();
            data = res.data; error = res.error;
        }

        if (error) throw error

        finalPoly.set('id', data.id)
        finalPoly.set('identifier', data.identifier)
        setLots(prev => { const idx = prev.findIndex(l => l.id === data.id); if (idx > -1) { const newArr = [...prev]; newArr[idx] = data; return newArr; } else { return [...prev, data] } })

     } catch (err) {
        console.error("Error saving lot:", err)
        alert("Failed to save lot. Identifier must be unique per project.")
        canvas.remove(finalPoly)
     }

     setPoints([])
     setActiveShape(null)
     setActiveLine(null)
     canvas.renderAll()
  }

  // Drawing Logic
  useEffect(() => {
    if (!canvas || mode !== 'draw') return

    const handleMouseDown = (o: fabric.TEvent) => {
      const pointer = canvas.getScenePoint(o.e)

      points.push({ x: pointer.x, y: pointer.y })

      // Create a temporary circle at the click point
      const circle = new fabric.Circle({
        radius: 3,
        fill: 'red',
        left: pointer.x,
        top: pointer.y,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false
      })
      canvas.add(circle)

      if (points.length > 1) {
         // Create the actual polygon
         if (activeShape) canvas.remove(activeShape)
         const poly = new fabric.Polygon([...points], {
            fill: 'rgba(0, 0, 255, 0.3)',
            stroke: 'blue',
            strokeWidth: 2,
            selectable: false,
            evented: false
         })
         setActiveShape(poly)
         canvas.add(poly)
      }
    }

    const handleMouseMove = (o: fabric.TEvent) => {
      if (points.length === 0) return
      const pointer = canvas.getScenePoint(o.e)

      if (activeLine) canvas.remove(activeLine)

      const lastPoint = points[points.length - 1]
      const line = new fabric.Line([lastPoint.x, lastPoint.y, pointer.x, pointer.y], {
         stroke: 'red',
         strokeWidth: 2,
         selectable: false,
         evented: false
      })
      setActiveLine(line)
      canvas.add(line)
      canvas.renderAll()
    }

    // Double click to finish drawing
    const handleDoubleClick = () => {
       if (points.length > 2) {
         finishDrawing()
       }
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:dblclick', handleDoubleClick)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:dblclick', handleDoubleClick)
    }
  }, [canvas, mode, points, activeShape, activeLine])



  const handleDelete = async () => {
     if (!canvas) return
     const activeObjects = canvas.getActiveObjects()
     if (activeObjects.length === 0) return

     if (!confirm("Are you sure you want to delete selected lots?")) return

     for (const obj of activeObjects) {
        if (obj.type === 'polygon' && obj.get('id')) {
           const id = obj.get('id') as string
           await supabase.from('lots').delete().eq('id', id)
           canvas.remove(obj)
           setLots(prev => prev.filter(l => l.id !== id))
        }
     }
     canvas.discardActiveObject()
     canvas.renderAll()
  }



  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'numero': 'L-01', 'metro 2': 150.5, 'precio': 120000, 'estado': 'disponible' },
      { 'numero': 'L-02', 'metro 2': 200.0, 'precio': 150000, 'estado': 'reservado' },
      { 'numero': 'L-03', 'metro 2': 180.0, 'precio': 140000, 'estado': 'vendido' },
      { 'numero': 'Z-01', 'metro 2': 500.0, 'precio': 0, 'estado': 'social_zone' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "ayp_inventario_template.xlsx");
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        setIsUploading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newLots = [];

        for (const row of data as Record<string, string | number>[]) {
          const identifier = row['numero'] || row['Numero'] || row['identifier'];
          const area = row['metro 2'] || row['Metro 2'] || row['area'] || 0;
          const price = row['precio'] || row['Precio'] || row['price'] || 0;
          let rawStatus = (row['estado'] || row['Estado'] || 'disponible').toString().toLowerCase();

          // Normalize status
          if (rawStatus === 'disponible') rawStatus = 'available';
          else if (rawStatus === 'reservado') rawStatus = 'reserved';
          else if (rawStatus === 'vendido') rawStatus = 'sold';
          else if (rawStatus === 'negociacion') rawStatus = 'negotiation';
          else if (rawStatus === 'zona social') rawStatus = 'social_zone';

          if (!identifier) continue;

          // Note: polygons will be empty, they will need to be drawn later
          newLots.push({
            project_id: project.id,
            organization_id: project.organization_id,
            identifier: String(identifier),
            area_sqm: Number(area),
            price: Number(price),
            status: rawStatus,
            polygon_data: {}
          });
        }

        if (newLots.length > 0) {
          const { data: insertedData, error } = await supabase
            .from('lots')
            .upsert(newLots, { onConflict: 'project_id, identifier' })
            .select();

          if (error) throw error;

          alert(`Successfully imported ${newLots.length} units!`);
          window.location.reload(); // Reload to fetch and display the new lots cleanly
        }

      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to import Excel file. Please ensure it follows the template format.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  }


  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setIsUploading(true)
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const filePath = `${project.id}/${Math.random()}.${fileExt}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('project-floor-plans')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('project-floor-plans')
        .getPublicUrl(filePath)

      await supabase.from('projects')
        .update({ floor_plan_url: publicUrl })
        .eq('id', project.id)

      window.location.reload()
    } catch (err) {
      console.error(err)
      alert("Error uploading image")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex h-full bg-slate-50">
      {/* Canvas Area */}
      <div className="flex-1 relative" ref={wrapperRef}>
        <canvas ref={canvasRef} />

        {/* Toolbar Overlay */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-2 flex flex-col gap-2">
          <Button
            variant={mode === 'select' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => { setMode('select'); setPoints([]); }}
            title="Select Mode"
          >
            <MousePointer2 className="w-5 h-5" />
          </Button>
          <Button
            variant={mode === 'draw' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setMode('draw')}
            title="Draw Polygon (Double click to finish)"
          >
            <PenTool className="w-5 h-5" />
          </Button>
          <div className="h-px bg-gray-200 my-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            title="Delete Selected"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>

        {mode === 'draw' && (
           <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md shadow-sm text-sm border border-yellow-200">
             Click to add points. Double-click to finish drawing the polygon.
           </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-[rgba(0,0,0,0.05)_-4px_0_15px]">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Map Settings</h2>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Base Floor Plan</label>
            {project.floor_plan_url ? (
              <div className="text-sm text-green-600 flex items-center bg-green-50 p-2 rounded">
                <ImageIcon className="w-4 h-4 mr-2" />
                Map Image Loaded
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  id="map-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleUploadImage}
                  disabled={isUploading}
                />
                <Button

                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={isUploading}
                >
                  <label htmlFor="map-upload">
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Base Image'}
                  </label>
                </Button>
              </div>
            )}
          </div>
        </div>


        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-3">Inventory Data</h2>
          <div className="flex gap-2">
             <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleDownloadTemplate}>
                <Download className="w-3 h-3 mr-1" /> Template
             </Button>
             <div>
                <input
                  type="file"
                  id="excel-upload"
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleImportExcel}
                  disabled={isUploading}
                />
                <Button variant="default" size="sm" className="w-full text-xs" onClick={() => document.getElementById('excel-upload')?.click()} disabled={isUploading}>
                   <FileSpreadsheet className="w-3 h-3 mr-1" /> Import Excel
                </Button>
             </div>
          </div>
        </div>



        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex border-b border-gray-200">
            <button className={`flex-1 py-2 text-xs font-medium ${activeTab === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`} onClick={() => setActiveTab('all')}>All ({lots.length})</button>
            <button className={`flex-1 py-2 text-xs font-medium ${activeTab === 'mapped' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`} onClick={() => setActiveTab('mapped')}>Mapped ({lots.filter(l => l.polygon_data && l.polygon_data.points).length})</button>
            <button className={`flex-1 py-2 text-xs font-medium ${activeTab === 'unmapped' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`} onClick={() => setActiveTab('unmapped')}>Unmapped ({lots.filter(l => !l.polygon_data || !l.polygon_data.points).length})</button>
          </div>

          <div className="p-4 space-y-2 overflow-y-auto">
            {lots
              .filter(l => {
                 if (activeTab === 'all') return true;
                 if (activeTab === 'mapped') return l.polygon_data && l.polygon_data.points;
                 if (activeTab === 'unmapped') return !l.polygon_data || !l.polygon_data.points;
                 return true;
              })
              .map(lot => (
              <div key={lot.id} className={`p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 ${linkingLotId === lot.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100'}`}
                onClick={() => {
                   if(canvas) {
                      const obj = canvas.getObjects().find(o => o.get('id') === lot.id);
                      if (obj) {
                         canvas.setActiveObject(obj);
                         canvas.requestRenderAll();
                      }
                   }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(lot.status) }} />
                  <div>
                     <span className="font-medium text-gray-700 block">{lot.identifier}</span>
                     {(!lot.polygon_data || !lot.polygon_data.points) && (
                         <span className="text-[10px] text-red-500">Needs polygon</span>
                     )}
                  </div>
                </div>
                {(!lot.polygon_data || !lot.polygon_data.points) && (
                    <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={(e) => {
                       e.stopPropagation();
                       setLinkingLotId(lot.id);
                       setMode('draw');
                    }}>Draw</Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedLot && (
           <div className="p-4 border-t border-gray-200 bg-slate-50 flex flex-col gap-3">
             <div className="flex justify-between items-center">
                 <h3 className="font-medium text-sm text-gray-700">Edit Unit {selectedLot.identifier}</h3>
                 <Button variant="ghost" size="sm" onClick={() => setSelectedLot(null)}><X className="w-4 h-4"/></Button>
             </div>

             <div className="grid gap-2">
               <label className="text-xs text-gray-500">Status</label>
               <select
                 className="w-full text-sm border p-1.5 rounded bg-white"
                 value={selectedLot.status}
                 onChange={async (e) => {
                    const newStatus = e.target.value;
                    const { error } = await supabase.from('lots').update({ status: newStatus }).eq('id', selectedLot.id);
                    if(!error) {
                       setLots(prev => prev.map(l => l.id === selectedLot.id ? {...l, status: newStatus} : l));
                       const obj = canvas?.getObjects().find(o => o.get('id') === selectedLot.id);
                       if(obj) {
                          obj.set('fill', getStatusColor(newStatus));
                          canvas?.renderAll();
                       }
                    }
                 }}
               >
                 <option value="available">Available</option>
                 <option value="reserved">Reserved</option>
                 <option value="sold">Sold</option>
                 <option value="negotiation">Negotiation</option>
               </select>

               <label className="text-xs text-gray-500 mt-1">Price</label>
               <input
                  type="number"
                  className="w-full text-sm border p-1.5 rounded"
                  defaultValue={(selectedLot as unknown as Record<string, string|number|null>).price || ''}
                  onBlur={async (e) => {
                     const val = parseFloat(e.target.value);
                     if(!isNaN(val)) {
                         await supabase.from('lots').update({ price: val }).eq('id', selectedLot.id);
                         setLots(prev => prev.map(l => l.id === selectedLot.id ? {...l, price: val} : l));
                     }
                  }}
               />

               <label className="text-xs text-gray-500 mt-1">Area (m²)</label>
               <input
                  type="number"
                  className="w-full text-sm border p-1.5 rounded"
                  defaultValue={(selectedLot as unknown as Record<string, string|number|null>).area_sqm || ''}
                  onBlur={async (e) => {
                     const val = parseFloat(e.target.value);
                     if(!isNaN(val)) {
                         await supabase.from('lots').update({ area_sqm: val }).eq('id', selectedLot.id);
                         setLots(prev => prev.map(l => l.id === selectedLot.id ? {...l, area_sqm: val} : l));
                     }
                  }}
               />

               <label className="text-xs text-gray-500 mt-1">Description</label>
               <textarea
                  className="w-full text-sm border p-1.5 rounded"
                  rows={2}
                  defaultValue={(selectedLot as unknown as Record<string, string|number|null>).description || ''}
                  onBlur={async (e) => {
                     const val = e.target.value;
                     await supabase.from('lots').update({ description: val }).eq('id', selectedLot.id);
                     setLots(prev => prev.map(l => l.id === selectedLot.id ? {...l, description: val} : l));
                  }}
               />
             </div>

             <div className="mt-2 pt-2 border-t border-gray-200">
                 <h4 className="font-medium text-xs text-gray-700 mb-2">Media</h4>
                 <input
                      type="file"
                      id="media-upload"
                      className="hidden"
                      accept="image/*"
                      disabled={mediaUploading}
                      onChange={async (e) => {
                          if (!e.target.files || e.target.files.length === 0) return;
                          setMediaUploading(true);
                          const file = e.target.files[0];
                          const fileExt = file.name.split('.').pop();
                          const filePath = `${selectedLot.id}/${Math.random()}.${fileExt}`;
                          try {
                              const { error: uploadError } = await supabase.storage.from('lot-media').upload(filePath, file);
                              if (uploadError) throw uploadError;
                              const { data: { publicUrl } } = supabase.storage.from('lot-media').getPublicUrl(filePath);
                              await supabase.from('lot_media').insert({ lot_id: selectedLot.id, media_url: publicUrl, media_type: 'image' });
                              alert("Media uploaded successfully!");
                          } catch (err) {
                              console.error(err);
                              alert("Error uploading media");
                          } finally {
                              setMediaUploading(false);
                          }
                      }}
                 />
                 <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => document.getElementById('media-upload')?.click()} disabled={mediaUploading}>
                     {mediaUploading ? 'Uploading...' : 'Upload Media'}
                 </Button>
             </div>
           </div>
        )}
      </div>
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

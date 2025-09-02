import React, { useRef, useEffect, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/stores/canvasStore'
import { CanvasObject, Tool } from '@/types/canvas'

interface CanvasEditorProps {
  width: number
  height: number
  onSelectionChange?: (objects: fabric.Object[]) => void
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  width,
  height,
  onSelectionChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const { 
    activeTool, 
    setCanvas, 
    addObject, 
    updateObject, 
    deleteObject,
    selectedObjects,
    setSelectedObjects
  } = useCanvasStore()

  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<fabric.Path | null>(null)

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    })

    // Configure canvas settings
    canvas.setZoom(1)
    canvas.absolutePan({ x: 0, y: 0 })

    // Store canvas reference
    fabricCanvasRef.current = canvas
    setCanvas(canvas)

    // Event handlers
    canvas.on('selection:created', handleSelectionChange)
    canvas.on('selection:updated', handleSelectionChange)
    canvas.on('selection:cleared', () => {
      setSelectedObjects([])
      onSelectionChange?.([])
    })

    canvas.on('object:modified', handleObjectModified)
    canvas.on('object:added', handleObjectAdded)
    canvas.on('object:removed', handleObjectRemoved)

    // Mouse events for drawing
    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    return () => {
      canvas.dispose()
    }
  }, [width, height])

  // Update canvas based on active tool
  useEffect(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    
    switch (activeTool) {
      case 'select':
        canvas.selection = true
        canvas.isDrawingMode = false
        canvas.defaultCursor = 'default'
        break
      case 'pen':
        canvas.selection = false
        canvas.isDrawingMode = true
        canvas.freeDrawingBrush.width = 2
        canvas.freeDrawingBrush.color = '#000000'
        break
      default:
        canvas.selection = true
        canvas.isDrawingMode = false
        canvas.defaultCursor = 'crosshair'
    }
  }, [activeTool])

  const handleSelectionChange = useCallback((e: fabric.IEvent) => {
    const activeObjects = fabricCanvasRef.current?.getActiveObjects() || []
    setSelectedObjects(activeObjects)
    onSelectionChange?.(activeObjects)
  }, [setSelectedObjects, onSelectionChange])

  const handleObjectModified = useCallback((e: fabric.IEvent) => {
    if (e.target) {
      updateObject(e.target.id || '', {
        left: e.target.left,
        top: e.target.top,
        scaleX: e.target.scaleX,
        scaleY: e.target.scaleY,
        angle: e.target.angle,
      })
    }
  }, [updateObject])

  const handleObjectAdded = useCallback((e: fabric.IEvent) => {
    if (e.target && !e.target.id) {
      const id = `object-${Date.now()}-${Math.random()}`
      e.target.set('id', id)
      
      addObject({
        id,
        type: e.target.type || 'unknown',
        data: e.target.toObject(),
        layerIndex: fabricCanvasRef.current?.getObjects().length || 0
      })
    }
  }, [addObject])

  const handleObjectRemoved = useCallback((e: fabric.IEvent) => {
    if (e.target?.id) {
      deleteObject(e.target.id)
    }
  }, [deleteObject])

  const handleMouseDown = useCallback((e: fabric.IEvent) => {
    if (activeTool === 'pen') return // Let fabric handle drawing mode

    const pointer = fabricCanvasRef.current?.getPointer(e.e)
    if (!pointer) return

    setIsDrawing(true)

    switch (activeTool) {
      case 'rectangle':
        addRectangle(pointer.x, pointer.y)
        break
      case 'circle':
        addCircle(pointer.x, pointer.y)
        break
      case 'text':
        addText(pointer.x, pointer.y)
        break
    }
  }, [activeTool])

  const handleMouseMove = useCallback((e: fabric.IEvent) => {
    if (!isDrawing || activeTool === 'pen' || activeTool === 'select') return
    // Handle object resizing while drawing
  }, [isDrawing, activeTool])

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false)
    setCurrentPath(null)
  }, [])

  const addRectangle = (x: number, y: number) => {
    const rect = new fabric.Rect({
      left: x,
      top: y,
      width: 100,
      height: 100,
      fill: '#3B82F6',
      stroke: '#1E40AF',
      strokeWidth: 2,
    })

    fabricCanvasRef.current?.add(rect)
    fabricCanvasRef.current?.setActiveObject(rect)
  }

  const addCircle = (x: number, y: number) => {
    const circle = new fabric.Circle({
      left: x,
      top: y,
      radius: 50,
      fill: '#F59E0B',
      stroke: '#D97706',
      strokeWidth: 2,
    })

    fabricCanvasRef.current?.add(circle)
    fabricCanvasRef.current?.setActiveObject(circle)
  }

  const addText = (x: number, y: number) => {
    const text = new fabric.Textbox('Click to edit text', {
      left: x,
      top: y,
      fontSize: 18,
      fontFamily: 'Inter, sans-serif',
      fill: '#111827',
      width: 200,
    })

    fabricCanvasRef.current?.add(text)
    fabricCanvasRef.current?.setActiveObject(text)
  }

  // Public methods for external tool usage
  const canvasActions = {
    addImage: (url: string, x: number = 100, y: number = 100) => {
      fabric.Image.fromURL(url, (img) => {
        img.set({
          left: x,
          top: y,
          scaleX: 0.5,
          scaleY: 0.5,
        })
        fabricCanvasRef.current?.add(img)
      })
    },

    deleteSelected: () => {
      const activeObjects = fabricCanvasRef.current?.getActiveObjects()
      if (activeObjects) {
        fabricCanvasRef.current?.remove(...activeObjects)
        fabricCanvasRef.current?.discardActiveObject()
      }
    },

    copySelected: () => {
      const activeObject = fabricCanvasRef.current?.getActiveObject()
      if (activeObject) {
        activeObject.clone((cloned: fabric.Object) => {
          cloned.set({
            left: (activeObject.left || 0) + 10,
            top: (activeObject.top || 0) + 10,
          })
          fabricCanvasRef.current?.add(cloned)
          fabricCanvasRef.current?.setActiveObject(cloned)
        })
      }
    },

    bringToFront: () => {
      const activeObject = fabricCanvasRef.current?.getActiveObject()
      if (activeObject) {
        fabricCanvasRef.current?.bringToFront(activeObject)
      }
    },

    sendToBack: () => {
      const activeObject = fabricCanvasRef.current?.getActiveObject()
      if (activeObject) {
        fabricCanvasRef.current?.sendToBack(activeObject)
      }
    },

    zoomIn: () => {
      const canvas = fabricCanvasRef.current
      if (canvas) {
        const zoom = canvas.getZoom()
        canvas.setZoom(Math.min(zoom * 1.1, 3))
      }
    },

    zoomOut: () => {
      const canvas = fabricCanvasRef.current
      if (canvas) {
        const zoom = canvas.getZoom()
        canvas.setZoom(Math.max(zoom * 0.9, 0.1))
      }
    },

    resetZoom: () => {
      fabricCanvasRef.current?.setZoom(1)
    },

    exportToSVG: () => {
      return fabricCanvasRef.current?.toSVG()
    },

    exportToJSON: () => {
      return fabricCanvasRef.current?.toJSON()
    },

    loadFromJSON: (json: string) => {
      fabricCanvasRef.current?.loadFromJSON(json, () => {
        fabricCanvasRef.current?.renderAll()
      })
    }
  }

  // Expose canvas actions to parent
  useEffect(() => {
    if (fabricCanvasRef.current) {
      (window as any).canvasActions = canvasActions
    }
  }, [])

  return (
    <div className="canvas-container relative">
      <canvas
        ref={canvasRef}
        className="border border-gray-300 shadow-sm"
        style={{ backgroundColor: '#ffffff' }}
      />
      
      {/* Canvas overlay for tool feedback */}
      <div className="absolute inset-0 pointer-events-none">
        {activeTool !== 'select' && (
          <div className="absolute top-2 left-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
            {activeTool} tool active
          </div>
        )}
      </div>
    </div>
  )
}

export default CanvasEditor

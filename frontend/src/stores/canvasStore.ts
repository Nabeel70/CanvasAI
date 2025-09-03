import { create } from 'zustand'
import { fabric } from 'fabric'
import { CanvasObject, Tool, LayerData } from '@/types/canvas'

interface CanvasState {
  // Canvas instance
  canvas: fabric.Canvas | null
  
  // Tools
  activeTool: Tool
  toolProperties: Record<string, any>
  
  // Objects and layers
  objects: Map<string, CanvasObject>
  layers: LayerData[]
  selectedObjects: fabric.Object[]
  
  // Canvas properties
  zoom: number
  panX: number
  panY: number
  
  // History
  history: string[]
  historyIndex: number
  
  // Collaboration
  isCollaborating: boolean
  collaborators: Array<{
    id: string
    name: string
    cursor?: { x: number; y: number }
    selection?: string[]
  }>
  
  // Actions
  setCanvas: (canvas: fabric.Canvas) => void
  setActiveTool: (tool: Tool) => void
  setToolProperties: (properties: Record<string, any>) => void
  
  // Object management
  addObject: (object: CanvasObject) => void
  updateObject: (id: string, updates: Partial<CanvasObject>) => void
  deleteObject: (id: string) => void
  setSelectedObjects: (objects: fabric.Object[]) => void
  
  // Layer management
  reorderLayers: (fromIndex: number, toIndex: number) => void
  toggleLayerVisibility: (layerId: string) => void
  toggleLayerLock: (layerId: string) => void
  
  // History management
  saveState: () => void
  undo: () => void
  redo: () => void
  
  // Canvas operations
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  
  // Collaboration
  setCollaborating: (isCollaborating: boolean) => void
  updateCollaborator: (collaborator: { id: string; name: string; cursor?: { x: number; y: number }; selection?: string[] }) => void
  removeCollaborator: (id: string) => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  canvas: null,
  activeTool: 'select',
  toolProperties: {},
  objects: new Map(),
  layers: [],
  selectedObjects: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  history: [],
  historyIndex: -1,
  isCollaborating: false,
  collaborators: [],

  // Canvas setup
  setCanvas: (canvas) => {
    set({ canvas })
  },

  // Tool management
  setActiveTool: (tool) => {
    set({ activeTool: tool })
    
    // Reset tool-specific properties
    const toolProperties: Record<Tool, any> = {
      select: {},
      pen: { width: 2, color: '#000000' },
      rectangle: { fill: '#3B82F6', stroke: '#1E40AF', strokeWidth: 2 },
      circle: { fill: '#F59E0B', stroke: '#D97706', strokeWidth: 2 },
      text: { fontSize: 18, fontFamily: 'Inter', fill: '#111827' },
    }
    
    set({ toolProperties: toolProperties[tool] || {} })
  },

  setToolProperties: (properties) => {
    set(state => ({
      toolProperties: { ...state.toolProperties, ...properties }
    }))
  },

  // Object management
  addObject: (object) => {
    set(state => {
      const newObjects = new Map(state.objects)
      newObjects.set(object.id, object)
      
      const newLayer: LayerData = {
        id: object.id,
        name: object.data.type || 'Layer',
        type: object.type,
        visible: true,
        locked: false,
        opacity: object.data.opacity || 1,
        order: state.layers.length
      }
      
      return {
        objects: newObjects,
        layers: [...state.layers, newLayer]
      }
    })
    get().saveState()
  },

  updateObject: (id, updates) => {
    set(state => {
      const newObjects = new Map(state.objects)
      const existing = newObjects.get(id)
      if (existing) {
        newObjects.set(id, { ...existing, ...updates })
      }
      return { objects: newObjects }
    })
    get().saveState()
  },

  deleteObject: (id) => {
    set(state => {
      const newObjects = new Map(state.objects)
      newObjects.delete(id)
      
      const newLayers = state.layers.filter(layer => layer.id !== id)
      
      return {
        objects: newObjects,
        layers: newLayers
      }
    })
    get().saveState()
  },

  setSelectedObjects: (objects) => {
    set({ selectedObjects: objects })
  },

  // Layer management
  reorderLayers: (fromIndex, toIndex) => {
    set(state => {
      const newLayers = [...state.layers]
      const [removed] = newLayers.splice(fromIndex, 1)
      newLayers.splice(toIndex, 0, removed)
      
      // Update order values
      newLayers.forEach((layer, index) => {
        layer.order = index
      })
      
      return { layers: newLayers }
    })
    
    // Update canvas object order
    const { canvas } = get()
    if (canvas) {
      // Reorder objects in canvas based on layer order
      const layers = get().layers
      layers.forEach((layer, index) => {
        const object = canvas.getObjects().find(obj => (obj as any).id === layer.id)
        if (object) {
          canvas.moveTo(object, index)
        }
      })
      canvas.renderAll()
    }
  },

  toggleLayerVisibility: (layerId) => {
    set(state => {
      const newLayers = state.layers.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
      return { layers: newLayers }
    })
    
    // Update canvas object visibility
    const { canvas } = get()
    if (canvas) {
      const object = canvas.getObjects().find(obj => (obj as any).id === layerId)
      if (object) {
        const layer = get().layers.find(l => l.id === layerId)
        object.set('visible', layer?.visible ?? true)
        canvas.renderAll()
      }
    }
  },

  toggleLayerLock: (layerId) => {
    set(state => {
      const newLayers = state.layers.map(layer =>
        layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
      )
      return { layers: newLayers }
    })
    
    // Update canvas object interactivity
    const { canvas } = get()
    if (canvas) {
      const object = canvas.getObjects().find(obj => (obj as any).id === layerId)
      if (object) {
        const layer = get().layers.find(l => l.id === layerId)
        object.set({
          selectable: !layer?.locked,
          evented: !layer?.locked
        })
        canvas.renderAll()
      }
    }
  },

  // History management
  saveState: () => {
    const { canvas, history, historyIndex } = get()
    if (!canvas) return
    
    const state = JSON.stringify(canvas.toJSON())
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(state)
    
    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift()
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    })
  },

  undo: () => {
    const { canvas, history, historyIndex } = get()
    if (!canvas || historyIndex <= 0) return
    
    const newIndex = historyIndex - 1
    const state = history[newIndex]
    
    canvas.loadFromJSON(state, () => {
      canvas.renderAll()
      set({ historyIndex: newIndex })
    })
  },

  redo: () => {
    const { canvas, history, historyIndex } = get()
    if (!canvas || historyIndex >= history.length - 1) return
    
    const newIndex = historyIndex + 1
    const state = history[newIndex]
    
    canvas.loadFromJSON(state, () => {
      canvas.renderAll()
      set({ historyIndex: newIndex })
    })
  },

  // Canvas operations
  setZoom: (zoom) => {
    set({ zoom })
    get().canvas?.setZoom(zoom)
  },

  setPan: (x, y) => {
    set({ panX: x, panY: y })
    get().canvas?.absolutePan({ x, y })
  },

  // Collaboration
  setCollaborating: (isCollaborating) => {
    set({ isCollaborating })
  },

  updateCollaborator: (collaborator) => {
    set(state => {
      const newCollaborators = state.collaborators.filter(c => c.id !== collaborator.id)
      newCollaborators.push(collaborator)
      return { collaborators: newCollaborators }
    })
  },

  removeCollaborator: (id) => {
    set(state => ({
      collaborators: state.collaborators.filter(c => c.id !== id)
    }))
  }
}))

// Canvas utilities
export const getSelectedObjectProperties = () => {
  const { selectedObjects } = useCanvasStore.getState()
  if (selectedObjects.length === 0) return null
  
  const obj = selectedObjects[0]
  return {
    fill: obj.fill,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    opacity: obj.opacity,
    left: obj.left,
    top: obj.top,
    width: obj.width,
    height: obj.height,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    angle: obj.angle,
  }
}

export const updateSelectedObjectProperties = (properties: Record<string, any>) => {
  const { canvas, selectedObjects } = useCanvasStore.getState()
  if (!canvas || selectedObjects.length === 0) return
  
  selectedObjects.forEach(obj => {
    obj.set(properties)
  })
  
  canvas.renderAll()
  useCanvasStore.getState().saveState()
}

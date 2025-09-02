import { fabric } from 'fabric'

export type Tool = 'select' | 'pen' | 'rectangle' | 'circle' | 'text'

export interface CanvasObject {
  id: string
  type: string
  data: fabric.Object
  layerIndex: number
  left?: number
  top?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  angle?: number
  opacity?: number
}

export interface LayerData {
  id: string
  name: string
  type: string
  visible: boolean
  locked: boolean
  opacity: number
  order: number
}

export interface ToolProperties {
  select: {}
  pen: {
    width: number
    color: string
    opacity?: number
  }
  rectangle: {
    fill: string
    stroke: string
    strokeWidth: number
    opacity?: number
  }
  circle: {
    fill: string
    stroke: string
    strokeWidth: number
    opacity?: number
  }
  text: {
    fontSize: number
    fontFamily: string
    fill: string
    fontWeight?: string
    fontStyle?: string
    textAlign?: string
  }
}

export interface ExportOptions {
  format: 'svg' | 'png' | 'jpeg' | 'pdf'
  quality?: number
  scale?: number
  width?: number
  height?: number
}

export interface CanvasState {
  zoom: number
  pan: { x: number; y: number }
  selection: string[]
  objects: CanvasObject[]
  layers: LayerData[]
}

export interface CollaboratorCursor {
  x: number
  y: number
  color: string
  name: string
}

export interface CollaborationEvent {
  type: 'object:added' | 'object:modified' | 'object:removed' | 'selection:changed' | 'cursor:moved'
  userId: string
  timestamp: number
  data: any
}

export interface PluginAPI {
  // Canvas operations
  addObject: (object: Partial<CanvasObject>) => void
  updateObject: (id: string, updates: Partial<CanvasObject>) => void
  deleteObject: (id: string) => void
  getObjects: () => CanvasObject[]
  getSelectedObjects: () => CanvasObject[]
  
  // Tool operations
  setActiveTool: (tool: Tool) => void
  getActiveTool: () => Tool
  
  // UI operations
  addPanel: (id: string, title: string, component: React.ComponentType) => void
  removePanel: (id: string) => void
  showNotification: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
  
  // Export operations
  exportCanvas: (options: ExportOptions) => Promise<string | Blob>
  
  // Event system
  on: (event: string, callback: Function) => void
  off: (event: string, callback: Function) => void
  emit: (event: string, data?: any) => void
  
  // AI services
  generateLayout: (prompt: string, options?: any) => Promise<any>
  generatePalette: (imageData?: string, baseColor?: string) => Promise<string[]>
  traceImage: (imageData: string) => Promise<string>
  inpaintImage: (imageData: string, maskData: string, prompt: string) => Promise<string>
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  license: string
  keywords: string[]
  permissions: string[]
  main: string
  icon?: string
  thumbnail?: string
  dependencies?: Record<string, string>
}

export interface Plugin {
  manifest: PluginManifest
  init: (api: PluginAPI) => void
  destroy?: () => void
}

// Fabric.js extended types
declare module 'fabric' {
  namespace fabric {
    interface Object {
      id?: string
    }
  }
}

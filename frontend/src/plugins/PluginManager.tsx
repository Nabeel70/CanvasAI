import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react'
import { toast } from 'react-hot-toast'
import { useCanvasStore } from '@/stores/canvasStore'
import { Plugin, PluginAPI, PluginManifest } from '@/types/canvas'

// Simple plugin registry
class PluginRegistry {
  private plugins = new Map<string, Plugin>()
  private panels: Array<React.ComponentType<any>> = []
  private listeners = new Set<() => void>()

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((l) => l())
  }

  register(plugin: Plugin) {
    const id = plugin.manifest.id
    if (this.plugins.has(id)) return
    this.plugins.set(id, plugin)

    // Init with API
    const api = createPluginAPI(this)
    plugin.init(api)

    this.notify()
  }

  unregister(id: string) {
    const plugin = this.plugins.get(id)
    if (!plugin) return
    if (plugin.destroy) plugin.destroy()
    this.plugins.delete(id)
    this.notify()
  }

  addPanel(component: React.ComponentType<any>) {
    this.panels.push(component)
    this.notify()
  }

  removePanel(component: React.ComponentType<any>) {
    this.panels = this.panels.filter((c) => c !== component)
    this.notify()
  }

  getPanels() {
    return [...this.panels]
  }
}

export const pluginManager = new PluginRegistry()

const PluginPanelsContext = createContext<PluginRegistry | null>(null)

export const PluginPanelsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PluginPanelsContext.Provider value={pluginManager}>{children}</PluginPanelsContext.Provider>
  )
}

export const usePluginPanels = () => {
  const registry = useContext(PluginPanelsContext)
  if (!registry) return []
  return useSyncExternalStore(
    (cb) => registry.subscribe(cb),
    () => registry.getPanels(),
    () => registry.getPanels()
  )
}

// Build the PluginAPI using current canvas store
function createPluginAPI(registry: PluginRegistry): PluginAPI {
  const getStore = () => useCanvasStore.getState()
  const aiBase = (import.meta as any).env.VITE_AI_URL || 'http://localhost:8000'

  const api: PluginAPI = {
    addObject: (object) => {
      const { canvas } = getStore()
      if (!canvas) return
      if (object.type === 'rect' || object.type === 'rectangle') {
        const rect = new (window as any).fabric.Rect({
          left: object.left ?? 100,
          top: object.top ?? 100,
          width: object.width ?? 100,
          height: object.height ?? 100,
          fill: (object as any).data?.fill ?? '#3B82F6',
        })
        canvas.add(rect)
      }
      canvas?.renderAll()
    },
    updateObject: (id, updates) => {
      const { canvas } = getStore()
      if (!canvas) return
      const obj = canvas.getObjects().find((o: any) => o.id === id)
      if (obj) {
        obj.set(updates as any)
        canvas.renderAll()
      }
    },
    deleteObject: (id) => {
      const { canvas } = getStore()
      if (!canvas) return
      const obj = canvas.getObjects().find((o: any) => o.id === id)
      if (obj) {
        canvas.remove(obj)
        canvas.renderAll()
      }
    },
    getObjects: () => {
      const { objects } = getStore()
      return Array.from(objects.values())
    },
    getSelectedObjects: () => {
      const { selectedObjects } = getStore()
      return selectedObjects as any
    },
    setActiveTool: (tool) => useCanvasStore.getState().setActiveTool(tool),
    getActiveTool: () => useCanvasStore.getState().activeTool,
    addPanel: (id: string, _title: string, component: React.ComponentType) => {
      const Comp: React.FC = () => component({})
      ;(Comp as any).displayName = id
      registry.addPanel(Comp)
    },
    removePanel: (_id: string) => {
      // Not mapping by id for now; panels can be removed by reference if needed
    },
    showNotification: (message: string, type = 'info') => {
      if (type === 'success') toast.success(message)
      else if (type === 'error') toast.error(message)
      else toast(message)
    },
    exportCanvas: async (options) => {
      const { canvas } = getStore()
      if (!canvas) throw new Error('Canvas not ready')
      if (options.format === 'svg') return canvas.toSVG()
      const dataUrl = canvas.toDataURL({
        format: options.format as any,
        quality: options.quality ?? 1,
        multiplier: options.scale ?? 1,
      })
      return dataUrl
    },
    on: () => {},
    off: () => {},
    emit: () => {},
    generateLayout: async (prompt: string, _opts?: any) => {
      const res = await fetch(`${aiBase}/ai/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width: 800, height: 600 }),
      })
      return res.json()
    },
    generatePalette: async (imageData?: string, baseColor?: string) => {
      const res = await fetch(`${aiBase}/ai/palette`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData, base_color: baseColor, count: 5 }),
      })
      const data = await res.json()
      return data.colors as string[]
    },
    traceImage: async (imageData: string) => {
      const res = await fetch(`${aiBase}/ai/trace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData }),
      })
      const data = await res.json()
      return data.svg_content as string
    },
    inpaintImage: async (imageData: string, maskData: string, prompt: string) => {
      const res = await fetch(`${aiBase}/ai/inpaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData, mask_data: maskData, prompt }),
      })
      const data = await res.json()
      return data.image_data as string
    },
  }

  return api
}

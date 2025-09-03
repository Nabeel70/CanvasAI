import React, { useState } from 'react'
import { Plugin } from '@/types/canvas'
import { useCanvasStore } from '@/stores/canvasStore'
import { pluginManager } from './PluginManager'

const ColorHarmonyPanel: React.FC = () => {
  const { canvas } = useCanvasStore()
  const [baseColor, setBaseColor] = useState('#3B82F6')
  const [palette, setPalette] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const aiBase = (import.meta as any).env.VITE_AI_URL || 'http://localhost:8000'
      const res = await fetch(`${aiBase}/ai/palette`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_color: baseColor, count: 5 }),
      })
      const data = await res.json()
      setPalette(data.colors || [])
    } finally {
      setLoading(false)
    }
  }

  const applyToSelection = (color: string) => {
    if (!canvas) return
    const objs = canvas.getActiveObjects()
    if (objs.length === 0) return
    objs.forEach((o) => o.set('fill', color))
    canvas.renderAll()
  }

  return (
    <div>
      <h3 className="font-medium text-gray-900 mb-3">Color Harmony</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Base color</label>
          <div className="flex items-center space-x-2">
            <input type="color" value={baseColor} onChange={(e) => setBaseColor(e.target.value)} className="w-10 h-10 border rounded" />
            <input value={baseColor} onChange={(e) => setBaseColor(e.target.value)} className="flex-1 px-2 py-1 border rounded text-sm" />
            <button onClick={generate} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
        {palette.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {palette.map((c) => (
              <button key={c} onClick={() => applyToSelection(c)} className="rounded overflow-hidden border">
                <div style={{ background: c }} className="h-10" />
                <div className="text-xs px-2 py-1 text-gray-600">{c}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const ColorHarmonyPlugin: Plugin = {
  manifest: {
    id: 'color-harmony',
    name: 'Color Harmony',
    version: '1.0.0',
    description: 'Generate harmonious color palettes and apply to selection',
    author: 'CanvasAI',
    license: 'MIT',
    keywords: ['color', 'palette', 'ai'],
    permissions: ['canvas.read', 'canvas.write', 'ui.panels', 'ai.access'],
    main: 'builtin',
  },
  init: (api) => {
    api.addPanel('color-harmony', 'Color Harmony', ColorHarmonyPanel)
  },
}

export default ColorHarmonyPlugin

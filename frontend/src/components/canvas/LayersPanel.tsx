import React, { useState } from 'react'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useCanvasStore } from '@/stores/canvasStore'
import { LayerData } from '@/types/canvas'

export const LayersPanel: React.FC = () => {
  const { 
    layers, 
    selectedObjects, 
    canvas,
    reorderLayers,
    toggleLayerVisibility,
    toggleLayerLock,
    deleteObject
  } = useCanvasStore()

  const [draggedLayer, setDraggedLayer] = useState<string | null>(null)

  const handleLayerSelect = (layerId: string) => {
    if (!canvas) return
    
    const object = canvas.getObjects().find(obj => (obj as any).id === layerId)
    if (object) {
      canvas.setActiveObject(object)
      canvas.renderAll()
    }
  }

  const handleLayerDelete = (layerId: string) => {
    if (!canvas) return
    
    const object = canvas.getObjects().find(obj => (obj as any).id === layerId)
    if (object) {
      canvas.remove(object)
      deleteObject(layerId)
      canvas.renderAll()
    }
  }

  const handleLayerDuplicate = (layerId: string) => {
    if (!canvas) return
    
    const object = canvas.getObjects().find(obj => (obj as any).id === layerId)
    if (object) {
      object.clone((cloned: any) => {
        const newId = `object-${Date.now()}-${Math.random()}`
        cloned.set({
          id: newId,
          left: (object.left || 0) + 10,
          top: (object.top || 0) + 10,
        })
        canvas.add(cloned)
        canvas.renderAll()
      })
    }
  }

  const handleMoveLayer = (layerId: string, direction: 'up' | 'down') => {
    const currentIndex = layers.findIndex(layer => layer.id === layerId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= layers.length) return
    
    reorderLayers(currentIndex, newIndex)
  }

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayer(layerId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault()
    
    if (!draggedLayer || draggedLayer === targetLayerId) return
    
    const draggedIndex = layers.findIndex(layer => layer.id === draggedLayer)
    const targetIndex = layers.findIndex(layer => layer.id === targetLayerId)
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      reorderLayers(draggedIndex, targetIndex)
    }
    
    setDraggedLayer(null)
  }

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'text':
      case 'textbox':
        return '📝'
      case 'rect':
      case 'rectangle':
        return '⬜'
      case 'circle':
        return '⭕'
      case 'path':
        return '✏️'
      case 'image':
        return '🖼️'
      default:
        return '📄'
    }
  }

  const sortedLayers = [...layers].sort((a, b) => b.order - a.order)

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Layers</h3>
        <p className="text-sm text-gray-500 mt-1">{layers.length} layers</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {sortedLayers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="mb-2 text-2xl">📄</div>
            <p className="text-sm">No layers yet</p>
            <p className="text-xs text-gray-400 mt-1">Add objects to see them here</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedLayers.map((layer, index) => {
              const isSelected = selectedObjects.some(obj => (obj as any).id === layer.id)
              const canMoveUp = index > 0
              const canMoveDown = index < sortedLayers.length - 1
              
              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, layer.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, layer.id)}
                  onClick={() => handleLayerSelect(layer.id)}
                  className={`
                    group relative flex items-center p-2 rounded-lg cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50 border border-transparent'
                    }
                    ${draggedLayer === layer.id ? 'opacity-50' : ''}
                  `}
                >
                  {/* Layer icon and name */}
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-sm">
                      {getLayerIcon(layer.type)}
                    </div>
                    <div className="ml-2 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {layer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {layer.type} • {Math.round(layer.opacity * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Layer controls */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Move up/down */}
                    <div className="flex flex-col">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveLayer(layer.id, 'up')
                        }}
                        disabled={!canMoveUp}
                        className={`
                          p-0.5 rounded transition-colors
                          ${canMoveUp 
                            ? 'text-gray-400 hover:text-gray-600' 
                            : 'text-gray-200 cursor-not-allowed'
                          }
                        `}
                        title="Move up"
                      >
                        <ChevronUpIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveLayer(layer.id, 'down')
                        }}
                        disabled={!canMoveDown}
                        className={`
                          p-0.5 rounded transition-colors
                          ${canMoveDown 
                            ? 'text-gray-400 hover:text-gray-600' 
                            : 'text-gray-200 cursor-not-allowed'
                          }
                        `}
                        title="Move down"
                      >
                        <ChevronDownIcon className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Visibility toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLayerVisibility(layer.id)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title={layer.visible ? 'Hide layer' : 'Show layer'}
                    >
                      {layer.visible ? (
                        <EyeIcon className="w-4 h-4" />
                      ) : (
                        <EyeSlashIcon className="w-4 h-4" />
                      )}
                    </button>

                    {/* Lock toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLayerLock(layer.id)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    >
                      {layer.locked ? (
                        <LockClosedIcon className="w-4 h-4" />
                      ) : (
                        <LockOpenIcon className="w-4 h-4" />
                      )}
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLayerDuplicate(layer.id)
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Duplicate layer"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLayerDelete(layer.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete layer"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default LayersPanel

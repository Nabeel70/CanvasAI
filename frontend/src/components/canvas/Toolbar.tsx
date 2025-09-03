import React from 'react'
import { 
  CursorArrowRaysIcon,
  PencilIcon,
  Square3Stack3DIcon,
  CircleStackIcon,
  DocumentTextIcon,
  PhotoIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import { useCanvasStore } from '@/stores/canvasStore'
import { Tool } from '@/types/canvas'

interface ToolbarProps {
  onExport?: () => void
  onImport?: () => void
}

export const Toolbar: React.FC<ToolbarProps> = ({ onExport, onImport }) => {
  const { 
    activeTool, 
    setActiveTool, 
    undo, 
    redo, 
    history, 
    historyIndex,
    canvas,
    zoom,
    setZoom
  } = useCanvasStore()

  const tools: Array<{ id: Tool; icon: React.ComponentType<any>; label: string; shortcut?: string }> = [
    { id: 'select', icon: CursorArrowRaysIcon, label: 'Select', shortcut: 'V' },
    { id: 'pen', icon: PencilIcon, label: 'Pen', shortcut: 'P' },
    { id: 'rectangle', icon: Square3Stack3DIcon, label: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: CircleStackIcon, label: 'Circle', shortcut: 'C' },
    { id: 'text', icon: DocumentTextIcon, label: 'Text', shortcut: 'T' },
  ]

  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool)
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 5)
    setZoom(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom * 0.8, 0.1)
    setZoom(newZoom)
  }

  const handleResetZoom = () => {
    setZoom(1)
  }

  const handleDelete = () => {
    if (canvas) {
      const activeObjects = canvas.getActiveObjects()
      if (activeObjects.length > 0) {
        canvas.remove(...activeObjects)
        canvas.discardActiveObject()
        canvas.renderAll()
      }
    }
  }

  const handleDuplicate = () => {
    if (canvas) {
      const activeObject = canvas.getActiveObject()
      if (activeObject) {
        activeObject.clone((cloned: any) => {
          cloned.set({
            left: (activeObject.left || 0) + 10,
            top: (activeObject.top || 0) + 10,
          })
          canvas.add(cloned)
          canvas.setActiveObject(cloned)
          canvas.renderAll()
        })
      }
    }
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Main tools */}
        <div className="flex items-center space-x-1">
          {/* Drawing tools */}
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-3 mr-3">
            {tools.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id
              
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                    }
                  `}
                  title={`${tool.label} (${tool.shortcut})`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              )
            })}
          </div>

          {/* History controls */}
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-3 mr-3">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`
                flex items-center justify-center w-10 h-10 rounded-lg transition-colors
                ${canUndo 
                  ? 'text-gray-600 hover:bg-gray-100' 
                  : 'text-gray-300 cursor-not-allowed'
                }
              `}
              title="Undo (Ctrl+Z)"
            >
              <ArrowUturnLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`
                flex items-center justify-center w-10 h-10 rounded-lg transition-colors
                ${canRedo 
                  ? 'text-gray-600 hover:bg-gray-100' 
                  : 'text-gray-300 cursor-not-allowed'
                }
              `}
              title="Redo (Ctrl+Y)"
            >
              <ArrowUturnRightIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Object actions */}
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-3 mr-3">
            <button
              onClick={handleDuplicate}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title="Duplicate (Ctrl+D)"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title="Delete (Delete)"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleZoomOut}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title="Zoom Out (-)"
            >
              <MagnifyingGlassMinusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-3 py-2 text-sm font-mono text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-w-[60px]"
              title="Reset Zoom (0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title="Zoom In (+)"
            >
              <MagnifyingGlassPlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right side - File operations */}
        <div className="flex items-center space-x-2">
          {onImport && (
            <button
              onClick={onImport}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <PhotoIcon className="w-4 h-4" />
              <span>Import</span>
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Toolbar

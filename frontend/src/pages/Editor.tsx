import React, { useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { fabric } from 'fabric'
import { toast } from 'react-hot-toast'
import CanvasEditor from '@/components/canvas/CanvasEditor'
import Toolbar from '@/components/canvas/Toolbar'
import LayersPanel from '@/components/canvas/LayersPanel'
import PropertiesPanel from '@/components/canvas/PropertiesPanel'
import AIToolsPanel from '@/components/canvas/AIToolsPanel'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'

const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuthStore()
  const { canvas, setCollaborating } = useCanvasStore()
  
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([])
  const [leftPanelTab, setLeftPanelTab] = useState<'layers' | 'assets'>('layers')
  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'ai'>('properties')
  const [projectName, setProjectName] = useState('Untitled Project')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load project data
  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    }
  }, [projectId])

  // Auto-save functionality
  useEffect(() => {
    if (!canvas) return

    const autoSaveInterval = setInterval(() => {
      saveProject()
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [canvas])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            saveProject()
            break
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              useCanvasStore.getState().redo()
            } else {
              useCanvasStore.getState().undo()
            }
            break
          case 'd':
            e.preventDefault()
            duplicateSelected()
            break
          case 'a':
            e.preventDefault()
            selectAll()
            break
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            deleteSelected()
            break
          case 'v':
            useCanvasStore.getState().setActiveTool('select')
            break
          case 'p':
            useCanvasStore.getState().setActiveTool('pen')
            break
          case 'r':
            useCanvasStore.getState().setActiveTool('rectangle')
            break
          case 'c':
            useCanvasStore.getState().setActiveTool('circle')
            break
          case 't':
            useCanvasStore.getState().setActiveTool('text')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const project = await response.json()
        setProjectName(project.title)
        
        // Load canvas data if available
        if (project.canvasData && canvas) {
          canvas.loadFromJSON(project.canvasData, () => {
            canvas.renderAll()
          })
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error)
      toast.error('Failed to load project')
    }
  }

  const saveProject = async () => {
    if (!canvas || !projectId) return

    setIsSaving(true)
    try {
      const canvasData = canvas.toJSON()
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          canvasData,
          updatedAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        setLastSaved(new Date())
        toast.success('Project saved')
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save project:', error)
      toast.error('Failed to save project')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectionChange = useCallback((objects: fabric.Object[]) => {
    setSelectedObjects(objects)
  }, [])

  const handleExport = () => {
    if (!canvas) return

    // Create export modal or use browser download
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    })

    // Create download link
    const link = document.createElement('a')
    link.download = `${projectName}.png`
    link.href = dataURL
    link.click()

    toast.success('Exported as PNG')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.svg,.json'
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !canvas) return

      const reader = new FileReader()
      
      if (file.type.startsWith('image/')) {
        reader.onload = (event) => {
          fabric.Image.fromURL(event.target?.result as string, (img) => {
            img.set({
              left: 100,
              top: 100,
              scaleX: 0.5,
              scaleY: 0.5,
            })
            canvas.add(img)
            canvas.renderAll()
          })
        }
        reader.readAsDataURL(file)
      } else if (file.name.endsWith('.json')) {
        reader.onload = (event) => {
          try {
            const jsonData = event.target?.result as string
            canvas.loadFromJSON(jsonData, () => {
              canvas.renderAll()
            })
            toast.success('Canvas imported')
          } catch (error) {
            toast.error('Failed to import canvas')
          }
        }
        reader.readAsText(file)
      }
    }
    
    input.click()
  }

  // AI tool handlers
  const handleGenerateLayout = async (prompt: string) => {
    try {
      const response = await fetch('/ai/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width: 800, height: 600 })
      })

      const data = await response.json()
      
      if (data.scene_graph && canvas) {
        // Clear canvas
        canvas.clear()
        
        // Add generated elements
        data.scene_graph.elements.forEach((element: any) => {
          switch (element.type) {
            case 'text':
              const text = new fabric.Textbox(element.content, {
                left: element.position.x,
                top: element.position.y,
                fontSize: element.style.fontSize,
                fontFamily: element.style.fontFamily,
                fill: element.style.color,
              })
              canvas.add(text)
              break
            case 'rectangle':
              const rect = new fabric.Rect({
                left: element.position.x,
                top: element.position.y,
                width: element.size.width,
                height: element.size.height,
                fill: element.style.fill,
                stroke: element.style.stroke,
              })
              canvas.add(rect)
              break
          }
        })
        
        canvas.renderAll()
        toast.success('Layout generated!')
      }
    } catch (error) {
      console.error('Failed to generate layout:', error)
      toast.error('Failed to generate layout')
    }
  }

  const handleGeneratePalette = async (imageData?: string) => {
    try {
      const response = await fetch('/ai/palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData, count: 5 })
      })

      const data = await response.json()
      
      if (data.colors) {
        // Show palette in a toast or modal
        toast.success(`Generated ${data.colors.length} colors for ${data.harmony_type} harmony`)
        
        // You could add a color palette component here
        console.log('Generated colors:', data.colors)
      }
    } catch (error) {
      console.error('Failed to generate palette:', error)
      toast.error('Failed to generate palette')
    }
  }

  const handleTraceImage = async (imageData: string) => {
    try {
      const response = await fetch('/ai/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData })
      })

      const data = await response.json()
      
      if (data.svg_content && canvas) {
        // Load SVG into canvas
        fabric.loadSVGFromString(data.svg_content, (objects, options) => {
          const group = fabric.util.groupSVGElements(objects, options)
          group.set({
            left: 100,
            top: 100,
            scaleX: 0.5,
            scaleY: 0.5,
          })
          canvas.add(group)
          canvas.renderAll()
        })
        
        toast.success(`Vector traced with ${Math.round(data.confidence * 100)}% confidence`)
      }
    } catch (error) {
      console.error('Failed to trace image:', error)
      toast.error('Failed to trace image')
    }
  }

  const handleInpaintImage = async (imageData: string, maskData: string, prompt: string) => {
    try {
      const response = await fetch('/ai/inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData, mask_data: maskData, prompt })
      })

      const data = await response.json()
      
      if (data.image_data && canvas) {
        // Replace selected image with inpainted version
        const activeObject = canvas.getActiveObject()
        if (activeObject && activeObject.type === 'image') {
          fabric.Image.fromURL(data.image_data, (img) => {
            img.set({
              left: activeObject.left,
              top: activeObject.top,
              scaleX: activeObject.scaleX,
              scaleY: activeObject.scaleY,
            })
            canvas.remove(activeObject)
            canvas.add(img)
            canvas.renderAll()
          })
        }
        
        toast.success('Image inpainted successfully')
      }
    } catch (error) {
      console.error('Failed to inpaint image:', error)
      toast.error('Failed to inpaint image')
    }
  }

  // Canvas actions
  const deleteSelected = () => {
    if (canvas) {
      const activeObjects = canvas.getActiveObjects()
      if (activeObjects.length > 0) {
        canvas.remove(...activeObjects)
        canvas.discardActiveObject()
        canvas.renderAll()
      }
    }
  }

  const duplicateSelected = () => {
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

  const selectAll = () => {
    if (canvas) {
      const allObjects = canvas.getObjects()
      const selection = new fabric.ActiveSelection(allObjects, { canvas })
      canvas.setActiveObject(selection)
      canvas.renderAll()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-medium text-gray-900">CanvasAI</h1>
          <div className="text-sm text-gray-500">
            {projectName}
            {isSaving && <span className="ml-2 text-blue-600">Saving...</span>}
            {lastSaved && !isSaving && (
              <span className="ml-2 text-green-600">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {user?.email}
          </span>
          <button
            onClick={saveProject}
            disabled={isSaving}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Canvas Toolbar */}
      <Toolbar onExport={handleExport} onImport={handleImport} />

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setLeftPanelTab('layers')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                leftPanelTab === 'layers'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Layers
            </button>
            <button
              onClick={() => setLeftPanelTab('assets')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                leftPanelTab === 'assets'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Assets
            </button>
          </div>
          
          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {leftPanelTab === 'layers' && <LayersPanel />}
            {leftPanelTab === 'assets' && (
              <div className="p-4">
                <p className="text-sm text-gray-500">Assets panel coming soon...</p>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative bg-gray-100 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <CanvasEditor
                  width={800}
                  height={600}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setRightPanelTab('properties')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                rightPanelTab === 'properties'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Properties
            </button>
            <button
              onClick={() => setRightPanelTab('ai')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                rightPanelTab === 'ai'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              AI Tools
            </button>
          </div>
          
          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'properties' && <PropertiesPanel />}
            {rightPanelTab === 'ai' && (
              <AIToolsPanel
                onGenerateLayout={handleGenerateLayout}
                onGeneratePalette={handleGeneratePalette}
                onTraceImage={handleTraceImage}
                onInpaintImage={handleInpaintImage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Editor

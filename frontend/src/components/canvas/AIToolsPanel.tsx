import React, { useState } from 'react'
import {
  SparklesIcon,
  PhotoIcon,
  SwatchIcon,
  PaintBrushIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useCanvasStore } from '@/stores/canvasStore'
import { fabric } from 'fabric'

interface AIToolsPanelProps {
  onGenerateLayout?: (prompt: string) => void
  onGeneratePalette?: (imageData?: string) => void
  onTraceImage?: (imageData: string) => void
  onInpaintImage?: (imageData: string, maskData: string, prompt: string) => void
}

export const AIToolsPanel: React.FC<AIToolsPanelProps> = ({
  onGenerateLayout,
  onGeneratePalette,
  onTraceImage,
  onInpaintImage
}) => {
  const { canvas } = useCanvasStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [layoutPrompt, setLayoutPrompt] = useState('')
  const [inpaintPrompt, setInpaintPrompt] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleGenerateLayout = async () => {
    if (!layoutPrompt.trim() || !onGenerateLayout) return
    
    setLoading('layout')
    try {
      await onGenerateLayout(layoutPrompt)
      setLayoutPrompt('')
    } catch (error) {
      console.error('Failed to generate layout:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleGeneratePalette = async () => {
    if (!onGeneratePalette) return
    
    setLoading('palette')
    try {
      // Get canvas as image data for palette generation
      const imageData = canvas?.toDataURL()
      await onGeneratePalette(imageData)
    } catch (error) {
      console.error('Failed to generate palette:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleTraceImage = async () => {
    if (!onTraceImage) return
    
    // Create file input to select image
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setLoading('trace')
      try {
        const reader = new FileReader()
        reader.onload = async (event) => {
          const imageData = event.target?.result as string
          await onTraceImage(imageData)
        }
        reader.readAsDataURL(file)
      } catch (error) {
        console.error('Failed to trace image:', error)
      } finally {
        setLoading(null)
      }
    }
    
    input.click()
  }

  const handleInpaintImage = async () => {
    if (!inpaintPrompt.trim() || !onInpaintImage || !canvas) return
    
    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.type !== 'image') {
      alert('Please select an image to inpaint')
      return
    }
    
    setLoading('inpaint')
    try {
      // Get image data from selected object
      const imageData = (activeObject as any).toDataURL()
      // For demo, use a simple mask (would need proper mask creation UI)
      const maskData = imageData // Simplified
      
      await onInpaintImage(imageData, maskData, inpaintPrompt)
      setInpaintPrompt('')
    } catch (error) {
      console.error('Failed to inpaint image:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleSearchAssets = async () => {
    if (!searchQuery.trim()) return
    
    setLoading('search')
    try {
      const response = await fetch(`/api/ai/search?query=${encodeURIComponent(searchQuery)}&limit=6`)
      const data = await response.json()
      
      // Add search results to a modal or side panel
      // For now, just add the first result to canvas
      if (data.results && data.results.length > 0) {
        const firstResult = data.results[0]
        fabric.Image.fromURL(firstResult.url, (img) => {
          if (canvas) {
            img.set({
              left: 100,
              top: 100,
              scaleX: 0.5,
              scaleY: 0.5,
            })
            canvas.add(img)
            canvas.renderAll()
          }
        })
      }
      
      setSearchQuery('')
    } catch (error) {
      console.error('Failed to search assets:', error)
    } finally {
      setLoading(null)
    }
  }

  const isLoading = (tool: string) => loading === tool

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 flex items-center">
          <SparklesIcon className="w-5 h-5 mr-2 text-yellow-500" />
          AI Tools
        </h3>
        <p className="text-sm text-gray-500 mt-1">AI-powered design assistance</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Layout Generation */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800 flex items-center">
            <PaintBrushIcon className="w-4 h-4 mr-2" />
            Generate Layout
          </h4>
          <textarea
            value={layoutPrompt}
            onChange={(e) => setLayoutPrompt(e.target.value)}
            placeholder="Describe the layout you want to create..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <button
            onClick={handleGenerateLayout}
            disabled={!layoutPrompt.trim() || isLoading('layout')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading('layout') ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4 mr-2" />
                Generate Layout
              </>
            )}
          </button>
        </div>

        {/* Color Palette */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800 flex items-center">
            <SwatchIcon className="w-4 h-4 mr-2" />
            Color Harmony
          </h4>
          <p className="text-sm text-gray-600">
            Generate a color palette based on your current design
          </p>
          <button
            onClick={handleGeneratePalette}
            disabled={isLoading('palette')}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading('palette') ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SwatchIcon className="w-4 h-4 mr-2" />
                Generate Palette
              </>
            )}
          </button>
        </div>

        {/* Vector Tracing */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800 flex items-center">
            <PhotoIcon className="w-4 h-4 mr-2" />
            Vector Tracing
          </h4>
          <p className="text-sm text-gray-600">
            Convert raster images to editable vector graphics
          </p>
          <button
            onClick={handleTraceImage}
            disabled={isLoading('trace')}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading('trace') ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Tracing...
              </>
            ) : (
              <>
                <PhotoIcon className="w-4 h-4 mr-2" />
                Upload & Trace
              </>
            )}
          </button>
        </div>

        {/* Image Inpainting */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800 flex items-center">
            <PaintBrushIcon className="w-4 h-4 mr-2" />
            Image Inpainting
          </h4>
          <p className="text-sm text-gray-600">
            Edit selected images with AI (select an image first)
          </p>
          <textarea
            value={inpaintPrompt}
            onChange={(e) => setInpaintPrompt(e.target.value)}
            placeholder="Describe what you want to change..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
          />
          <button
            onClick={handleInpaintImage}
            disabled={!inpaintPrompt.trim() || isLoading('inpaint')}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading('inpaint') ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PaintBrushIcon className="w-4 h-4 mr-2" />
                Inpaint Image
              </>
            )}
          </button>
        </div>

        {/* Asset Search */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800 flex items-center">
            <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
            Smart Asset Search
          </h4>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for images and assets..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSearchAssets()}
          />
          <button
            onClick={handleSearchAssets}
            disabled={!searchQuery.trim() || isLoading('search')}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading('search') ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                Search Assets
              </>
            )}
          </button>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h5 className="font-medium text-blue-900 mb-2">💡 Tips</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be specific with layout prompts</li>
            <li>• Use high-contrast images for better tracing</li>
            <li>• Combine AI tools for best results</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AIToolsPanel

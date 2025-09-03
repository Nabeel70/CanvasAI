import React, { useState, useEffect } from 'react'
import { useCanvasStore, getSelectedObjectProperties, updateSelectedObjectProperties } from '@/stores/canvasStore'
import { HexColorPicker } from 'react-colorful'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label: string
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localColor, setLocalColor] = useState(color || '#000000')

  useEffect(() => {
    setLocalColor(color || '#000000')
  }, [color])

  const handleChange = (newColor: string) => {
    setLocalColor(newColor)
    onChange(newColor)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 border border-gray-300 rounded-lg flex items-center px-3 space-x-2 hover:border-gray-400 transition-colors"
        >
          <div 
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: localColor }}
          />
          <span className="text-sm font-mono">{localColor}</span>
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-12 left-0 z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
              <HexColorPicker color={localColor} onChange={handleChange} />
              <input
                type="text"
                value={localColor}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full mt-2 px-2 py-1 text-sm border border-gray-300 rounded"
                placeholder="#000000"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const PropertiesPanel: React.FC = () => {
  const { selectedObjects, canvas } = useCanvasStore()
  const [properties, setProperties] = useState<any>(null)

  // Update properties when selection changes
  useEffect(() => {
    if (selectedObjects.length > 0) {
      const props = getSelectedObjectProperties()
      setProperties(props)
    } else {
      setProperties(null)
    }
  }, [selectedObjects])

  const updateProperty = (key: string, value: any) => {
    updateSelectedObjectProperties({ [key]: value })
    setProperties((prev: any) => ({ ...prev, [key]: value }))
  }

  const renderTextProperties = () => {
    if (!selectedObjects[0] || selectedObjects[0].type !== 'textbox') return null

    const textObj = selectedObjects[0] as any

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Text Properties</h4>
        
        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
          <input
            type="number"
            value={textObj.fontSize || 16}
            onChange={(e) => updateProperty('fontSize', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="8"
            max="120"
          />
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
          <select
            value={textObj.fontFamily || 'Inter'}
            onChange={(e) => updateProperty('fontFamily', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>

        {/* Font Weight */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
          <select
            value={textObj.fontWeight || 'normal'}
            onChange={(e) => updateProperty('fontWeight', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="lighter">Light</option>
            <option value="bolder">Extra Bold</option>
          </select>
        </div>

        {/* Text Align */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Text Align</label>
          <div className="flex space-x-1">
            {['left', 'center', 'right', 'justify'].map((align) => (
              <button
                key={align}
                onClick={() => updateProperty('textAlign', align)}
                className={`
                  flex-1 px-3 py-2 text-sm border rounded transition-colors
                  ${textObj.textAlign === align
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {align[0].toUpperCase() + align.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderShapeProperties = () => {
    if (!selectedObjects[0] || !['rect', 'circle', 'path'].includes(selectedObjects[0].type || '')) return null

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Shape Properties</h4>
        
        {/* Fill Color */}
        <ColorPicker
          color={properties?.fill || '#000000'}
          onChange={(color) => updateProperty('fill', color)}
          label="Fill Color"
        />

        {/* Stroke Color */}
        <ColorPicker
          color={properties?.stroke || '#000000'}
          onChange={(color) => updateProperty('stroke', color)}
          label="Stroke Color"
        />

        {/* Stroke Width */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stroke Width</label>
          <input
            type="number"
            value={properties?.strokeWidth || 0}
            onChange={(e) => updateProperty('strokeWidth', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            max="20"
          />
        </div>
      </div>
    )
  }

  const renderTransformProperties = () => {
    if (!properties) return null

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Transform</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X</label>
            <input
              type="number"
              value={Math.round(properties.left || 0)}
              onChange={(e) => updateProperty('left', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Y</label>
            <input
              type="number"
              value={Math.round(properties.top || 0)}
              onChange={(e) => updateProperty('top', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
            <input
              type="number"
              value={Math.round((properties.width || 0) * (properties.scaleX || 1))}
              onChange={(e) => {
                const newWidth = parseInt(e.target.value)
                const currentWidth = properties.width || 1
                updateProperty('scaleX', newWidth / currentWidth)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
            <input
              type="number"
              value={Math.round((properties.height || 0) * (properties.scaleY || 1))}
              onChange={(e) => {
                const newHeight = parseInt(e.target.value)
                const currentHeight = properties.height || 1
                updateProperty('scaleY', newHeight / currentHeight)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rotation</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="360"
              value={properties.angle || 0}
              onChange={(e) => updateProperty('angle', parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-500 w-12">{Math.round(properties.angle || 0)}°</span>
          </div>
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opacity</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={properties.opacity || 1}
              onChange={(e) => updateProperty('opacity', parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-500 w-12">{Math.round((properties.opacity || 1) * 100)}%</span>
          </div>
        </div>
      </div>
    )
  }

  if (selectedObjects.length === 0) {
    return (
      <div className="w-full h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <div>
            <div className="text-4xl mb-2">🎨</div>
            <p className="text-sm text-gray-500">Select an object to edit properties</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Properties</h3>
        <p className="text-sm text-gray-500">
          {selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''} selected
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {renderTransformProperties()}
        {renderShapeProperties()}
        {renderTextProperties()}
      </div>
    </div>
  )
}

export default PropertiesPanel

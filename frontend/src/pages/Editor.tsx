import React from 'react'
import { useParams } from 'react-router-dom'

const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-medium">CanvasAI Editor</h1>
          <span className="text-sm text-gray-500">Project ID: {projectId}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Export
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Tools & Layers */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Tools</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="p-2 text-sm border rounded hover:bg-gray-50">Select</button>
              <button className="p-2 text-sm border rounded hover:bg-gray-50">Pen</button>
              <button className="p-2 text-sm border rounded hover:bg-gray-50">Text</button>
              <button className="p-2 text-sm border rounded hover:bg-gray-50">Shape</button>
            </div>
          </div>
          <div className="p-4 flex-1">
            <h3 className="font-medium text-gray-900">Layers</h3>
            <div className="mt-2 text-sm text-gray-500">
              No layers yet
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative bg-gray-100 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div 
                  id="canvas-container" 
                  className="border border-gray-300 bg-white"
                  style={{ width: 800, height: 600 }}
                >
                  <canvas 
                    id="fabric-canvas" 
                    width={800} 
                    height={600}
                    className="border border-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties & AI */}
        <div className="w-64 bg-white border-l border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Properties</h3>
            <div className="mt-2 text-sm text-gray-500">
              Select an object to edit properties
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-medium text-gray-900">AI Tools</h3>
            <div className="mt-2 space-y-2">
              <button className="w-full p-2 text-sm border rounded hover:bg-gray-50">
                Generate Layout
              </button>
              <button className="w-full p-2 text-sm border rounded hover:bg-gray-50">
                Color Palette
              </button>
              <button className="w-full p-2 text-sm border rounded hover:bg-gray-50">
                Vector Trace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Editor

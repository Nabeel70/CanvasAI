import chroma from 'chroma-js'

export function init(api) {
  // Add the Color Harmony panel to the right sidebar
  api.addPanel('Color Harmony', ColorHarmonyPanel, {
    position: 'right',
    icon: 'palette',
    order: 1
  })

  // Register color harmony commands
  api.registerCommand('generate-palette', generateColorPalette)
  api.registerCommand('apply-palette', applyPaletteToSelection)
}

// Main panel component
function ColorHarmonyPanel({ api }) {
  const [baseColor, setBaseColor] = useState('#3B82F6')
  const [harmonyType, setHarmonyType] = useState('complementary')
  const [palette, setPalette] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  const harmonyTypes = [
    { value: 'complementary', label: 'Complementary' },
    { value: 'triadic', label: 'Triadic' },
    { value: 'analogous', label: 'Analogous' },
    { value: 'split-complementary', label: 'Split Complementary' },
    { value: 'tetradic', label: 'Tetradic' }
  ]

  const generatePalette = async () => {
    setIsGenerating(true)
    try {
      const newPalette = await generateColorHarmony(baseColor, harmonyType, api)
      setPalette(newPalette)
    } catch (error) {
      api.showNotification('Failed to generate palette', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const applyColorToSelection = (color) => {
    const selectedObjects = api.canvas.getSelectedObjects()
    if (selectedObjects.length === 0) {
      api.showNotification('Please select objects to apply color', 'warning')
      return
    }

    selectedObjects.forEach(obj => {
      if (obj.type === 'text') {
        obj.set('fill', color)
      } else {
        obj.set('fill', color)
      }
    })

    api.canvas.renderAll()
    api.history.saveState()
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Base Color
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="color"
            value={baseColor}
            onChange={(e) => setBaseColor(e.target.value)}
            className="w-12 h-8 border border-gray-300 rounded"
          />
          <input
            type="text"
            value={baseColor}
            onChange={(e) => setBaseColor(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Harmony Type
        </label>
        <select
          value={harmonyType}
          onChange={(e) => setHarmonyType(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        >
          {harmonyTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={generatePalette}
        disabled={isGenerating}
        className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isGenerating ? 'Generating...' : 'Generate Palette'}
      </button>

      {palette.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Generated Palette</h4>
          <div className="grid grid-cols-2 gap-2">
            {palette.map((color, index) => (
              <div
                key={index}
                className="group cursor-pointer"
                onClick={() => applyColorToSelection(color.hex)}
              >
                <div
                  className="w-full h-12 rounded border border-gray-200 group-hover:border-gray-400"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="mt-1 text-xs text-gray-600 text-center">
                  {color.hex}
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {color.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
        <div className="space-y-2">
          <button
            onClick={() => extractColorsFromImage(api)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Extract from Image
          </button>
          <button
            onClick={() => saveCurrentPalette(palette, api)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Save Palette
          </button>
        </div>
      </div>
    </div>
  )
}

// Color harmony generation logic
async function generateColorHarmony(baseColor, harmonyType, api) {
  const base = chroma(baseColor)
  let colors = []

  switch (harmonyType) {
    case 'complementary':
      colors = [
        { hex: base.hex(), name: 'Base' },
        { hex: base.set('hsl.h', '+180').hex(), name: 'Complementary' },
        { hex: base.brighten(1).hex(), name: 'Light Base' },
        { hex: base.darken(1).hex(), name: 'Dark Base' },
        { hex: base.set('hsl.h', '+180').brighten(1).hex(), name: 'Light Complement' }
      ]
      break

    case 'triadic':
      colors = [
        { hex: base.hex(), name: 'Base' },
        { hex: base.set('hsl.h', '+120').hex(), name: 'Triadic 1' },
        { hex: base.set('hsl.h', '+240').hex(), name: 'Triadic 2' },
        { hex: base.brighten(1).hex(), name: 'Light Base' },
        { hex: base.darken(1).hex(), name: 'Dark Base' }
      ]
      break

    case 'analogous':
      colors = [
        { hex: base.set('hsl.h', '-30').hex(), name: 'Analogous -30°' },
        { hex: base.set('hsl.h', '-15').hex(), name: 'Analogous -15°' },
        { hex: base.hex(), name: 'Base' },
        { hex: base.set('hsl.h', '+15').hex(), name: 'Analogous +15°' },
        { hex: base.set('hsl.h', '+30').hex(), name: 'Analogous +30°' }
      ]
      break

    case 'split-complementary':
      colors = [
        { hex: base.hex(), name: 'Base' },
        { hex: base.set('hsl.h', '+150').hex(), name: 'Split Comp 1' },
        { hex: base.set('hsl.h', '+210').hex(), name: 'Split Comp 2' },
        { hex: base.brighten(1).hex(), name: 'Light Base' },
        { hex: base.darken(1).hex(), name: 'Dark Base' }
      ]
      break

    case 'tetradic':
      colors = [
        { hex: base.hex(), name: 'Base' },
        { hex: base.set('hsl.h', '+90').hex(), name: 'Tetradic 1' },
        { hex: base.set('hsl.h', '+180').hex(), name: 'Tetradic 2' },
        { hex: base.set('hsl.h', '+270').hex(), name: 'Tetradic 3' },
        { hex: base.brighten(1).hex(), name: 'Light Base' }
      ]
      break

    default:
      colors = [{ hex: base.hex(), name: 'Base' }]
  }

  // Use AI service for advanced color analysis if available
  try {
    const aiEnhancedPalette = await api.ai.enhancePalette(colors, baseColor, harmonyType)
    return aiEnhancedPalette || colors
  } catch (error) {
    console.warn('AI enhancement failed, using algorithmic palette')
    return colors
  }
}

// Extract colors from selected image
async function extractColorsFromImage(api) {
  const selectedObjects = api.canvas.getSelectedObjects()
  const imageObject = selectedObjects.find(obj => obj.type === 'image')

  if (!imageObject) {
    api.showNotification('Please select an image to extract colors from', 'warning')
    return
  }

  try {
    // Create a temporary canvas to analyze the image
    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')
    
    tempCanvas.width = imageObject.width
    tempCanvas.height = imageObject.height
    
    ctx.drawImage(imageObject.getElement(), 0, 0)
    
    // Sample colors from various points in the image
    const colors = []
    const samplePoints = [
      [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8], [0.5, 0.5]
    ]
    
    samplePoints.forEach(([x, y]) => {
      const pixel = ctx.getImageData(
        Math.floor(x * tempCanvas.width),
        Math.floor(y * tempCanvas.height),
        1, 1
      ).data
      
      const color = chroma([pixel[0], pixel[1], pixel[2]])
      colors.push({
        hex: color.hex(),
        name: `Extracted ${colors.length + 1}`
      })
    })

    api.showNotification(`Extracted ${colors.length} colors from image`, 'success')
    return colors
  } catch (error) {
    api.showNotification('Failed to extract colors from image', 'error')
    return []
  }
}

// Save palette to user's collection
async function saveCurrentPalette(palette, api) {
  if (palette.length === 0) {
    api.showNotification('No palette to save', 'warning')
    return
  }

  try {
    await api.storage.savePalette({
      name: `Palette ${new Date().toLocaleDateString()}`,
      colors: palette,
      createdAt: new Date().toISOString()
    })
    
    api.showNotification('Palette saved successfully', 'success')
  } catch (error) {
    api.showNotification('Failed to save palette', 'error')
  }
}

export const metadata = {
  name: 'Color Harmony',
  version: '1.0.0',
  description: 'AI-powered color palette generation using advanced color theory',
  author: 'CanvasAI Team',
  permissions: ['canvas.read', 'canvas.write', 'ui.panels', 'ai.access']
}

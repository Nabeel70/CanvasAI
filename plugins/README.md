# CanvasAI Plugins

This directory contains community plugins for CanvasAI. Plugins extend the functionality of the design platform with new tools, AI features, export formats, and integrations.

## Plugin Development

### Getting Started

1. **Create a new plugin directory:**
   ```bash
   mkdir plugins/my-awesome-plugin
   cd plugins/my-awesome-plugin
   ```

2. **Create the plugin manifest:**
   ```json
   {
     "name": "My Awesome Plugin",
     "id": "my-awesome-plugin",
     "version": "1.0.0",
     "description": "Description of what the plugin does",
     "author": "Your Name",
     "license": "MIT",
     "keywords": ["design", "ai", "productivity"],
     "permissions": [
       "canvas.read",
       "canvas.write",
       "ui.panels"
     ],
     "main": "index.js"
   }
   ```

3. **Implement the plugin:**
   ```javascript
   // index.js
   export function init(api) {
     // Plugin initialization code
     api.addPanel('My Panel', MyPanelComponent)
     api.addTool('my-tool', MyTool)
   }
   
   export const metadata = {
     name: 'My Awesome Plugin',
     version: '1.0.0',
     // ... other metadata
   }
   ```

### Plugin API

The CanvasAI Plugin API provides access to:

- **Canvas Operations**: Add, modify, and remove objects
- **UI Components**: Create custom panels and tools
- **AI Services**: Access to AI models and endpoints
- **Storage**: Persistent plugin data storage
- **Events**: Listen to canvas and application events

### Available Plugins

- [Color Harmony](./color-harmony/) - AI-powered color palette generation
- [Vector Tracer](./vector-tracer/) - Convert raster images to vectors
- [Template Gallery](./template-gallery/) - Pre-made design templates
- [Export Plus](./export-plus/) - Additional export formats and options

### Plugin Guidelines

1. **Security**: Plugins run in a sandboxed environment
2. **Performance**: Avoid blocking the main thread
3. **UI Consistency**: Follow the CanvasAI design system
4. **Documentation**: Include clear README and examples
5. **Testing**: Provide unit tests for plugin functionality

### Publishing Plugins

1. Fork the CanvasAI repository
2. Add your plugin to the `plugins/` directory
3. Submit a pull request with:
   - Plugin code and documentation
   - Tests and examples
   - Updated plugin registry

For detailed documentation, see [Plugin SDK Guide](../docs/plugin-sdk.md).

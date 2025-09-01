from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import base64
import io
from PIL import Image
import numpy as np
from typing import Optional, List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CanvasAI - AI Services",
    description="AI-powered design assistance services",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class GenerateLayoutRequest(BaseModel):
    prompt: str
    width: int = 800
    height: int = 600
    style: Optional[str] = "modern"

class GenerateLayoutResponse(BaseModel):
    scene_graph: Dict[str, Any]
    preview_image: Optional[str] = None

class TraceImageRequest(BaseModel):
    image_data: str  # base64 encoded image

class TraceImageResponse(BaseModel):
    svg_content: str
    confidence: float

class GeneratePaletteRequest(BaseModel):
    image_data: Optional[str] = None
    base_color: Optional[str] = None
    count: int = 5

class GeneratePaletteResponse(BaseModel):
    colors: List[str]
    harmony_type: str

class InpaintRequest(BaseModel):
    image_data: str
    mask_data: str
    prompt: str

class InpaintResponse(BaseModel):
    image_data: str

@app.get("/")
async def root():
    return {"message": "CanvasAI AI Services", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai"}

@app.post("/ai/layout", response_model=GenerateLayoutResponse)
async def generate_layout(request: GenerateLayoutRequest):
    """Generate a layout based on a text prompt"""
    try:
        logger.info(f"Generating layout for prompt: {request.prompt}")
        
        # Mock scene graph generation
        # In a real implementation, this would use AI models to generate layouts
        scene_graph = {
            "artboard": {
                "id": "artboard-1",
                "width": request.width,
                "height": request.height,
                "backgroundColor": "#FFFFFF"
            },
            "elements": [
                {
                    "id": "text-1",
                    "type": "text",
                    "content": f"Generated from: {request.prompt}",
                    "position": {"x": 50, "y": 50},
                    "style": {
                        "fontSize": 24,
                        "fontFamily": "Inter",
                        "color": "#333333"
                    }
                },
                {
                    "id": "rect-1",
                    "type": "rectangle",
                    "position": {"x": 50, "y": 100},
                    "size": {"width": 200, "height": 100},
                    "style": {
                        "fill": "#3B82F6",
                        "stroke": "none"
                    }
                }
            ]
        }
        
        return GenerateLayoutResponse(
            scene_graph=scene_graph,
            preview_image=None
        )
        
    except Exception as e:
        logger.error(f"Error generating layout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/trace", response_model=TraceImageResponse)
async def trace_image(request: TraceImageRequest):
    """Convert a raster image to vector SVG"""
    try:
        logger.info("Tracing image to SVG")
        
        # Decode base64 image
        image_data = base64.b64decode(request.image_data.split(',')[1] if ',' in request.image_data else request.image_data)
        image = Image.open(io.BytesIO(image_data))
        
        # Mock SVG generation
        # In a real implementation, this would use computer vision models
        svg_content = f'''
        <svg width="{image.width}" height="{image.height}" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="10" width="{image.width-20}" height="{image.height-20}" 
                  fill="none" stroke="#000000" stroke-width="2"/>
            <text x="{image.width//2}" y="{image.height//2}" 
                  text-anchor="middle" font-family="Arial" font-size="16">
                Traced Image
            </text>
        </svg>
        '''
        
        return TraceImageResponse(
            svg_content=svg_content.strip(),
            confidence=0.85
        )
        
    except Exception as e:
        logger.error(f"Error tracing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/palette", response_model=GeneratePaletteResponse)
async def generate_palette(request: GeneratePaletteRequest):
    """Generate a color palette"""
    try:
        logger.info("Generating color palette")
        
        # Mock palette generation
        # In a real implementation, this would use color theory algorithms
        if request.base_color:
            base_color = request.base_color
        else:
            base_color = "#3B82F6"
            
        colors = [
            "#3B82F6",  # Primary blue
            "#1E40AF",  # Darker blue
            "#93C5FD",  # Lighter blue
            "#F59E0B",  # Complementary orange
            "#6B7280",  # Neutral gray
        ]
        
        return GeneratePaletteResponse(
            colors=colors[:request.count],
            harmony_type="complementary"
        )
        
    except Exception as e:
        logger.error(f"Error generating palette: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/inpaint", response_model=InpaintResponse)
async def inpaint_image(request: InpaintRequest):
    """Inpaint/edit parts of an image"""
    try:
        logger.info(f"Inpainting image with prompt: {request.prompt}")
        
        # Decode base64 images
        image_data = base64.b64decode(request.image_data.split(',')[1] if ',' in request.image_data else request.image_data)
        mask_data = base64.b64decode(request.mask_data.split(',')[1] if ',' in request.mask_data else request.mask_data)
        
        # Mock inpainting
        # In a real implementation, this would use Stable Diffusion or similar
        image = Image.open(io.BytesIO(image_data))
        
        # Convert back to base64
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return InpaintResponse(
            image_data=f"data:image/png;base64,{image_base64}"
        )
        
    except Exception as e:
        logger.error(f"Error inpainting image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/search")
async def search_assets(query: str, limit: int = 10):
    """Search for assets using semantic search"""
    try:
        logger.info(f"Searching assets for: {query}")
        
        # Mock search results
        # In a real implementation, this would use CLIP embeddings
        results = [
            {
                "id": f"asset-{i}",
                "url": f"https://picsum.photos/200/200?random={i}",
                "title": f"Sample Asset {i}",
                "tags": ["sample", "image"],
                "relevance": 0.9 - (i * 0.1)
            }
            for i in range(min(limit, 5))
        ]
        
        return {"results": results, "total": len(results)}
        
    except Exception as e:
        logger.error(f"Error searching assets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/stores/canvasStore'

let ydoc: Y.Doc | null = null
let provider: WebrtcProvider | null = null
let yCanvasMap: Y.Map<any> | null = null
let suppressLocal: boolean = false

interface InitParams {
  canvas: fabric.Canvas
  room: string
}

export const initYjsCollaboration = ({ canvas, room }: InitParams) => {
  if (ydoc) return cleanup

  ydoc = new Y.Doc()
  provider = new WebrtcProvider(room, ydoc)
  yCanvasMap = ydoc.getMap('canvas')

  // Apply remote updates to Fabric
  const applyRemote = () => {
    if (!yCanvasMap || !canvas) return
    const data = yCanvasMap.get('json') as any
    if (!data) return
    suppressLocal = true
    canvas.loadFromJSON(data, () => {
      canvas.renderAll()
      suppressLocal = false
    })
  }

  // Listen for remote changes
  const mapObserver = () => {
    applyRemote()
  }
  yCanvasMap.observe(mapObserver)

  // Push local changes to Yjs (throttled)
  let t: any
  const pushLocal = () => {
    if (!yCanvasMap) return
    if (suppressLocal) return
    const json = canvas.toJSON()
    yCanvasMap.set('json', json)
    yCanvasMap.set('updatedAt', Date.now())
  }

  const schedulePush = () => {
    if (suppressLocal) return
    clearTimeout(t)
    t = setTimeout(pushLocal, 250)
  }

  const onObjectChange = () => schedulePush()
  const onSelection = () => {}

  canvas.on('object:added', onObjectChange)
  canvas.on('object:modified', onObjectChange)
  canvas.on('object:removed', onObjectChange)
  canvas.on('path:created', onObjectChange)
  canvas.on('selection:created', onSelection)
  canvas.on('selection:updated', onSelection)
  canvas.on('selection:cleared', onSelection)

  // Initial sync: if remote has data, load it; otherwise push local
  const remoteJson = yCanvasMap.get('json')
  if (remoteJson) {
    applyRemote()
  } else {
    pushLocal()
  }

  function cleanup() {
    if (!canvas) return
    canvas.off('object:added', onObjectChange)
    canvas.off('object:modified', onObjectChange)
    canvas.off('object:removed', onObjectChange)
    canvas.off('path:created', onObjectChange)
    yCanvasMap && yCanvasMap.unobserve(mapObserver)
  }

  return cleanup
}

export const disposeYjsCollaboration = () => {
  try {
    provider?.destroy()
    ydoc?.destroy()
  } finally {
    provider = null
    ydoc = null
    yCanvasMap = null
    suppressLocal = false
  }
}

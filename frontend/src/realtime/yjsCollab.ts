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
  const defaultIce = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
  ]
  const iceServers = (() => {
    try {
      const raw = (import.meta as any).env.VITE_ICE_SERVERS
      if (!raw) return defaultIce
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : defaultIce
    } catch {
      return defaultIce
    }
  })()
  const signaling = (() => {
    const raw = (import.meta as any).env.VITE_YJS_SIGNALING as string | undefined
    if (!raw) return ['wss://signaling.yjs.dev']
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  })()
  provider = new WebrtcProvider(room, ydoc, { signaling, iceServers })
  yCanvasMap = ydoc.getMap('canvas')

  // Presence using awareness
  const awareness = provider.awareness
  const store = useCanvasStore.getState()
  // Set initial local state
  awareness.setLocalStateField('user', {
    id: store.collaborators[0]?.id || 'me',
    name: store.collaborators[0]?.name || 'You',
    color: '#3B82F6',
  })

  const updatePresenceFromAwareness = () => {
    const states = Array.from(awareness.getStates().values()) as any[]
    // Map to collaborators in store
    states.forEach((s: any, idx: number) => {
      if (!s) return
      const id = s.user?.id || `peer-${idx}`
      store.updateCollaborator({
        id,
        name: s.user?.name || id,
        cursor: s.cursor || undefined,
        selection: s.selection || undefined,
      })
    })
  }

  awareness.on('change', updatePresenceFromAwareness)

  // Update local cursor on mouse move
  const onMouseMove = (opt: fabric.IEvent) => {
    const pointer = canvas.getPointer(opt.e)
    awareness.setLocalStateField('cursor', { x: pointer.x, y: pointer.y })
  }
  canvas.on('mouse:move', onMouseMove)

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
    canvas.off('mouse:move', onMouseMove)
    yCanvasMap && yCanvasMap.unobserve(mapObserver)
    awareness.off('change', updatePresenceFromAwareness)
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

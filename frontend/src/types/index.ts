export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt: string
}

export interface Project {
  id: string
  title: string
  slug: string
  ownerId: string
  description?: string
  thumbnail?: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  collaborators: Collaborator[]
}

export interface Collaborator {
  userId: string
  user: User
  role: 'owner' | 'editor' | 'commenter' | 'viewer'
  addedAt: string
}

export interface Artboard {
  id: string
  projectId: string
  name: string
  width: number
  height: number
  backgroundColor: string
  position: { x: number; y: number }
  createdAt: string
}

export interface Layer {
  id: string
  artboardId: string
  type: 'text' | 'shape' | 'image' | 'group'
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  position: { x: number; y: number }
  size: { width: number; height: number }
  properties: Record<string, any>
  createdAt: string
}

export interface Asset {
  id: string
  projectId: string
  filename: string
  mimeType: string
  size: number
  url: string
  thumbnail?: string
  tags: string[]
  uploadedAt: string
}

export interface Comment {
  id: string
  projectId: string
  elementId?: string
  userId: string
  user: User
  content: string
  position?: { x: number; y: number }
  resolved: boolean
  createdAt: string
  replies: CommentReply[]
}

export interface CommentReply {
  id: string
  commentId: string
  userId: string
  user: User
  content: string
  createdAt: string
}

export interface Version {
  id: string
  projectId: string
  name: string
  description?: string
  snapshot: any
  createdBy: string
  createdAt: string
}

export interface Plugin {
  id: string
  name: string
  description: string
  version: string
  author: string
  icon?: string
  category: string
  enabled: boolean
  permissions: string[]
}

export interface CanvasState {
  zoom: number
  pan: { x: number; y: number }
  selectedObjects: string[]
  tool: 'select' | 'pen' | 'text' | 'shape' | 'image'
  grid: {
    visible: boolean
    size: number
    snap: boolean
  }
}

export interface CollaboratorPresence {
  userId: string
  user: User
  cursor?: { x: number; y: number }
  selection?: string[]
  color: string
  lastSeen: string
}

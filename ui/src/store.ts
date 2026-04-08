import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type XYPosition,
} from '@xyflow/react'
import type { CameraDevice, CameraNodeData, RTSPNodeData } from './types'

let nodeIdCounter = 0
const nextId = (type: string) => `${type}_${++nodeIdCounter}`

interface FlowState {
  nodes: Node[]
  edges: Edge[]
  cameras: CameraDevice[]
  isRunning: boolean

  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  addNode: (type: string, position: XYPosition) => void
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
  setCameras: (cameras: CameraDevice[]) => void
  listCameras: () => Promise<void>
  startFlow: () => Promise<void>
  stopFlow: () => Promise<void>
  updatePipelineStatus: (edgeId: string, status: string, error?: string) => void
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  cameras: [],
  isRunning: false,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },

  onConnect: (connection) => {
    set({ edges: addEdge({ ...connection, animated: false }, get().edges) })
  },

  addNode: (type, position) => {
    const id = nextId(type)
    let data: CameraNodeData | RTSPNodeData

    if (type === 'camera') {
      const cameras = get().cameras
      data = {
        label: 'Camera',
        device: cameras[0]?.name || 'Default',
        deviceIndex: cameras[0]?.index ?? 0,
        resolution: '1280x720',
        status: 'idle',
      }
    } else {
      data = {
        label: 'RTSP Output',
        path: 'live',
        port: 8554,
        status: 'idle',
      }
    }

    set({ nodes: [...get().nodes, { id, type, position, data }] })
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    })
  },

  setCameras: (cameras) => set({ cameras }),

  listCameras: async () => {
    if (!window.relay) return
    const cameras = await window.relay.listCameras()
    set({ cameras })
    // Update any existing camera nodes with the first camera if they have no valid device
    const { nodes } = get()
    if (cameras.length > 0) {
      const updated = nodes.map((node) => {
        if (node.type === 'camera' && node.data.device === 'Default') {
          return {
            ...node,
            data: { ...node.data, device: cameras[0].name, deviceIndex: cameras[0].index },
          }
        }
        return node
      })
      set({ nodes: updated })
    }
  },

  startFlow: async () => {
    if (!window.relay) return
    const { nodes, edges } = get()

    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source)
      const targetNode = nodes.find((n) => n.id === edge.target)

      if (sourceNode?.type === 'camera' && targetNode?.type === 'rtspOutput') {
        get().updateNodeData(sourceNode.id, { status: 'starting' })
        get().updateNodeData(targetNode.id, { status: 'starting' })

        set({
          edges: get().edges.map((e) =>
            e.id === edge.id ? { ...e, animated: true, style: { stroke: '#3fb950', strokeWidth: 2 } } : e
          ),
        })

        await window.relay.startPipeline({
          id: edge.id,
          camera: {
            device: sourceNode.data.device as string,
            index: sourceNode.data.deviceIndex as number,
          },
          rtsp: {
            path: targetNode.data.path as string,
            port: targetNode.data.port as number,
          },
        })
      }
    }

    set({ isRunning: true })
  },

  stopFlow: async () => {
    if (!window.relay) return
    await window.relay.stopAll()

    set({
      isRunning: false,
      nodes: get().nodes.map((node) => ({
        ...node,
        data: { ...node.data, status: 'idle', error: undefined },
      })),
      edges: get().edges.map((edge) => ({
        ...edge,
        animated: false,
        style: { stroke: '#58a6ff', strokeWidth: 2 },
      })),
    })
  },

  updatePipelineStatus: (edgeId, status, error) => {
    const { nodes, edges } = get()
    const edge = edges.find((e) => e.id === edgeId)
    if (!edge) return

    const sourceNode = nodes.find((n) => n.id === edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)

    if (sourceNode) get().updateNodeData(sourceNode.id, { status, error })
    if (targetNode) get().updateNodeData(targetNode.id, { status, error })

    set({
      edges: get().edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              animated: status === 'streaming',
              style: {
                stroke: status === 'streaming' ? '#3fb950' : status === 'error' ? '#f85149' : '#58a6ff',
                strokeWidth: 2,
              },
            }
          : e
      ),
    })

    if (status === 'stopped' || status === 'error') {
      const anyRunning = get().edges.some((e) => e.animated)
      if (!anyRunning) set({ isRunning: false })
    }
  },
}))

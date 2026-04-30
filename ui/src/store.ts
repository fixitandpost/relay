import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type XYPosition,
} from '@xyflow/react'
import {
  OUTPUT_DEFAULT_PORTS,
  OUTPUT_LABELS,
  OUTPUT_TYPES,
  SOURCE_TYPES,
  isValidPipelinePair,
  sanitizePath,
  validateFlow,
} from './flow'
import type { CameraDevice, LogEntry, OutputType, PipelineSource, SourceType } from './types'

let nodeIdCounter = 0
const nextId = (type: string) => `${type}_${++nodeIdCounter}`

const DEFAULT_EDGE_STYLE = { stroke: '#58a6ff', strokeWidth: 2 }
const ERROR_EDGE_STYLE = { stroke: '#f85149', strokeWidth: 2 }
const STREAMING_EDGE_STYLE = { stroke: '#3fb950', strokeWidth: 2 }

interface FlowState {
  nodes: Node[]
  edges: Edge[]
  cameras: CameraDevice[]
  isRunning: boolean
  logs: LogEntry[]

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
  addLog: (pipelineId: string, message: string) => void
  clearLogs: () => void
}

function buildSource(node: Node): PipelineSource | null {
  const data = node.data as Record<string, unknown>

  switch (node.type) {
    case 'camera':
      return {
        type: 'camera',
        device: data.device as string,
        index: data.deviceIndex as number,
        resolution: data.resolution as string,
      }

    case 'rtspSource':
      return { type: 'rtspSource', url: data.url as string }

    case 'rtmpSource':
      return { type: 'rtmpSource', url: data.url as string }

    case 'srtSource':
      return { type: 'srtSource', url: data.url as string }

    case 'hlsSource':
      return { type: 'hlsSource', url: data.url as string }

    default:
      return null
  }
}

function resetNodeRuntime(node: Node): Node {
  return {
    ...node,
    data: { ...node.data, status: 'idle', error: undefined, activePath: undefined },
  }
}

function resetEdgeRuntime(edge: Edge): Edge {
  return {
    ...edge,
    animated: false,
    style: DEFAULT_EDGE_STYLE,
  }
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  cameras: [],
  isRunning: false,
  logs: [],

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) {
      return
    }

    const { nodes, edges } = get()
    const sourceNode = nodes.find((node) => node.id === connection.source)
    const targetNode = nodes.find((node) => node.id === connection.target)

    if (!sourceNode || !targetNode || !isValidPipelinePair(sourceNode.type, targetNode.type)) {
      return
    }

    const duplicate = edges.some((edge) => edge.source === connection.source && edge.target === connection.target)
    if (duplicate) {
      return
    }

    set({ edges: addEdge({ ...connection, animated: false }, edges) })
  },

  addNode: (type, position) => {
    const id = nextId(type)
    let data: Record<string, unknown>

    if (type === 'camera') {
      const cameras = get().cameras
      data = {
        label: 'Camera',
        device: cameras[0]?.name || 'Default',
        deviceIndex: cameras[0]?.index ?? 0,
        resolution: '1280x720',
        status: 'idle',
      }
    } else if (SOURCE_TYPES.includes(type as SourceType) && type !== 'camera') {
      const labels: Record<string, string> = {
        rtspSource: 'RTSP Source',
        rtmpSource: 'RTMP Source',
        srtSource: 'SRT Source',
        hlsSource: 'HLS Source',
      }

      data = {
        label: labels[type] || type,
        url: '',
        status: 'idle',
      }
    } else if (OUTPUT_TYPES.includes(type as OutputType)) {
      const outputType = type as OutputType
      data = {
        label: OUTPUT_LABELS[outputType],
        path: 'live',
        port: OUTPUT_DEFAULT_PORTS[outputType],
        status: 'idle',
      }
    } else {
      data = { label: type, status: 'idle' }
    }

    set({ nodes: [...get().nodes, { id, type, position, data }] })
  },

  updateNodeData: (nodeId, data) => {
    const isConfigChange = Object.keys(data).some((key) => !['status', 'error', 'activePath'].includes(key))

    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== nodeId) {
          return node
        }

        const currentData = node.data as Record<string, unknown>
        const resetData = isConfigChange
          ? {
              error: undefined,
              status: currentData.status === 'error' ? 'idle' : currentData.status,
            }
          : {}

        return {
          ...node,
          data: {
            ...currentData,
            ...data,
            ...resetData,
          },
        }
      }),
    })
  },

  setCameras: (cameras) => set({ cameras }),

  listCameras: async () => {
    if (!window.relay) return

    const cameras = await window.relay.listCameras()
    set({ cameras })

    if (cameras.length === 0) {
      return
    }

    set({
      nodes: get().nodes.map((node) => {
        if (node.type !== 'camera') {
          return node
        }

        const nodeData = node.data as Record<string, unknown>
        if (nodeData.device !== 'Default') {
          return node
        }

        return {
          ...node,
          data: { ...node.data, device: cameras[0].name, deviceIndex: cameras[0].index },
        }
      }),
    })
  },

  startFlow: async () => {
    if (!window.relay) return

    const resetNodes = get().nodes.map(resetNodeRuntime)
    const resetEdges = get().edges.map(resetEdgeRuntime)
    set({ logs: [], isRunning: false, nodes: resetNodes, edges: resetEdges })

    const { pipelineEdges, nodeErrors } = validateFlow(resetNodes, resetEdges)

    if (nodeErrors.size > 0) {
      set({
        nodes: get().nodes.map((node) => {
          const error = nodeErrors.get(node.id)
          if (!error) {
            return node
          }

          return {
            ...node,
            data: { ...node.data, status: 'error', error },
          }
        }),
      })
    }

    if (pipelineEdges.length === 0) {
      return
    }

    let startedPipelines = 0

    for (const edge of pipelineEdges) {
      const nodes = get().nodes
      const sourceNode = nodes.find((node) => node.id === edge.source)
      const targetNode = nodes.find((node) => node.id === edge.target)
      if (!sourceNode || !targetNode) {
        continue
      }

      const source = buildSource(sourceNode)
      if (!source) {
        continue
      }

      const targetData = targetNode.data as Record<string, unknown>
      const path = sanitizePath(targetData.path)

      get().updateNodeData(sourceNode.id, { status: 'starting', activePath: path, error: undefined })
      get().updateNodeData(targetNode.id, { status: 'starting', error: undefined })

      set({
        edges: get().edges.map((currentEdge) =>
          currentEdge.id === edge.id
            ? { ...currentEdge, animated: true, style: STREAMING_EDGE_STYLE }
            : currentEdge
        ),
      })

      try {
        await window.relay.startPipeline({
          id: edge.id,
          source,
          output: { path },
        })
        startedPipelines++
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start pipeline'
        get().updateNodeData(sourceNode.id, { status: 'error', error: message })
        get().updateNodeData(targetNode.id, { status: 'error', error: message })
        set({
          edges: get().edges.map((currentEdge) =>
            currentEdge.id === edge.id
              ? { ...currentEdge, animated: false, style: ERROR_EDGE_STYLE }
              : currentEdge
          ),
        })
      }
    }

    set({ isRunning: startedPipelines > 0 })
  },

  stopFlow: async () => {
    if (!window.relay) return

    await window.relay.stopAll()
    set({
      isRunning: false,
      nodes: get().nodes.map(resetNodeRuntime),
      edges: get().edges.map(resetEdgeRuntime),
    })
  },

  updatePipelineStatus: (edgeId, status, error) => {
    const { nodes, edges } = get()
    const edge = edges.find((currentEdge) => currentEdge.id === edgeId)
    if (!edge) {
      return
    }

    const sourceNode = nodes.find((node) => node.id === edge.source)
    const targetNode = nodes.find((node) => node.id === edge.target)

    if (sourceNode) {
      get().updateNodeData(sourceNode.id, { status, error })
    }

    if (targetNode) {
      get().updateNodeData(targetNode.id, { status, error })
    }

    const nextEdges = get().edges.map((currentEdge) =>
      currentEdge.id === edgeId
        ? {
            ...currentEdge,
            animated: status === 'streaming',
            style:
              status === 'streaming'
                ? STREAMING_EDGE_STYLE
                : status === 'error'
                  ? ERROR_EDGE_STYLE
                  : DEFAULT_EDGE_STYLE,
          }
        : currentEdge
    )

    set({
      edges: nextEdges,
      isRunning: status === 'streaming' || nextEdges.some((currentEdge) => currentEdge.animated),
    })
  },

  addLog: (pipelineId, message) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pipelineId,
      message: message.trim(),
      timestamp: Date.now(),
    }

    set({ logs: [...get().logs, entry].slice(-500) })
  },

  clearLogs: () => set({ logs: [] }),
}))

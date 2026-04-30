import { useCallback, useEffect, type DragEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from './store'
import { isValidConnectionBetweenNodes } from './flow'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { LogPanel } from './components/LogPanel'
import { CameraNode } from './nodes/CameraNode'
import { RTSPSourceNode } from './nodes/RTSPSourceNode'
import { RTMPSourceNode } from './nodes/RTMPSourceNode'
import { SRTSourceNode } from './nodes/SRTSourceNode'
import { HLSSourceNode } from './nodes/HLSSourceNode'
import { RTSPOutputNode } from './nodes/RTSPOutputNode'
import { RTMPOutputNode } from './nodes/RTMPOutputNode'
import { HLSOutputNode } from './nodes/HLSOutputNode'
import { WebRTCOutputNode } from './nodes/WebRTCOutputNode'
import { SRTOutputNode } from './nodes/SRTOutputNode'
import type { PipelineStatusUpdate } from './types'

const nodeTypes = {
  camera: CameraNode,
  rtspSource: RTSPSourceNode,
  rtmpSource: RTMPSourceNode,
  srtSource: SRTSourceNode,
  hlsSource: HLSSourceNode,
  rtspOutput: RTSPOutputNode,
  rtmpOutput: RTMPOutputNode,
  hlsOutput: HLSOutputNode,
  webrtcOutput: WebRTCOutputNode,
  srtOutput: SRTOutputNode,
}

const defaultEdgeOptions = {
  style: { stroke: '#58a6ff', strokeWidth: 2 },
  type: 'smoothstep',
}

function Flow() {
  const { screenToFlowPosition } = useReactFlow()
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    listCameras,
    updatePipelineStatus,
    addLog,
  } = useFlowStore()

  useEffect(() => {
    void listCameras()

    if (window.relay) {
      const unsubscribeStatus = window.relay.onPipelineStatus((data: PipelineStatusUpdate) => {
        updatePipelineStatus(data.id, data.status, data.error)
      })
      const unsubscribeLogs = window.relay.onPipelineLog((data: { id: string; message: string }) => {
        addLog(data.id, data.message)
      })
      const unsubscribeCameraGranted = window.relay.onCameraGranted(() => {
        void listCameras()
      })

      return () => {
        unsubscribeStatus()
        unsubscribeLogs()
        unsubscribeCameraGranted()
      }
    }
  }, [addLog, listCameras, updatePipelineStatus])

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addNode(type, position)
    },
    [screenToFlowPosition, addNode]
  )

  const isValidConnection = useCallback(
    (connection: Connection) => isValidConnectionBetweenNodes(nodes, connection),
    [nodes]
  )

  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        <Sidebar />
        <div className="canvas-area">
          <div className="canvas-wrapper">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              isValidConnection={isValidConnection}
              fitView
              fitViewOptions={{ padding: 0.3, maxZoom: 0.85 }}
              minZoom={0.2}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#30363d" />
              <Controls />
              <MiniMap
                style={{ background: '#161b22' }}
                nodeColor="#30363d"
                maskColor="rgba(0,0,0,0.3)"
              />
            </ReactFlow>
          </div>
          <LogPanel />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  )
}

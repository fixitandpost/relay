import { useCallback, useEffect, DragEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from './store'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { CameraNode } from './nodes/CameraNode'
import { RTSPOutputNode } from './nodes/RTSPOutputNode'
import type { PipelineStatusUpdate } from './types'

const nodeTypes = {
  camera: CameraNode,
  rtspOutput: RTSPOutputNode,
}

const defaultEdgeOptions = {
  style: { stroke: '#58a6ff', strokeWidth: 2 },
  type: 'smoothstep',
}

function Flow() {
  const { screenToFlowPosition } = useReactFlow()
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, listCameras, updatePipelineStatus } =
    useFlowStore()

  useEffect(() => {
    listCameras()

    if (window.relay) {
      window.relay.onPipelineStatus((data: PipelineStatusUpdate) => {
        updatePipelineStatus(data.id, data.status, data.error)
      })
    }

    return () => {
      if (window.relay) {
        window.relay.removeAllListeners('pipeline-status')
        window.relay.removeAllListeners('pipeline-log')
      }
    }
  }, [])

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

  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        <Sidebar />
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

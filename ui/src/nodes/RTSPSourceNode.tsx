import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useFlowStore } from '../store'
import type { RTSPSourceNodeData } from '../types'

export function RTSPSourceNode({ id, data }: NodeProps) {
  const { updateNodeData } = useFlowStore()
  const d = data as RTSPSourceNodeData

  return (
    <div className={`flow-node ${d.status === 'streaming' ? 'streaming' : ''}`}>
      <div className="node-header source">
        <span className="node-icon">{'\u{1F4F9}'}</span>
        <span>RTSP Source</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <label>RTSP URL</label>
          <input
            type="text"
            value={d.url}
            onChange={(e) => updateNodeData(id, { url: e.target.value })}
            placeholder="rtsp://192.168.1.100:8554/stream"
          />
        </div>
        <div className={`status-badge ${d.status}`}>
          <span className="status-dot" />
          {d.status}
        </div>
        {d.error && <div className="node-error">{d.error}</div>}
      </div>
      <Handle type="source" position={Position.Right} id="video-out" />
    </div>
  )
}

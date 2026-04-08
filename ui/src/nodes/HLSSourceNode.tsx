import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useFlowStore } from '../store'
import type { HLSSourceNodeData } from '../types'

export function HLSSourceNode({ id, data }: NodeProps) {
  const { updateNodeData } = useFlowStore()
  const d = data as HLSSourceNodeData

  return (
    <div className={`flow-node ${d.status === 'streaming' ? 'streaming' : ''}`}>
      <div className="node-header source">
        <span className="node-icon">{'\u{1F310}'}</span>
        <span>HLS Source</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <label>HLS URL</label>
          <input
            type="text"
            value={d.url}
            onChange={(e) => updateNodeData(id, { url: e.target.value })}
            placeholder="https://example.com/stream.m3u8"
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

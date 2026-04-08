import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useFlowStore } from '../store'
import type { SRTSourceNodeData } from '../types'

export function SRTSourceNode({ id, data }: NodeProps) {
  const { updateNodeData } = useFlowStore()
  const d = data as SRTSourceNodeData

  return (
    <div className={`flow-node ${d.status === 'streaming' ? 'streaming' : ''}`}>
      <div className="node-header source">
        <span className="node-icon">{'\u{1F50C}'}</span>
        <span>SRT Source</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <label>SRT URL</label>
          <input
            type="text"
            value={d.url}
            onChange={(e) => updateNodeData(id, { url: e.target.value })}
            placeholder="srt://192.168.1.100:8890"
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

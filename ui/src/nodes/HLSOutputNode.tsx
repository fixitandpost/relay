import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useFlowStore } from '../store'
import type { HLSOutputNodeData } from '../types'

export function HLSOutputNode({ id, data }: NodeProps) {
  const { updateNodeData } = useFlowStore()
  const d = data as HLSOutputNodeData
  const url = `http://localhost:${d.port}/${d.path}`

  return (
    <div className={`flow-node ${d.status === 'streaming' ? 'streaming' : ''}`}>
      <Handle type="target" position={Position.Left} id="video-in" />
      <div className="node-header output">
        <span className="node-icon">{'\u{1F4FA}'}</span>
        <span>HLS Output</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <label>Path</label>
          <input
            type="text"
            value={d.path}
            onChange={(e) => updateNodeData(id, { path: e.target.value })}
            placeholder="live"
          />
        </div>
        <div className="node-field">
          <label>Port</label>
          <input
            type="number"
            value={d.port}
            onChange={(e) => updateNodeData(id, { port: parseInt(e.target.value) || 8888 })}
          />
        </div>
        <div className="node-field">
          <label>Stream URL</label>
          <div className="url-display" onClick={() => navigator.clipboard.writeText(url)}>
            <code>{url}</code>
            <span className="copy-hint">click to copy</span>
          </div>
        </div>
        <div className={`status-badge ${d.status}`}>
          <span className="status-dot" />
          {d.status}
        </div>
        {d.error && <div className="node-error">{d.error}</div>}
      </div>
    </div>
  )
}

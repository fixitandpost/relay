import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useFlowStore } from '../store'
import { WHEPPreview } from '../components/WHEPPreview'
import type { SRTOutputNodeData } from '../types'

export function SRTOutputNode({ id, data }: NodeProps) {
  const { updateNodeData } = useFlowStore()
  const d = data as SRTOutputNodeData
  const url = `srt://localhost:${d.port}?streamid=read:${d.path}`

  return (
    <div className={`flow-node ${d.status === 'streaming' ? 'streaming' : ''}`}>
      <Handle type="target" position={Position.Left} id="video-in" />
      <div className="node-header output output-srt">
        <span className="node-icon">{'\u{1F50C}'}</span>
        <span>SRT Output</span>
      </div>
      <WHEPPreview path={d.path} active={d.status === 'streaming'} />
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
            onChange={(e) => updateNodeData(id, { port: parseInt(e.target.value) || 8890 })}
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

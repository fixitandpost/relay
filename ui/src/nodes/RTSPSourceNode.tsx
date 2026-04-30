import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useFlowStore } from '../store'
import { WHEPPreview } from '../components/WHEPPreview'
import type { RTSPSourceNodeData } from '../types'

const VALID_PREFIXES = ['rtsp://', 'rtsps://']

export function RTSPSourceNode({ id, data }: NodeProps) {
  const { updateNodeData } = useFlowStore()
  const d = data as RTSPSourceNodeData
  const hasUrl = d.url.length > 0
  const validPrefix = !hasUrl || VALID_PREFIXES.some((p) => d.url.startsWith(p))

  return (
    <div className={`flow-node ${d.status === 'streaming' ? 'streaming' : ''}`}>
      <div className="node-header source source-rtsp">
        <span className="node-icon">{'\u{1F4F9}'}</span>
        <span>RTSP Source</span>
      </div>
      {d.activePath && <WHEPPreview path={d.activePath} active={d.status === 'streaming'} />}
      <div className="node-body">
        <div className="node-field">
          <label>RTSP URL</label>
          <input
            type="text"
            value={d.url}
            onChange={(e) => updateNodeData(id, { url: e.target.value })}
            placeholder="rtsp://192.168.1.100:8554/stream"
            className={hasUrl && !validPrefix ? 'input-error' : ''}
          />
          {hasUrl && !validPrefix && (
            <span className="field-hint error">URL must start with rtsp:// or rtsps://</span>
          )}
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

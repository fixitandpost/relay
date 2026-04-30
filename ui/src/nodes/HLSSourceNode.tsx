import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useFlowStore } from '../store'
import { WHEPPreview } from '../components/WHEPPreview'
import type { HLSSourceNodeData } from '../types'

const VALID_PREFIXES = ['http://', 'https://']

export function HLSSourceNode({ id, data }: NodeProps) {
  const { updateNodeData } = useFlowStore()
  const d = data as HLSSourceNodeData
  const hasUrl = d.url.length > 0
  const validPrefix = !hasUrl || VALID_PREFIXES.some((p) => d.url.startsWith(p))
  const hasM3u8 = !hasUrl || d.url.includes('.m3u8')

  return (
    <div className={`flow-node ${d.status === 'streaming' ? 'streaming' : ''}`}>
      <div className="node-header source source-hls">
        <span className="node-icon">{'\u{1F310}'}</span>
        <span>HLS Source</span>
      </div>
      {d.activePath && <WHEPPreview path={d.activePath} active={d.status === 'streaming'} />}
      <div className="node-body">
        <div className="node-field">
          <label>HLS URL</label>
          <input
            type="text"
            value={d.url}
            onChange={(e) => updateNodeData(id, { url: e.target.value })}
            placeholder="https://example.com/stream/index.m3u8"
            className={hasUrl && (!validPrefix || !hasM3u8) ? 'input-error' : ''}
          />
          {hasUrl && !validPrefix && (
            <span className="field-hint error">URL must start with http:// or https://</span>
          )}
          {hasUrl && validPrefix && !hasM3u8 && (
            <span className="field-hint warning">Expected .m3u8 playlist URL</span>
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

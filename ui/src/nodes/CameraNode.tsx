import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useFlowStore } from '../store'
import { CameraPreview } from '../components/CameraPreview'
import type { CameraNodeData } from '../types'

export function CameraNode({ id, data }: NodeProps) {
  const { cameras, updateNodeData } = useFlowStore()
  const d = data as CameraNodeData

  return (
    <div className={`flow-node ${d.status === 'streaming' ? 'streaming' : ''}`}>
      <div className="node-header source source-camera">
        <span className="node-icon">{'\u{1F4F9}'}</span>
        <span>Camera Source</span>
      </div>
      <CameraPreview deviceName={d.device} active={true} />
      <div className="node-body">
        <div className="node-field">
          <label>Device</label>
          <select
            value={d.deviceIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value)
              const cam = cameras.find((c) => c.index === idx)
              updateNodeData(id, { deviceIndex: idx, device: cam?.name || '' })
            }}
          >
            {cameras.length === 0 && <option value={0}>No cameras found</option>}
            {cameras.map((cam) => (
              <option key={cam.index} value={cam.index}>
                {cam.name}
              </option>
            ))}
          </select>
        </div>
        <div className="node-field">
          <label>Resolution</label>
          <select value={d.resolution} onChange={(e) => updateNodeData(id, { resolution: e.target.value })}>
            <option value="1920x1080">1920 x 1080</option>
            <option value="1280x720">1280 x 720</option>
            <option value="640x480">640 x 480</option>
          </select>
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

import { DragEvent } from 'react'
import { useFlowStore } from '../store'

const nodeTypes = [
  {
    type: 'camera',
    label: 'Camera',
    icon: '\u{1F4F9}',
    description: 'Webcam or USB camera',
    category: 'source',
  },
  {
    type: 'rtspSource',
    label: 'RTSP Source',
    icon: '\u{1F4F9}',
    description: 'Pull from RTSP URL',
    category: 'source',
  },
  {
    type: 'rtmpSource',
    label: 'RTMP Source',
    icon: '\u{1F399}',
    description: 'Pull from RTMP URL',
    category: 'source',
  },
  {
    type: 'srtSource',
    label: 'SRT Source',
    icon: '\u{1F50C}',
    description: 'Receive SRT stream',
    category: 'source',
  },
  {
    type: 'hlsSource',
    label: 'HLS Source',
    icon: '\u{1F310}',
    description: 'Pull from HLS URL',
    category: 'source',
  },
  {
    type: 'rtspOutput',
    label: 'RTSP Output',
    icon: '\u{1F4E1}',
    description: 'Stream via RTSP',
    category: 'output',
  },
  {
    type: 'rtmpOutput',
    label: 'RTMP Output',
    icon: '\u{1F4E4}',
    description: 'Stream via RTMP',
    category: 'output',
  },
  {
    type: 'hlsOutput',
    label: 'HLS Output',
    icon: '\u{1F4FA}',
    description: 'Stream via HLS',
    category: 'output',
  },
  {
    type: 'webrtcOutput',
    label: 'WebRTC Output',
    icon: '\u{1F30D}',
    description: 'Stream via WebRTC',
    category: 'output',
  },
  {
    type: 'srtOutput',
    label: 'SRT Output',
    icon: '\u{1F50C}',
    description: 'Stream via SRT',
    category: 'output',
  },
]

export function Sidebar() {
  const { addNode } = useFlowStore()

  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onClick = (nodeType: string) => {
    // Sources go on the left, outputs on the right — natural flow direction
    const offsetY = Math.round(Math.random() * 80 - 40)
    const isSource = nodeTypes.find((n) => n.type === nodeType)?.category === 'source'
    const baseX = isSource ? 100 : 600
    addNode(nodeType, { x: baseX + Math.round(Math.random() * 40 - 20), y: 150 + offsetY })
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">Nodes</div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Sources</div>
        {nodeTypes
          .filter((n) => n.category === 'source')
          .map((node) => (
            <div
              key={node.type}
              className="sidebar-node source"
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              onClick={() => onClick(node.type)}
              data-node-type={node.type}
            >
              <span className="sidebar-node-icon">{node.icon}</span>
              <div className="sidebar-node-info">
                <div className="sidebar-node-label">{node.label}</div>
                <div className="sidebar-node-desc">{node.description}</div>
              </div>
            </div>
          ))}
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Outputs</div>
        {nodeTypes
          .filter((n) => n.category === 'output')
          .map((node) => (
            <div
              key={node.type}
              className="sidebar-node output"
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              onClick={() => onClick(node.type)}
              data-node-type={node.type}
            >
              <span className="sidebar-node-icon">{node.icon}</span>
              <div className="sidebar-node-info">
                <div className="sidebar-node-label">{node.label}</div>
                <div className="sidebar-node-desc">{node.description}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

import { useFlowStore } from '../store'
import { validateFlow } from '../flow'

export function Toolbar() {
  const { isRunning, startFlow, stopFlow, listCameras, edges, nodes } = useFlowStore()
  const { pipelineEdges } = validateFlow(nodes, edges)
  const hasValidPipeline = pipelineEdges.length > 0

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="toolbar-logo">{'\u26A1'}</div>
        <h1 className="toolbar-title">Relay</h1>
      </div>
      <div className="toolbar-center">
        {isRunning && (
          <div className="toolbar-status streaming">
            <span className="status-dot" />
            Streaming
          </div>
        )}
      </div>
      <div className="toolbar-right">
        <button className="toolbar-btn secondary" onClick={listCameras}>
          Refresh Cameras
        </button>
        {isRunning ? (
          <button className="toolbar-btn danger" onClick={stopFlow}>
            Stop Flow
          </button>
        ) : (
          <button className="toolbar-btn primary" onClick={startFlow} disabled={!hasValidPipeline}>
            Start Flow
          </button>
        )}
      </div>
    </div>
  )
}

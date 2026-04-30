import { useEffect, useRef, useState } from 'react'
import { useFlowStore } from '../store'

export function LogPanel() {
  const { logs, clearLogs, isRunning } = useFlowStore()
  const [open, setOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current && open) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs.length, open])

  // Auto-open when running
  useEffect(() => {
    if (isRunning && logs.length > 0) setOpen(true)
  }, [isRunning, logs.length])

  const logCount = logs.length

  return (
    <div className={`log-panel ${open ? 'open' : ''}`}>
      <div className="log-panel-header">
        <button className="log-panel-toggle" onClick={() => setOpen(!open)}>
          <span className={`sidebar-chevron ${open ? 'open' : ''}`} />
          <span>Pipeline Logs</span>
          {logCount > 0 && <span className="log-count">{logCount}</span>}
        </button>
        {open && logCount > 0 && (
          <button className="log-clear" onClick={clearLogs}>
            Clear
          </button>
        )}
      </div>
      {open && (
        <div className="log-panel-body" ref={scrollRef}>
          {logs.length === 0 ? (
            <div className="log-empty">No logs yet. Start a pipeline to see output.</div>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="log-line">
                <span className="log-time">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="log-pipe">{entry.pipelineId}</span>
                <span className="log-msg">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export interface CameraDevice {
  index: number
  name: string
}

/* ── Source types ── */

export type SourceType = 'camera' | 'rtspSource' | 'rtmpSource' | 'srtSource' | 'hlsSource'
export type OutputType = 'rtspOutput' | 'rtmpOutput' | 'hlsOutput' | 'webrtcOutput' | 'srtOutput'
export type NodeStatus = 'idle' | 'starting' | 'streaming' | 'error'

export interface CameraNodeData {
  label: string
  device: string
  deviceIndex: number
  resolution: string
  activePath?: string
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

export interface RTSPSourceNodeData {
  label: string
  url: string
  activePath?: string
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

export interface RTMPSourceNodeData {
  label: string
  url: string
  activePath?: string
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

export interface SRTSourceNodeData {
  label: string
  url: string
  activePath?: string
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

export interface HLSSourceNodeData {
  label: string
  url: string
  activePath?: string
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

export interface LogEntry {
  id: string
  pipelineId: string
  message: string
  timestamp: number
}

/* ── Output types ── */

export interface RTSPNodeData {
  label: string
  path: string
  port: number
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

export interface RTMPOutputNodeData {
  label: string
  path: string
  port: number
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

export interface HLSOutputNodeData {
  label: string
  path: string
  port: number
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

export interface WebRTCOutputNodeData {
  label: string
  path: string
  port: number
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

export interface SRTOutputNodeData {
  label: string
  path: string
  port: number
  status: NodeStatus
  error?: string
  [key: string]: unknown
}

/* ── Pipeline config ── */

export type PipelineSource =
  | { type: 'camera'; device: string; index: number; resolution: string }
  | { type: 'rtspSource'; url: string }
  | { type: 'rtmpSource'; url: string }
  | { type: 'srtSource'; url: string }
  | { type: 'hlsSource'; url: string }

export interface PipelineConfig {
  id: string
  source: PipelineSource
  output: { path: string }
}

export interface PipelineStatusUpdate {
  id: string
  status: 'idle' | 'starting' | 'streaming' | 'error' | 'stopped'
  error?: string
}

declare global {
  interface Window {
    relay: {
      listCameras: () => Promise<CameraDevice[]>
      startPipeline: (config: PipelineConfig) => Promise<void>
      stopPipeline: (id: string) => Promise<void>
      stopAll: () => Promise<void>
      requestCamera: () => Promise<boolean>
      onPipelineStatus: (callback: (data: PipelineStatusUpdate) => void) => () => void
      onPipelineLog: (callback: (data: { id: string; message: string }) => void) => () => void
      onCameraGranted: (callback: () => void) => () => void
    }
  }
}

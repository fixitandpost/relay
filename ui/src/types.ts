export interface CameraDevice {
  index: number
  name: string
}

export interface PipelineConfig {
  id: string
  camera: { device: string; index: number }
  rtsp: { path: string; port: number }
}

export interface PipelineStatusUpdate {
  id: string
  status: 'idle' | 'starting' | 'streaming' | 'error' | 'stopped'
  error?: string
}

export interface CameraNodeData {
  label: string
  device: string
  deviceIndex: number
  resolution: string
  status: 'idle' | 'starting' | 'streaming' | 'error'
  error?: string
  [key: string]: unknown
}

export interface RTSPNodeData {
  label: string
  path: string
  port: number
  status: 'idle' | 'starting' | 'streaming' | 'error'
  error?: string
  [key: string]: unknown
}

declare global {
  interface Window {
    relay: {
      listCameras: () => Promise<CameraDevice[]>
      startPipeline: (config: PipelineConfig) => Promise<void>
      stopPipeline: (id: string) => Promise<void>
      stopAll: () => Promise<void>
      requestCamera: () => Promise<boolean>
      onPipelineStatus: (callback: (data: PipelineStatusUpdate) => void) => void
      onPipelineLog: (callback: (data: { id: string; message: string }) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}

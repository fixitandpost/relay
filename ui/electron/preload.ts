import { contextBridge, ipcRenderer } from 'electron'

function subscribe<T>(channel: string, callback: (data: T) => void) {
  const listener = (_event: unknown, data: T) => callback(data)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.off(channel, listener)
  }
}

contextBridge.exposeInMainWorld('relay', {
  listCameras: () => ipcRenderer.invoke('list-cameras'),
  startPipeline: (config: unknown) => ipcRenderer.invoke('start-pipeline', config),
  stopPipeline: (id: string) => ipcRenderer.invoke('stop-pipeline', id),
  stopAll: () => ipcRenderer.invoke('stop-all'),
  requestCamera: () => ipcRenderer.invoke('request-camera'),
  onPipelineStatus: (callback: (data: unknown) => void) => subscribe('pipeline-status', callback),
  onPipelineLog: (callback: (data: unknown) => void) => subscribe('pipeline-log', callback),
  onCameraGranted: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('camera-granted', listener)
    return () => {
      ipcRenderer.off('camera-granted', listener)
    }
  },
})

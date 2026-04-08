import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('relay', {
  listCameras: () => ipcRenderer.invoke('list-cameras'),
  startPipeline: (config: unknown) => ipcRenderer.invoke('start-pipeline', config),
  stopPipeline: (id: string) => ipcRenderer.invoke('stop-pipeline', id),
  stopAll: () => ipcRenderer.invoke('stop-all'),
  requestCamera: () => ipcRenderer.invoke('request-camera'),
  onPipelineStatus: (callback: (data: unknown) => void) => {
    ipcRenderer.on('pipeline-status', (_event, data) => callback(data))
  },
  onPipelineLog: (callback: (data: unknown) => void) => {
    ipcRenderer.on('pipeline-log', (_event, data) => callback(data))
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
})

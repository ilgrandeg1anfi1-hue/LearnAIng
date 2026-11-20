import { contextBridge, ipcRenderer } from 'electron'

// Only specific functions, never ipcRenderer itself.
const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version')
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api

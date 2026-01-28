import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  ...electronAPI,
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },
    removeListener: (channel: string, listener: (...args: any[]) => void) =>
      ipcRenderer.removeListener(channel, listener)
  }
}

if (process.contextIsolated) {
  try {
    if (!window.electron) {
      contextBridge.exposeInMainWorld('electron', api)
    }
  } catch (error) {
    console.warn(`[Preload] electron API already exposed, skipping ${error}`)
  }
} else {
  window.electron = api
}

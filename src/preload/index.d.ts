import { ElectronAPI } from '@electron-toolkit/preload'

// 定义你自定义的 ipcRenderer 类型
interface CustomAPI {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>
    on: (channel: string, listener: (...args: any[]) => void) => () => void
    removeListener: (channel: string, listener: (...args: any[]) => void) => void
  }
}

declare global {
  interface Window {
    // 合并类型
    electron: ElectronAPI & CustomAPI
    api: unknown
  }
}

export {}

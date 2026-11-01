
import type { ElectronAPI } from '@electron-toolkit/preload'

interface MacIslandAPI {
  setExpanded: (expanded: boolean) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: MacIslandAPI
  }
}

export {}

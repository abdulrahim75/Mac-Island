import type { ElectronAPI } from '@electron-toolkit/preload'

interface MacIslandAPI {
  setExpanded: (expanded: boolean) => Promise<void>
  getClipboardHistory: () => Promise<MacIslandClipboardItem[]>
  onClipboardUpdate: (callback: (history: MacIslandClipboardItem[]) => void) => () => void
  pauseClipboardMonitoring: () => Promise<void>
  resumeClipboardMonitoring: () => Promise<void>
  copyClipboardItem: (id: string) => Promise<void>
  deleteClipboardItem: (id: string) => Promise<void>
  clearClipboardHistory: () => Promise<void>
  openSettings: () => Promise<void>
  getSettings: () => Promise<MacIslandSettings | null>
  setSettings: (patch: Partial<MacIslandSettings>) => Promise<MacIslandSettings | null>
  onSettingsUpdate: (callback: (settings: MacIslandSettings) => void) => () => void
  getBatteryState: () => Promise<MacIslandBatteryState | null>
  onBatteryUpdate: (callback: (state: MacIslandBatteryState) => void) => () => void
}

interface MacIslandSettings {
  launchAtLogin: boolean
  musicEnabled: boolean
  batteryEnabled: boolean
  clipboardEnabled: boolean
  clipboardHistorySize: number
  clipboardPaused: boolean
  automaticExpansion: boolean
  lowBatteryAlerts: boolean
  animationsEnabled: boolean
  appearance: 'system' | 'dark' | 'light'
}

interface MacIslandClipboardItem {
  id: string
  text: string
  createdAt: string
}

interface MacIslandBatteryState {
  percentage: number
  chargingState: 'charging' | 'discharging' | 'full' | 'unknown'
  adapterConnected: boolean
  timeRemainingMinutes: number | null
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: MacIslandAPI
  }
}

export {}

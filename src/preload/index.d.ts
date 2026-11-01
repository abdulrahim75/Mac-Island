import type { ElectronAPI } from '@electron-toolkit/preload'

interface MacIslandAPI {
  setExpanded: (expanded: boolean) => Promise<void>
  getBatteryState: () => Promise<MacIslandBatteryState | null>
  onBatteryUpdate: (callback: (state: MacIslandBatteryState) => void) => () => void
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

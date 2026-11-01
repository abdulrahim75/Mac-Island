import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface MacIslandBatteryState {
  percentage: number
  chargingState: 'charging' | 'discharging' | 'full' | 'unknown'
  adapterConnected: boolean
  timeRemainingMinutes: number | null
}

const api = {
  setExpanded: (expanded: boolean): Promise<void> =>
    ipcRenderer.invoke('island:set-expanded', expanded),
  getBatteryState: (): Promise<MacIslandBatteryState | null> =>
    ipcRenderer.invoke('battery:get-state'),
  onBatteryUpdate: (callback: (state: MacIslandBatteryState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: MacIslandBatteryState): void =>
      callback(state)

    ipcRenderer.on('battery:update', listener)
    ipcRenderer.send('battery:subscribe')

    return () => {
      ipcRenderer.off('battery:update', listener)
      ipcRenderer.send('battery:unsubscribe')
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

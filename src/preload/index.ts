import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { webUtils } from 'electron'

interface MacIslandBatteryState {
  percentage: number
  chargingState: 'charging' | 'discharging' | 'full' | 'unknown'
  adapterConnected: boolean
  timeRemainingMinutes: number | null
}

interface MacIslandSettings {
  launchAtLogin: boolean
  musicEnabled: boolean
  batteryEnabled: boolean
  clipboardEnabled: boolean
  clipboardHistorySize: number
  clipboardPaused: boolean
  fileEnabled: boolean
  fileShelfSize: number
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

interface MacIslandFileItem {
  id: string
  name: string
  extension: string
  size: number
  addedAt: string
  exists: boolean
}

const api = {
  setExpanded: (expanded: boolean): Promise<void> =>
    ipcRenderer.invoke('island:set-expanded', expanded),
  getClipboardHistory: (): Promise<MacIslandClipboardItem[]> =>
    ipcRenderer.invoke('clipboard:get-history'),
  onClipboardUpdate: (callback: (history: MacIslandClipboardItem[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, history: MacIslandClipboardItem[]): void =>
      callback(history)
    ipcRenderer.on('clipboard:update', listener)
    ipcRenderer.send('clipboard:subscribe')
    return () => {
      ipcRenderer.off('clipboard:update', listener)
      ipcRenderer.send('clipboard:unsubscribe')
    }
  },
  pauseClipboardMonitoring: (): Promise<void> => ipcRenderer.invoke('clipboard:pause'),
  resumeClipboardMonitoring: (): Promise<void> => ipcRenderer.invoke('clipboard:resume'),
  copyClipboardItem: (id: string): Promise<void> => ipcRenderer.invoke('clipboard:copy', id),
  deleteClipboardItem: (id: string): Promise<void> => ipcRenderer.invoke('clipboard:delete', id),
  clearClipboardHistory: (): Promise<void> => ipcRenderer.invoke('clipboard:clear'),
  addFilesToShelf: (files: FileList | File[]): Promise<MacIslandFileItem[]> => {
    const paths = Array.from(files).map((file) => webUtils.getPathForFile(file))
    return ipcRenderer.invoke('files:add-paths', paths)
  },
  getFileShelf: (): Promise<MacIslandFileItem[]> => ipcRenderer.invoke('files:get-shelf'),
  onFileShelfUpdate: (callback: (files: MacIslandFileItem[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, files: MacIslandFileItem[]): void =>
      callback(files)
    ipcRenderer.on('files:update', listener)
    ipcRenderer.send('files:subscribe')
    return () => {
      ipcRenderer.off('files:update', listener)
      ipcRenderer.send('files:unsubscribe')
    }
  },
  openShelfFile: (id: string): Promise<boolean> => ipcRenderer.invoke('files:open', id),
  removeShelfFile: (id: string): Promise<MacIslandFileItem[]> =>
    ipcRenderer.invoke('files:remove', id),
  clearFileShelf: (): Promise<MacIslandFileItem[]> => ipcRenderer.invoke('files:clear'),
  openSettings: (): Promise<void> => ipcRenderer.invoke('settings:open'),
  getSettings: (): Promise<MacIslandSettings | null> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: Partial<MacIslandSettings>): Promise<MacIslandSettings | null> =>
    ipcRenderer.invoke('settings:set', patch),
  onSettingsUpdate: (callback: (settings: MacIslandSettings) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: MacIslandSettings): void =>
      callback(settings)
    ipcRenderer.on('settings:update', listener)
    return () => ipcRenderer.off('settings:update', listener)
  },
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

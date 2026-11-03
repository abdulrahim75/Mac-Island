import { app, BrowserWindow, ipcMain, Notification, screen, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { BatteryService, BatteryState } from './batteryService'
import { MacIslandSettings, SettingsStore } from './settings'
import { ClipboardItem, ClipboardService } from './services/clipboardService'
import { FileService, ShelfFileView } from './services/fileService'

let islandWindow: BrowserWindow | null = null
const batterySubscribers = new Set<number>()
let batteryService: BatteryService | null = null
let lowBatteryNotified = false
let settingsStore: SettingsStore | null = null
let settingsWindow: BrowserWindow | null = null
let clipboardService: ClipboardService | null = null
const clipboardSubscribers = new Set<number>()
let fileService: FileService | null = null
const fileSubscribers = new Set<number>()

const COLLAPSED = { width: 260, height: 48 }
const EXPANDED = { width: 360, height: 280 }

function getIslandBounds(expanded: boolean) {
  const display = screen.getPrimaryDisplay()
  const { x: screenX, y: screenY, width: screenWidth } = display.bounds

  const { width, height } = expanded ? EXPANDED : COLLAPSED

  return {
    x: Math.round(screenX + (screenWidth - width) / 2),
    y: screenY,
    width,
    height
  }
}

function broadcastBatteryState(state: BatteryState): void {
  for (const webContentsId of batterySubscribers) {
    const subscriber = BrowserWindow.getAllWindows().find(
      (window) => window.webContents.id === webContentsId && !window.webContents.isDestroyed()
    )
    subscriber?.webContents.send('battery:update', state)
  }
}

function handleBatteryUpdate(state: BatteryState): void {
  broadcastBatteryState(state)
  const settings = settingsStore?.get()

  const isLowAndDischarging = state.percentage < 20 && state.chargingState === 'discharging'
  if (isLowAndDischarging && settings?.lowBatteryAlerts && !lowBatteryNotified) {
    new Notification({
      title: 'Low battery',
      body: `Battery is at ${state.percentage}%. Connect your Mac to power.`
    }).show()
    lowBatteryNotified = true
  }

  if (
    state.percentage >= 20 ||
    state.chargingState === 'charging' ||
    state.chargingState === 'full' ||
    state.adapterConnected
  ) {
    lowBatteryNotified = false
  }
}

function broadcastSettings(settings: MacIslandSettings): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.webContents.isDestroyed()) {
      window.webContents.send('settings:update', settings)
    }
  })
}

function broadcastClipboardHistory(history: ClipboardItem[]): void {
  for (const webContentsId of clipboardSubscribers) {
    const subscriber = BrowserWindow.getAllWindows().find(
      (window) => window.webContents.id === webContentsId && !window.webContents.isDestroyed()
    )
    subscriber?.webContents.send('clipboard:update', history)
  }
}

function broadcastFileShelf(files: ShelfFileView[]): void {
  for (const webContentsId of fileSubscribers) {
    const subscriber = BrowserWindow.getAllWindows().find(
      (window) => window.webContents.id === webContentsId && !window.webContents.isDestroyed()
    )
    subscriber?.webContents.send('files:update', files)
  }
}

function reconcileClipboardService(settings: MacIslandSettings): void {
  if (!clipboardService) return

  clipboardService.setMaxItems(settings.clipboardHistorySize)
  clipboardService.setPaused(settings.clipboardPaused)
  if (settings.clipboardEnabled && !settings.clipboardPaused) {
    clipboardService.start()
  } else if (!settings.clipboardEnabled) {
    clipboardService.stop()
  } else {
    clipboardService.stop()
  }
}

function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 620,
    height: 680,
    minWidth: 520,
    minHeight: 560,
    title: 'MacIsland Settings',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void settingsWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings.html`)
  } else {
    void settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'))
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

function createIslandWindow(): void {
  islandWindow = new BrowserWindow({
    ...getIslandBounds(false),
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  islandWindow.setAlwaysOnTop(true, 'floating')
  islandWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true
  })

  islandWindow.on('ready-to-show', () => {
    islandWindow?.show()
  })

  islandWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    islandWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    islandWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  islandWindow.on('closed', () => {
    islandWindow = null
  })
}

ipcMain.handle('island:set-expanded', (_event, expanded: boolean) => {
  if (!islandWindow || typeof expanded !== 'boolean') return

  islandWindow.setBounds(getIslandBounds(expanded), true)
})

ipcMain.handle('settings:get', () => settingsStore?.get() ?? null)

ipcMain.handle('settings:set', (_event, patch: Partial<MacIslandSettings>) => {
  if (!settingsStore) return null

  const settings = settingsStore.update(patch)
  broadcastSettings(settings)
  reconcileClipboardService(settings)
  fileService?.setMaxItems(settings.fileShelfSize)
  return settings
})

ipcMain.handle('settings:open', () => {
  createSettingsWindow()
})

ipcMain.handle('battery:get-state', () => batteryService?.getState() ?? null)

ipcMain.on('battery:subscribe', (event) => {
  batterySubscribers.add(event.sender.id)
  const state = batteryService?.getState()
  if (state) event.sender.send('battery:update', state)

  event.sender.once('destroyed', () => {
    batterySubscribers.delete(event.sender.id)
  })
})

ipcMain.on('battery:unsubscribe', (event) => {
  batterySubscribers.delete(event.sender.id)
})

ipcMain.handle('clipboard:get-history', () => clipboardService?.getHistory() ?? [])

ipcMain.handle('clipboard:pause', () => {
  clipboardService?.setPaused(true)
  settingsStore?.update({ clipboardPaused: true })
})

ipcMain.handle('clipboard:resume', () => {
  clipboardService?.setPaused(false)
  settingsStore?.update({ clipboardPaused: false })
  clipboardService?.start()
})

ipcMain.handle('clipboard:copy', (_event, id: string) => {
  if (typeof id === 'string') clipboardService?.copy(id)
})

ipcMain.handle('clipboard:delete', (_event, id: string) => {
  if (typeof id === 'string') clipboardService?.delete(id)
})

ipcMain.handle('clipboard:clear', () => clipboardService?.clear())

ipcMain.on('clipboard:subscribe', (event) => {
  clipboardSubscribers.add(event.sender.id)
  event.sender.send('clipboard:update', clipboardService?.getHistory() ?? [])
  event.sender.once('destroyed', () => {
    clipboardSubscribers.delete(event.sender.id)
  })
})

ipcMain.on('clipboard:unsubscribe', (event) => {
  clipboardSubscribers.delete(event.sender.id)
})

ipcMain.handle('files:get-shelf', () => fileService?.getShelf() ?? [])

ipcMain.handle('files:add-paths', (_event, paths: unknown) => {
  if (!Array.isArray(paths) || !settingsStore?.get().fileEnabled) return fileService?.getShelf() ?? []
  const validPaths = paths.filter((path): path is string => typeof path === 'string')
  const files = fileService?.addPaths(validPaths) ?? []
  broadcastFileShelf(files)
  return files
})

ipcMain.handle('files:open', (_event, id: unknown) => {
  return typeof id === 'string' && fileService?.open(id) ? true : false
})

ipcMain.handle('files:remove', (_event, id: unknown) => {
  if (typeof id !== 'string') return fileService?.getShelf() ?? []
  const files = fileService?.remove(id) ?? []
  broadcastFileShelf(files)
  return files
})

ipcMain.handle('files:clear', () => {
  const files = fileService?.clear() ?? []
  broadcastFileShelf(files)
  return files
})

ipcMain.on('files:subscribe', (event) => {
  fileSubscribers.add(event.sender.id)
  event.sender.send('files:update', fileService?.getShelf() ?? [])
  event.sender.once('destroyed', () => fileSubscribers.delete(event.sender.id))
})

ipcMain.on('files:unsubscribe', (event) => {
  fileSubscribers.delete(event.sender.id)
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.macisland.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  settingsStore = new SettingsStore()
  clipboardService = new ClipboardService(
    settingsStore.get().clipboardHistorySize,
    broadcastClipboardHistory
  )
  reconcileClipboardService(settingsStore.get())
  fileService = new FileService(settingsStore.get().fileShelfSize)
  createIslandWindow()
  batteryService = new BatteryService(handleBatteryUpdate)
  batteryService.start()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createIslandWindow()
    }
  })
})

app.on('window-all-closed', () => {
  batteryService?.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  batteryService?.stop()
  clipboardService?.stop()
})

import { app, BrowserWindow, ipcMain, Notification, screen, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { BatteryService, BatteryState } from './batteryService'

let islandWindow: BrowserWindow | null = null
const batterySubscribers = new Set<number>()
let batteryService: BatteryService | null = null
let lowBatteryNotified = false

const COLLAPSED = { width: 260, height: 48 }
const EXPANDED = { width: 360, height: 180 }

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

  const isLowAndDischarging = state.percentage < 20 && state.chargingState === 'discharging'
  if (isLowAndDischarging && !lowBatteryNotified) {
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.macisland.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

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
})

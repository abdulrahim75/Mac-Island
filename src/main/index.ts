
import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

let islandWindow: BrowserWindow | null = null

const COLLAPSED = { width: 260, height: 48 }
const EXPANDED = { width: 360, height: 150 }

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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.macisland.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createIslandWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createIslandWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

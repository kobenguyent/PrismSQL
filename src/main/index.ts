import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import path from 'path'
import log from 'electron-log'
import { ConnectionManager } from './db/manager'
import { registerIpcHandlers } from './ipc'
import { is } from '@electron-toolkit/utils'

// Configure logger
log.transports.file.level = 'info'
log.info('PrismSQL starting...')

const manager = new ConnectionManager()

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'PrismSQL',
    // macOS vibrancy / transparency
    vibrancy: 'under-window',
    visualEffectState: 'active',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#00000000',
    backgroundMaterial: 'acrylic', // Windows 11 acrylic
    transparent: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Force dark mode
  nativeTheme.themeSource = 'dark'

  win.on('ready-to-show', () => {
    win.show()
  })

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  registerIpcHandlers(manager)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  await manager.disconnectAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await manager.disconnectAll()
})

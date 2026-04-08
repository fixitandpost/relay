import { app, BrowserWindow, ipcMain, systemPreferences, session } from 'electron'
import { join } from 'path'
import { PipelineManager } from './pipeline'

let mainWindow: BrowserWindow | null = null

// In packaged mode, __dirname is inside .app/Contents/Resources/app/dist-electron/
// In dev mode, __dirname is ui/dist-electron/
const projectRoot = app.isPackaged
  ? join(app.getAppPath(), '..', '..', '..', '..') // escape out of .app bundle
  : join(__dirname, '..', '..')

const pipelineManager = new PipelineManager(projectRoot, app.isPackaged)

async function requestCameraAccess(): Promise<boolean> {
  if (process.platform !== 'darwin') return true

  const status = systemPreferences.getMediaAccessStatus('camera')
  console.log(`[relay] Camera access status: ${status}`)

  if (status === 'granted') return true
  if (status === 'denied') {
    console.log('[relay] Camera access denied — user must enable in System Preferences > Privacy > Camera')
    return false
  }

  // status is 'not-determined' or 'restricted' — ask for permission
  console.log('[relay] Requesting camera access...')
  const granted = await systemPreferences.askForMediaAccess('camera')
  console.log(`[relay] Camera access granted: ${granted}`)
  return granted
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Grant camera/microphone permissions to the renderer without extra prompts
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'mediaKeySystem', 'display-capture']
    if (allowed.includes(permission)) {
      callback(true)
    } else {
      callback(false)
    }
  })

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ['media', 'mediaKeySystem']
    return allowed.includes(permission)
  })

  pipelineManager.setMainWindow(mainWindow)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

ipcMain.handle('list-cameras', () => pipelineManager.listCameras())
ipcMain.handle('start-pipeline', (_, config) => pipelineManager.startPipeline(config))
ipcMain.handle('stop-pipeline', (_, id) => pipelineManager.stopPipeline(id))
ipcMain.handle('stop-all', () => pipelineManager.stopAll())
ipcMain.handle('request-camera', () => requestCameraAccess())

app.whenReady().then(async () => {
  // Create window FIRST so the app is frontmost — macOS requires a
  // visible app to show the TCC camera permission dialog
  createWindow()

  // Now request camera — this triggers the macOS "Relay would like to access the camera" prompt
  const granted = await requestCameraAccess()
  console.log(`[relay] Camera permission after prompt: ${granted}`)

  // If granted, tell the renderer to refresh cameras
  if (granted && mainWindow) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.send('camera-granted')
    })
  }
})

app.on('window-all-closed', () => {
  pipelineManager.cleanup()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => {
  pipelineManager.cleanup()
})

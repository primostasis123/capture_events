import { app, shell, BrowserWindow, globalShortcut, ipcMain, IpcMainEvent } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import robot from 'robotjs'

interface Action {
  type: 'move' | 'click'
  x: number
  y: number
  time: number
}

let actions: Action[] = []
let recording = false
let paused = false
let replay = false
let mainWindow
function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Register global shortcuts
function registerShortcuts(): void {
  globalShortcut.register('Control+R', () => {
    if (!recording) {
      ipcMain.emit('replay-actions')
    }
  })

  globalShortcut.register('Control+P', () => {
    if (!recording && !replay) {
      mainWindow.webContents.send('start-recording') // send the event to the renderer process
    }
  })

  globalShortcut.register('Control+S', () => {
    if (recording) {
      mainWindow.webContents.send('stop-recording') // send the event to the renderer process
    }
  })

  globalShortcut.register('Space', () => {
    if (recording) {
      if (paused) {
        mainWindow.webContents.send('resume-recording') // send the event to the renderer process
      } else {
        mainWindow.webContents.send('pause-recording') // send the event to the renderer process
      }
    }
  })
}

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Start recording mouse movements and clicks
  ipcMain.on('start-recording', () => {
    if (!recording) {
      console.log('Recording started')
      actions = [] // Reset actions only when starting a new recording session
    }
    recording = true
    paused = false

    setInterval(() => {
      if (!recording || paused) {
        return
      }
      const mousePos = robot.getMousePos()
      actions.push({
        type: 'move',
        x: mousePos.x,
        y: mousePos.y,
        time: Date.now()
      })
    }, 100)
  })

  ipcMain.on('click', () => {
    // This flag ensures that the interval runs only once
    let executed = false
    const interval = setInterval(() => {
      if (!recording || paused) {
        clearInterval(interval)
        return
      }
      if (!executed) {
        const mousePos = robot.getMousePos()
        actions.push({
          type: 'click',
          x: mousePos.x,
          y: mousePos.y,
          time: Date.now()
        })

        executed = true // Set the flag to true after the action is pushed
      }
    }, 0)
  })

  // Stop recording and send recorded actions back to React
  ipcMain.on('stop-recording', (event: IpcMainEvent) => {
    recording = false
    event.reply('recorded-actions', actions)
    console.log('Recording stopped')
  })

  ipcMain.on('pause-recording', () => {
    console.log('Recording is currently paused. No actions are being recorded')
    paused = true
  })

  ipcMain.on('resume-recording', () => {
    console.log('Recording has resumed. Actions are being recorded')
    paused = false
  })

  // Replay recorded actions
  ipcMain.on('replay-actions', () => {
    replay = true
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      const nextAction = actions[i + 1] // Look ahead to the next action
      const delay = i === 0 ? 0 : action.time - actions[0].time

      setTimeout(() => {
        console.log(action)

        if (action.type === 'move') {
          robot.moveMouse(action.x, action.y)
        } else if (action.type === 'click') {
          robot.moveMouse(action.x, action.y)
          robot.mouseClick('left')
        }

        // Check for a pause by comparing the current action's time with the next action's time
        if (nextAction && nextAction.time - action.time > 500) {
          // Adjust the threshold (e.g., 500ms) as needed
          console.log(`Paused for ${nextAction.time - action.time}ms. Please wait...`)
        }

        // Check if the last action has been executed
        if (i === actions.length - 1) {
          console.log('Replay finished')
          replay = false
        }
      }, delay)
    }
  })

  createWindow()
  registerShortcuts()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

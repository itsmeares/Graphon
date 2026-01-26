/// <reference path="./env.d.ts" />
import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater'
import fs from 'fs'
import {
  handleSelectVault,
  handleGetVaultPath,
  handleListFiles,
  handleOpenVaultFolder,
  handleReadFile,
  handleWriteFile,
  handleDeleteFile,
  handleReadData,
  handleWriteData
} from './handlers'

let mainWindow: BrowserWindow | null = null

// Simple theme persistence
const THEME_CONFIG_PATH = join(app.getPath('userData'), 'theme-config.json')

function getSavedTheme(): string {
  try {
    if (fs.existsSync(THEME_CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(THEME_CONFIG_PATH, 'utf-8'))
      return data.theme || 'system'
    }
  } catch (e) {
    console.error('Failed to read theme config', e)
  }
  return 'system'
}

function saveTheme(theme: string): void {
  try {
    fs.writeFileSync(THEME_CONFIG_PATH, JSON.stringify({ theme }))
  } catch (e) {
    console.error('Failed to save theme config', e)
  }
}

function createWindow(): void {
  try {
    const savedTheme = getSavedTheme()
    // Set the initial themeSource for nativeTheme
    nativeTheme.themeSource = savedTheme as 'system' | 'light' | 'dark'

    // Determine initial background color based on theme
    const isDark =
      savedTheme === 'dark' || (savedTheme === 'system' && nativeTheme.shouldUseDarkColors)
    const initialBgColor = isDark ? '#1C1C1A' : '#FFFCF8'

    // Create the browser window with premium Graphon aesthetics
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 600,
      show: false,
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: initialBgColor,
      transparent: false,
      vibrancy: 'sidebar',
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true
      }
    })

    // Theme synchronization for background color (real-time)
    ipcMain.on('update-theme-color', (_, color) => {
      try {
        if (typeof color === 'string' && (color.startsWith('#') || color.startsWith('rgb'))) {
          mainWindow?.setBackgroundColor(color)
        }
      } catch (err) {
        console.error('Error in update-theme-color IPC:', err)
      }
    })

    // Theme preference synchronization (persistence)
    ipcMain.on('update-theme-preference', (_, theme) => {
      try {
        if (['system', 'light', 'dark'].includes(theme)) {
          saveTheme(theme)
          nativeTheme.themeSource = theme as 'system' | 'light' | 'dark'
        }
      } catch (err) {
        console.error('Error in update-theme-preference IPC:', err)
      }
    })

    // Window control IPCs
    ipcMain.on('window-minimize', () => {
      try {
        mainWindow?.minimize()
      } catch (err) {
        console.error('Error in window-minimize IPC:', err)
      }
    })

    ipcMain.on('window-maximize', () => {
      try {
        if (mainWindow?.isMaximized()) {
          mainWindow.unmaximize()
        } else {
          mainWindow?.maximize()
        }
      } catch (err) {
        console.error('Error in window-maximize IPC:', err)
      }
    })

    ipcMain.on('window-close', () => {
      try {
        mainWindow?.close()
      } catch (err) {
        console.error('Error in window-close IPC:', err)
      }
    })

    mainWindow.on('ready-to-show', () => {
      try {
        mainWindow?.show()
      } catch (err) {
        console.error('Error in ready-to-show event:', err)
      }
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      try {
        shell.openExternal(details.url)
      } catch (err) {
        console.error('Error in setWindowOpenHandler:', err)
      }
      return { action: 'deny' }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  } catch (err) {
    console.error('Failed to create window:', err)
  }
}

// Auto-updater event listeners
function setupAutoUpdater(): void {
  try {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      try {
        mainWindow?.webContents.send('update-message', { type: 'checking' })
      } catch (err) {
        console.error('Error in checking-for-update listener:', err)
      }
    })

    autoUpdater.on('update-available', (info) => {
      try {
        mainWindow?.webContents.send('update-message', { type: 'available', info })
      } catch (err) {
        console.error('Error in update-available listener:', err)
      }
    })

    autoUpdater.on('update-not-available', (info) => {
      try {
        mainWindow?.webContents.send('update-message', { type: 'not-available', info })
      } catch (err) {
        console.error('Error in update-not-available listener:', err)
      }
    })

    autoUpdater.on('error', (err) => {
      try {
        mainWindow?.webContents.send('update-message', { type: 'error', error: err.message })
      } catch (err) {
        console.error('Error in updater error listener:', err)
      }
    })

    autoUpdater.on('download-progress', (progressObj) => {
      try {
        mainWindow?.webContents.send('update-message', {
          type: 'downloading',
          progress: progressObj
        })
      } catch (err) {
        console.error('Error in download-progress listener:', err)
      }
    })

    autoUpdater.on('update-downloaded', (info) => {
      try {
        mainWindow?.webContents.send('update-message', { type: 'downloaded', info })
        // Automatically install if we are on the loading screen
        // We'll let the renderer trigger this or just do it.
        // The user requested "it will update while on that screen"
        setTimeout(() => {
          try {
            autoUpdater.quitAndInstall()
          } catch (err) {
            console.error('Error in quitAndInstall:', err)
          }
        }, 3000)
      } catch (err) {
        console.error('Error in update-downloaded listener:', err)
      }
    })
  } catch (err) {
    console.error('Failed to setup auto updater:', err)
  }

  ipcMain.handle('check-for-updates', async () => {
    try {
      if (is.dev) {
        // Simulate no update in dev
        await new Promise((resolve) => setTimeout(resolve, 2000))
        mainWindow?.webContents.send('update-message', { type: 'not-available' })
      } else {
        return await autoUpdater.checkForUpdates()
      }
    } catch (err) {
      console.error('Error in check-for-updates IPC:', err)
      mainWindow?.webContents.send('update-message', {
        type: 'error',
        error: err instanceof Error ? err.message : String(err)
      })
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  try {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.graphon.app')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      try {
        optimizer.watchWindowShortcuts(window)
      } catch (err) {
        console.error('Error in browser-window-created handler:', err)
      }
    })

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    // Vault IPC handlers
    ipcMain.handle('vault:select', async () => {
      try {
        return await handleSelectVault()
      } catch (err) {
        console.error('Error in vault:select handler:', err)
        throw err
      }
    })

    ipcMain.handle('vault:get-path', async () => {
      try {
        return await handleGetVaultPath()
      } catch (err) {
        console.error('Error in vault:get-path handler:', err)
        return null
      }
    })

    // SECURITY: No vaultPath argument - uses cached path from main process
    ipcMain.handle('vault:list-files', async () => {
      try {
        return await handleListFiles()
      } catch (err) {
        console.error('Error in vault:list-files handler:', err)
        throw err
      }
    })

    // SECURITY: No vaultPath argument - uses cached path from main process
    ipcMain.handle('vault:open-folder', async () => {
      try {
        await handleOpenVaultFolder()
      } catch (err) {
        console.error('Error in vault:open-folder handler:', err)
        throw err
      }
    })

    // Shell handlers
    ipcMain.on('shell:show-item-in-folder', async (_, filename) => {
      try {
        // We reuse the valid filename check logic or similar?
        // ideally we invoke a handler that is safe.
        // handlers.ts doesn't export a "showItemInFolder" yet, I can add it or inline valid logic.
        // Inline logic: get vault path, join, show.
        const { handleGetVaultPath } = await import('./handlers')
        const vaultPath = await handleGetVaultPath()
        if (vaultPath) {
          const { join, normalize } = await import('path')
          const fullPath = join(vaultPath, filename)
          // Basic security check
          if (fullPath.startsWith(vaultPath)) {
            shell.showItemInFolder(fullPath)
          }
        }
      } catch (err) {
        console.error('Error in shell:show-item-in-folder:', err)
      }
    })

    // File I/O handlers (SECURITY: vault path from main process state)
    ipcMain.handle('vault:read-file', async (_, filename: string) => {
      try {
        return await handleReadFile(filename)
      } catch (err) {
        console.error('Error in vault:read-file handler:', err)
        throw err
      }
    })

    ipcMain.handle('vault:write-file', async (_, filename: string, content: string) => {
      try {
        await handleWriteFile(filename, content)
      } catch (err) {
        console.error('Error in vault:write-file handler:', err)
        throw err
      }
    })

    ipcMain.handle('vault:delete-file', async (_, filename: string) => {
      try {
        await handleDeleteFile(filename)
      } catch (err) {
        console.error('Error in vault:delete-file handler:', err)
        throw err
      }
    })

    ipcMain.handle('vault:rename-file', async (_, oldName: string, newName: string) => {
      try {
        const { handleRenameFile } = await import('./handlers')
        await handleRenameFile(oldName, newName)
      } catch (err) {
        console.error('Error in vault:rename-file handler:', err)
        throw err
      }
    })

    // Data I/O handlers (.graphon/*.json)
    ipcMain.handle('vault:read-data', async (_, key: string) => {
      try {
        return await handleReadData(key)
      } catch (err) {
        console.error('Error in vault:read-data handler:', err)
        throw err
      }
    })

    ipcMain.handle('vault:write-data', async (_, key: string, data: any) => {
      try {
        await handleWriteData(key, data)
      } catch (err) {
        console.error('Error in vault:write-data handler:', err)
        throw err
      }
    })

    createWindow()
    setupAutoUpdater()

    app.on('activate', function () {
      try {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      } catch (err) {
        console.error('Error in app activate handler:', err)
      }
    })
  } catch (err) {
    console.error('Failed to initialize app:', err)
  }
})

// Global crash handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  try {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  } catch (err) {
    console.error('Error in window-all-closed handler:', err)
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

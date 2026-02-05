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
  handleWriteData,
  handleGetGraphData,
  handleGetTemplates,
  handleGetAllTasks,
  handleGetRelatedNotes,
  handleSemanticSearch
} from './handlers'
import { startIndexer, stopIndexer, indexerEvents } from './services/IndexerService'

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

    // Platform-specific window configuration
    const isMac = process.platform === 'darwin'
    const isWin = process.platform === 'win32'

    // On macOS: use transparency + vibrancy for native glass effects
    // On Windows: use solid background to preserve resize functionality
    const windowBgColor = isMac ? '#00000000' : isDark ? '#1C1C1A' : '#FFFCF8'

    // Create the browser window with premium Graphon aesthetics
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 600,
      show: false,
      frame: false,
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 19, y: 18 },
      backgroundColor: '#00000000', // Fully transparent for vibrancy/mica
      transparent: isMac, // Only macOS gets transparency (vibrancy requires it)
      vibrancy: isMac ? 'under-window' : undefined,
      backgroundMaterial: isWin ? 'mica' : undefined, // Native Windows 11 Mica effect
      visualEffectState: isMac ? 'followWindow' : undefined,
      autoHideMenuBar: true,
      resizable: true,
      // Windows 11 uses rounded corners natively when frame:false
      // For older Windows, we accept square corners for resizability
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true
      }
    })

    // Theme synchronization for background color (real-time)
    ipcMain.on('update-theme-color', (_, color) => {
      try {
        if (
          process.platform !== 'darwin' &&
          typeof color === 'string' &&
          (color.startsWith('#') || color.startsWith('rgb'))
        ) {
          // Keep background transparent for glassmorphism
          // mainWindow?.setBackgroundColor(color)
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
        const vaultPath = await handleSelectVault()
        if (vaultPath) {
          startIndexer(vaultPath)
        }
        return vaultPath
      } catch (err) {
        console.error('Error in vault:select handler:', err)
        throw err
      }
    })

    ipcMain.handle('vault:get-path', async () => {
      try {
        const vaultPath = await handleGetVaultPath()
        if (vaultPath) {
          startIndexer(vaultPath)
        }
        return vaultPath
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

    // Database search handler (FTS5)
    ipcMain.handle('db:search', async (_, query: string) => {
      try {
        if (!query || query.trim().length === 0) {
          return []
        }

        const { sqlite } = await import('./database/db')

        // Sanitize query for FTS5 - escape special characters and add prefix matching
        const sanitizedQuery = query
          .replace(/[*":()]/g, ' ') // Remove FTS special chars
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0)
          .map((word) => `"${word}"*`) // Prefix matching with quoted words (e.g., "pro"* matches "proje")
          .join(' ')

        if (!sanitizedQuery) {
          return []
        }

        // Use snippet() to highlight matching text in content (column 3 = content)
        // snippet(table, column_index, open_marker, close_marker, ellipsis, max_tokens)
        const results = sqlite
          .prepare(
            `
          SELECT id, title, path, snippet(notes_fts, 3, '<b>', '</b>', '...', 10) as highlight
          FROM notes_fts 
          WHERE notes_fts MATCH ? 
          ORDER BY rank 
          LIMIT 20
        `
          )
          .all(sanitizedQuery)

        return results
      } catch (err) {
        console.error('Error in db:search handler:', err)
        return []
      }
    })

    // Graph data handler
    ipcMain.handle('db:get-graph-data', async () => {
      try {
        return await handleGetGraphData()
      } catch (err) {
        console.error('Error in db:get-graph-data handler:', err)
        return { nodes: [], links: [] }
      }
    })

    // Templates handler
    ipcMain.handle('db:get-templates', async () => {
      try {
        return await handleGetTemplates()
      } catch (err) {
        console.error('Error in db:get-templates handler:', err)
        return []
      }
    })

    // Tasks handler
    ipcMain.handle('db:get-all-tasks', () => {
      try {
        return handleGetAllTasks()
      } catch (err) {
        console.error('Error in db:get-all-tasks handler:', err)
        return []
      }
    })

    // Related notes handler
    ipcMain.handle('db:get-related-notes', async (_, filePath: string) => {
      try {
        return await handleGetRelatedNotes(filePath)
      } catch (err) {
        console.error('Error in db:get-related-notes handler:', err)
        return []
      }
    })

    // Semantic search handler
    ipcMain.handle('db:semantic-search', async (_, query: string) => {
      try {
        return await handleSemanticSearch(query)
      } catch (err) {
        console.error('Error in db:semantic-search handler:', err)
        return []
      }
    })

    // =========================================================================
    // FIREBASE HANDLERS (Phase 6: Teamspaces)
    // =========================================================================

    // Check if Firebase is configured
    ipcMain.handle('firebase:is-configured', async () => {
      try {
        const { isFirebaseConfigured } = await import('./services/FirebaseService')
        return isFirebaseConfigured()
      } catch (err) {
        console.error('Error in firebase:is-configured handler:', err)
        return false
      }
    })

    // Sign in with email/password
    ipcMain.handle('firebase:sign-in', async (_, email: string, password: string) => {
      try {
        const { signIn } = await import('./services/FirebaseService')
        const result = await signIn(email, password)
        return result
      } catch (err) {
        console.error('Error in firebase:sign-in handler:', err)
        return { user: null, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    })

    // Sign up with email/password
    ipcMain.handle(
      'firebase:sign-up',
      async (_, email: string, password: string, username?: string) => {
        try {
          const { signUp } = await import('./services/FirebaseService')
          const result = await signUp(email, password, username)
          return result
        } catch (err) {
          console.error('Error in firebase:sign-up handler:', err)
          return { user: null, error: err instanceof Error ? err.message : 'Unknown error' }
        }
      }
    )

    // Sign out
    ipcMain.handle('firebase:sign-out', async () => {
      try {
        const { signOut } = await import('./services/FirebaseService')
        const result = await signOut()
        return result
      } catch (err) {
        console.error('Error in firebase:sign-out handler:', err)
        return { error: err instanceof Error ? err.message : 'Unknown error' }
      }
    })

    // Get current user
    ipcMain.handle('firebase:get-user', async () => {
      try {
        const { getUser } = await import('./services/FirebaseService')
        return await getUser()
      } catch (err) {
        console.error('Error in firebase:get-user handler:', err)
        return null
      }
    })

    // Get user's workspaces
    ipcMain.handle('firebase:get-workspaces', async () => {
      try {
        const { getWorkspaces } = await import('./services/FirebaseService')
        return await getWorkspaces()
      } catch (err) {
        console.error('Error in firebase:get-workspaces handler:', err)
        return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    })

    // Get channels for a workspace
    ipcMain.handle('firebase:get-channels', async (_, workspaceId: string) => {
      try {
        const { getChannels } = await import('./services/FirebaseService')
        return await getChannels(workspaceId)
      } catch (err) {
        console.error('Error in firebase:get-channels handler:', err)
        return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    })

    // Create a new workspace
    ipcMain.handle('firebase:create-workspace', async (_, name: string) => {
      try {
        const { createWorkspace } = await import('./services/FirebaseService')
        return await createWorkspace(name)
      } catch (err) {
        console.error('Error in firebase:create-workspace handler:', err)
        return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    })

    // Join an existing workspace
    ipcMain.handle('firebase:join-workspace', async (_, workspaceId: string) => {
      try {
        const { joinWorkspace } = await import('./services/FirebaseService')
        return await joinWorkspace(workspaceId)
      } catch (err) {
        console.error('Error in firebase:join-workspace handler:', err)
        return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    })

    // Create a new channel in a workspace
    ipcMain.handle(
      'firebase:create-channel',
      async (_, workspaceId: string, name: string, type: 'chat' | 'board') => {
        try {
          const { createChannel } = await import('./services/FirebaseService')
          return await createChannel(workspaceId, name, type)
        } catch (err) {
          console.error('Error in firebase:create-channel handler:', err)
          return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
        }
      }
    )

    // Send a message to a channel
    ipcMain.handle('firebase:send-message', async (_, channelId: string, content: string) => {
      try {
        const { sendMessage } = await import('./services/FirebaseService')
        return await sendMessage(channelId, content)
      } catch (err) {
        console.error('Error in firebase:send-message handler:', err)
        return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    })

    // Get messages for a channel
    ipcMain.handle('firebase:get-messages', async (_, channelId: string) => {
      try {
        const { getMessages } = await import('./services/FirebaseService')
        return await getMessages(channelId)
      } catch (err) {
        console.error('Error in firebase:get-messages handler:', err)
        return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    })

    // Realtime message subscription
    ipcMain.handle('firebase:subscribe-to-messages', async (_, channelId: string) => {
      try {
        const { subscribeToMessages } = await import('./services/FirebaseService')
        return subscribeToMessages(channelId)
      } catch (err) {
        console.error('Error in firebase:subscribe-to-messages handler:', err)
        return null
      }
    })




    // Indexer events listener
    indexerEvents.on('updated', () => {
      mainWindow?.webContents.send('vault:index-updated')
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

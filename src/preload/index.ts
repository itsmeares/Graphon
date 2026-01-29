import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  // Update/Window APIs
  onUpdateMessage: (callback: (message: any) => void) => {
    ipcRenderer.on('update-message', (_event, value) => callback(value))
  },
  checkForUpdates: () => {
    return ipcRenderer.invoke('check-for-updates')
  },
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  updateThemeColor: (color: string) => ipcRenderer.send('update-theme-color', color),
  updateThemePreference: (theme: string) => ipcRenderer.send('update-theme-preference', theme),

  // Vault Selection API
  selectVault: (): Promise<string | null> => ipcRenderer.invoke('vault:select'),
  getVaultPath: (): Promise<string | null> => ipcRenderer.invoke('vault:get-path'),

  // Vault File System API (SECURITY: no path args - main process uses cached vault path)
  listFiles: (): Promise<string[]> => ipcRenderer.invoke('vault:list-files'),
  openVaultFolder: (): Promise<void> => ipcRenderer.invoke('vault:open-folder'),

  // Vault File I/O API (for .md notes)
  readFile: (filename: string): Promise<string | null> =>
    ipcRenderer.invoke('vault:read-file', filename),
  writeFile: (filename: string, content: string): Promise<void> =>
    ipcRenderer.invoke('vault:write-file', filename, content),
  deleteFile: (filename: string): Promise<void> =>
    ipcRenderer.invoke('vault:delete-file', filename),
  renameFile: (oldName: string, newName: string): Promise<void> =>
    ipcRenderer.invoke('vault:rename-file', oldName, newName),

  // Vault Data API (for .graphon/*.json files)
  readData: <T>(key: string): Promise<T | null> => ipcRenderer.invoke('vault:read-data', key),
  writeData: (key: string, data: any): Promise<void> =>
    ipcRenderer.invoke('vault:write-data', key, data),

  // Shell API
  showItemInFolder: (filename: string) => ipcRenderer.send('shell:show-item-in-folder', filename),

  // Database Search API
  searchNotes: (query: string): Promise<Array<{ title: string; content: string; path: string }>> =>
    ipcRenderer.invoke('db:search', query)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer. In sandboxed mode, context isolation is required.
if (process.contextIsolated) {
  try {
    // We only expose our restricted 'api' object to minimize the attack surface
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // Fallback for non-context-isolated environments (not recommended for production)
  // @ts-ignore (define in dts)
  window.api = api
}

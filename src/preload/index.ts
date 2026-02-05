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
  onVaultIndexUpdated: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('vault:index-updated', listener)
    return () => ipcRenderer.removeListener('vault:index-updated', listener)
  },

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
  searchNotes: (
    query: string
  ): Promise<Array<{ id: string; title: string; path: string; highlight: string }>> =>
    ipcRenderer.invoke('db:search', query),

  // Graph Data API
  getGraphData: (): Promise<{
    nodes: Array<{ id: string; title: string; group: string }>
    links: Array<{ source: string; target: string }>
  }> => ipcRenderer.invoke('db:get-graph-data'),

  // Templates API
  getTemplates: (): Promise<Array<{ name: string; content: string }>> =>
    ipcRenderer.invoke('db:get-templates'),

  // Tasks API
  getAllTasks: (): Promise<
    Array<{ id: string; content: string; completed: boolean; filePath: string; fileTitle: string }>
  > => ipcRenderer.invoke('db:get-all-tasks'),

  // Related Notes API
  getRelatedNotes: (
    filePath: string
  ): Promise<Array<{ id: string; title: string; path: string; score: number }>> =>
    ipcRenderer.invoke('db:get-related-notes', filePath),

  // Semantic Search API
  semanticSearch: (
    query: string
  ): Promise<Array<{ id: string; title: string; path: string; score: number }>> =>
    ipcRenderer.invoke('db:semantic-search', query),

  // =============================================================================
  // FIREBASE APIs (Phase 6: Teamspaces)
  // =============================================================================

  // Firebase Config API
  firebaseIsConfigured: (): Promise<boolean> => ipcRenderer.invoke('firebase:is-configured'),

  // Firebase Auth API
  firebaseSignIn: (
    email: string,
    password: string
  ): Promise<{ user: any | null; error: string | null }> =>
    ipcRenderer.invoke('firebase:sign-in', email, password),

  firebaseSignUp: (
    email: string,
    password: string,
    username?: string
  ): Promise<{ user: any | null; error: string | null }> =>
    ipcRenderer.invoke('firebase:sign-up', email, password, username),

  firebaseSignOut: (): Promise<{ error: string | null }> => ipcRenderer.invoke('firebase:sign-out'),

  firebaseGetUser: (): Promise<any | null> => ipcRenderer.invoke('firebase:get-user'),

  onFirebaseAuthChange: (callback: (user: any | null) => void) => {
    const listener = (_: any, user: any) => callback(user)
    ipcRenderer.on('firebase:auth-change', listener)
    return () => ipcRenderer.removeListener('firebase:auth-change', listener)
  },

  // Firebase Workspace API
  firebaseGetWorkspaces: (): Promise<{
    data: Array<{
      id: string
      name: string
      owner_id: string
      created_at: string
      role: 'admin' | 'member'
    }> | null
    error: string | null
  }> => ipcRenderer.invoke('firebase:get-workspaces'),

  // Firebase Channel API
  firebaseGetChannels: (
    workspaceId: string
  ): Promise<{
    data: Array<{
      id: string
      workspace_id: string
      name: string
      type: 'chat' | 'board'
      description: string | null
      created_at: string
    }> | null
    error: string | null
  }> => ipcRenderer.invoke('firebase:get-channels', workspaceId),

  // Firebase Workspace Create/Join API
  firebaseCreateWorkspace: (
    name: string
  ): Promise<{
    data: { id: string } | null
    error: string | null
  }> => ipcRenderer.invoke('firebase:create-workspace', name),

  firebaseJoinWorkspace: (
    workspaceId: string
  ): Promise<{
    data: { workspace_id: string } | null
    error: string | null
  }> => ipcRenderer.invoke('firebase:join-workspace', workspaceId),

  // Firebase Channel Create API
  firebaseCreateChannel: (
    workspaceId: string,
    name: string,
    type: 'chat' | 'board'
  ): Promise<{
    data: { id: string } | null
    error: string | null
  }> => ipcRenderer.invoke('firebase:create-channel', workspaceId, name, type),

  // Firebase Message API
  firebaseSendMessage: (
    channelId: string,
    content: string
  ): Promise<{
    data: { id: string } | null
    error: string | null
  }> => ipcRenderer.invoke('firebase:send-message', channelId, content),

  firebaseGetMessages: (
    channelId: string
  ): Promise<{
    data: Array<{
      id: string
      channel_id: string
      user_id: string
      content: string | null
      created_at: string
    }> | null
    error: string | null
  }> => ipcRenderer.invoke('firebase:get-messages', channelId),

  firebaseSubscribeToMessages: (channelId: string): Promise<void> =>
    ipcRenderer.invoke('firebase:subscribe-to-messages', channelId),

  onRealtimeMessage: (callback: (payload: any) => void) => {
    const listener = (_: any, payload: any) => callback(payload)
    ipcRenderer.on('firebase:realtime-message', listener)
    return () => ipcRenderer.removeListener('firebase:realtime-message', listener)
  },

  // Platform info
  platform: process.platform
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

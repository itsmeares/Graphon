import { ElectronAPI } from '@electron-toolkit/preload'

export interface FileNode {
  name: string
  path: string // Relative path from vault root
  type: 'file' | 'folder'
  children?: FileNode[]
}

interface VaultAPI {
  // Update/Window APIs
  onUpdateMessage: (callback: (message: any) => void) => void
  checkForUpdates: () => Promise<any>
  minimize: () => void
  maximize: () => void
  close: () => void
  updateThemeColor: (color: string) => void
  updateThemePreference: (theme: string) => void

  // Vault Selection API
  selectVault: () => Promise<string | null>
  getVaultPath: () => Promise<string | null>
  onVaultIndexUpdated: (callback: () => void) => () => void

  // Vault File System API
  listFiles: () => Promise<FileNode[]>
  openVaultFolder: () => Promise<void>

  // Vault File I/O API (for .md notes)
  readFile: (filename: string) => Promise<string | null>
  writeFile: (filename: string, content: string) => Promise<void>
  deleteFile: (filename: string) => Promise<void>
  renameFile: (oldName: string, newName: string) => Promise<void>
  showItemInFolder: (filename: string) => void

  // Vault Data API (for .graphon/*.json files)
  readData: <T>(key: string) => Promise<T | null>
  writeData: (key: string, data: any) => Promise<void>

  // Database Search API
  searchNotes: (
    query: string
  ) => Promise<Array<{ id: string; title: string; path: string; highlight: string }>>

  // Graph Data API
  getGraphData: () => Promise<{
    nodes: Array<{ id: string; title: string; path: string; group: string; exists: boolean }>
    links: Array<{ source: string; target: string }>
  }>

  // Templates API
  getTemplates: () => Promise<Array<{ name: string; content: string }>>

  // Tasks API
  getAllTasks: () => Promise<
    Array<{
      id: string
      content: string
      completed: boolean
      filePath: string
      fileTitle: string
    }>
  >

  // Related Notes API
  getRelatedNotes: (
    filePath: string
  ) => Promise<Array<{ id: string; title: string; path: string; score: number }>>

  semanticSearch: (
    query: string
  ) => Promise<{ id: string; title: string; path: string; score: number }[]>

  // Firebase APIs (Phase 6: Teamspaces)
  firebaseIsConfigured: () => Promise<boolean>
  firebaseSignIn: (
    email: string,
    password: string
  ) => Promise<{ user: any | null; error: string | null }>
  firebaseSignUp: (
    email: string,
    password: string,
    username?: string
  ) => Promise<{ user: any | null; error: string | null }>
  firebaseSignOut: () => Promise<{ error: string | null }>
  firebaseGetUser: () => Promise<any | null>
  onFirebaseAuthChange: (callback: (user: any | null) => void) => () => void

  // Firebase Workspace API
  firebaseGetWorkspaces: () => Promise<{
    data: Array<{
      id: string
      name: string
      owner_id: string
      created_at: string
      role: 'admin' | 'member'
    }> | null
    error: string | null
  }>

  // Firebase Channel API
  firebaseGetChannels: (workspaceId: string) => Promise<{
    data: Array<{
      id: string
      workspace_id: string
      name: string
      type: 'chat' | 'board'
      description: string | null
      created_at: string
    }> | null
    error: string | null
  }>

  // Firebase Workspace Create/Join API
  firebaseCreateWorkspace: (name: string) => Promise<{
    data: { id: string } | null
    error: string | null
  }>
  firebaseJoinWorkspace: (workspaceId: string) => Promise<{
    data: { workspace_id: string } | null
    error: string | null
  }>

  // Firebase Channel Create API
  firebaseCreateChannel: (
    workspaceId: string,
    name: string,
    type: 'chat' | 'board'
  ) => Promise<{
    data: { id: string } | null
    error: string | null
  }>

  // Firebase Message API
  firebaseSendMessage: (channelId: string, content: string) => Promise<{
    data: { id: string } | null
    error: string | null
  }>
  firebaseGetMessages: (channelId: string) => Promise<{
    data: Array<{
      id: string
      channel_id: string
      user_id: string
      content: string | null
      created_at: string
    }> | null
    error: string | null
  }>
  firebaseSubscribeToMessages: (channelId: string) => Promise<void>
  onRealtimeMessage: (callback: (payload: any) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: VaultAPI
  }
}

export {}

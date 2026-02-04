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

  // Supabase APIs (Phase 6: Teamspaces)
  supabaseIsConfigured: () => Promise<boolean>
  supabaseSignIn: (
    email: string,
    password: string
  ) => Promise<{ user: any | null; error: string | null }>
  supabaseSignUp: (
    email: string,
    password: string,
    username?: string
  ) => Promise<{ user: any | null; error: string | null }>
  supabaseSignOut: () => Promise<{ error: string | null }>
  supabaseGetUser: () => Promise<any | null>
  onSupabaseAuthChange: (callback: (user: any | null) => void) => () => void

  // Supabase Workspace API
  supabaseGetWorkspaces: () => Promise<{
    data: Array<{
      id: string
      name: string
      owner_id: string
      created_at: string
      role: 'admin' | 'member'
    }> | null
    error: string | null
  }>

  // Supabase Channel API
  supabaseGetChannels: (workspaceId: string) => Promise<{
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

  // Supabase Workspace Create/Join API
  supabaseCreateWorkspace: (name: string) => Promise<{
    data: { id: string } | null
    error: string | null
  }>
  supabaseJoinWorkspace: (workspaceId: string) => Promise<{
    data: { workspace_id: string } | null
    error: string | null
  }>

  // Supabase Channel Create API
  supabaseCreateChannel: (
    workspaceId: string,
    name: string,
    type: 'chat' | 'board'
  ) => Promise<{
    data: { id: string } | null
    error: string | null
  }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: VaultAPI
  }
}

export {}

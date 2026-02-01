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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: VaultAPI
  }
}

export {}

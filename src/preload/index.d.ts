import { ElectronAPI } from '@electron-toolkit/preload'

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

  // Vault File System API
  listFiles: () => Promise<string[]>
  openVaultFolder: () => Promise<void>

  // Vault File I/O API (for .md notes)
  readFile: (filename: string) => Promise<string | null>
  writeFile: (filename: string, content: string) => Promise<void>
  deleteFile: (filename: string) => Promise<void>

  // Vault Data API (for .graphon/*.json files)
  readData: <T>(key: string) => Promise<T | null>
  writeData: (key: string, data: any) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: VaultAPI
  }
}

export {}

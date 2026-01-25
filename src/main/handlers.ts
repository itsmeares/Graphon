import { dialog, app, shell } from 'electron'
import { promises as fs } from 'fs'
import { join, basename, normalize } from 'path'

// Path to settings file in userData
const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

// SECURITY: Cached vault path stored in main process only
// This prevents path traversal attacks - renderer cannot specify arbitrary paths
let currentVaultPath: string | null = null

// =============================================================================
// TYPES
// =============================================================================

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

interface VaultSettings {
  vaultPath: string | null
}

// =============================================================================
// SECURITY HELPERS
// =============================================================================

/**
 * Validates that a filename is safe (no path traversal)
 */
function isValidFilename(filename: string): boolean {
  // Reject if contains path separators or parent directory references
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return false
  }
  // Reject empty or only dots
  if (!filename || filename === '.' || filename === '..') {
    return false
  }
  return true
}

/**
 * Get the cached vault path (throws if not set)
 */
function getVaultPathOrThrow(): string {
  if (!currentVaultPath) {
    throw new Error('No vault path set. Please select a vault first.')
  }
  return currentVaultPath
}

/**
 * Ensure the .graphon folder exists in the vault
 */
async function ensureGraphonFolder(vaultPath: string): Promise<string> {
  const graphonPath = join(vaultPath, '.graphon')
  try {
    await fs.mkdir(graphonPath, { recursive: true })
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error
    }
  }
  return graphonPath
}

// =============================================================================
// VAULT SETTINGS (stored in userData, not vault)
// =============================================================================

/**
 * Load vault settings from disk
 */
export async function loadVaultSettings(): Promise<VaultSettings> {
  try {
    const data = await fs.readFile(SETTINGS_PATH, 'utf-8')
    const settings = JSON.parse(data)
    // Cache the vault path on load
    currentVaultPath = settings.vaultPath || null
    return settings
  } catch (error) {
    // File doesn't exist or is invalid, return default
    currentVaultPath = null
    return { vaultPath: null }
  }
}

/**
 * Save vault settings to disk
 */
export async function saveVaultSettings(vaultPath: string | null): Promise<void> {
  try {
    const settings: VaultSettings = { vaultPath }
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
    // Update cached path
    currentVaultPath = vaultPath
  } catch (error) {
    console.error('Failed to save vault settings:', error)
    throw error
  }
}

// =============================================================================
// VAULT SELECTION & INFO
// =============================================================================

/**
 * Handle vault selection - opens folder picker dialog
 */
export async function handleSelectVault(): Promise<string | null> {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Vault Folder',
      buttonLabel: 'Select Vault'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0]

    // Ensure .graphon folder exists
    await ensureGraphonFolder(selectedPath)

    // Save and cache the selected vault path
    await saveVaultSettings(selectedPath)

    return selectedPath
  } catch (error) {
    console.error('Error selecting vault:', error)
    throw error
  }
}

/**
 * Get the currently saved vault path
 */
export async function handleGetVaultPath(): Promise<string | null> {
  try {
    // Return cached if available
    if (currentVaultPath) {
      return currentVaultPath
    }
    const settings = await loadVaultSettings()
    return settings.vaultPath
  } catch (error) {
    console.error('Error getting vault path:', error)
    return null
  }
}

/**
 * Recursive directory scanner
 */
async function scanDirectory(rootDir: string, relativeDir: string): Promise<FileNode[]> {
  const currentPath = join(rootDir, relativeDir)
  const entries = await fs.readdir(currentPath, { withFileTypes: true })

  const nodes: FileNode[] = []

  for (const entry of entries) {
    // Ignore hidden files and .graphon
    if (entry.name.startsWith('.') || entry.name === '.graphon' || entry.name === 'node_modules') {
      continue
    }

    const entryRelativePath = relativeDir ? join(relativeDir, entry.name) : entry.name

    if (entry.isDirectory()) {
      const children = await scanDirectory(rootDir, entryRelativePath)
      nodes.push({
        name: entry.name,
        path: entryRelativePath,
        type: 'folder',
        children
      })
    } else if (entry.isFile()) {
      // Only include specific file types
      if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
        nodes.push({
          name: entry.name,
          path: entryRelativePath,
          type: 'file'
        })
      }
    }
  }

  // Sort: Folders first, then files, alphabetically
  return nodes.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name)
    }
    return a.type === 'folder' ? -1 : 1
  })
}

/**
 * List files in the vault directory (recursive)
 */
export async function handleListFiles(): Promise<FileNode[]> {
  try {
    const vaultPath = getVaultPathOrThrow()
    return await scanDirectory(vaultPath, '')
  } catch (error) {
    console.error('Error listing files:', error)
    throw error
  }
}

/**
 * Open vault folder in system file explorer
 */
export async function handleOpenVaultFolder(): Promise<void> {
  try {
    const vaultPath = getVaultPathOrThrow()
    await shell.openPath(vaultPath)
  } catch (error) {
    console.error('Error opening vault folder:', error)
    throw error
  }
}

// =============================================================================
// FILE I/O (Markdown notes)
// =============================================================================

/**
 * Read a markdown file from the vault root
 * SECURITY: filename is validated, vaultPath comes from cached state
 */
export async function handleReadFile(filename: string): Promise<string | null> {
  try {
    if (!isValidFilename(filename)) {
      throw new Error(`Invalid filename: ${filename}`)
    }
    const vaultPath = getVaultPathOrThrow()
    const filePath = join(vaultPath, filename)

    // Double-check the resolved path is within vault (belt and suspenders)
    const normalizedPath = normalize(filePath)
    if (!normalizedPath.startsWith(normalize(vaultPath))) {
      throw new Error('Path traversal detected')
    }

    const content = await fs.readFile(filePath, 'utf-8')
    return content
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null // File doesn't exist
    }
    console.error('Error reading file:', error)
    throw error
  }
}

/**
 * Write content to a markdown file in the vault root
 * SECURITY: filename is validated, vaultPath comes from cached state
 */
export async function handleWriteFile(filename: string, content: string): Promise<void> {
  try {
    if (!isValidFilename(filename)) {
      throw new Error(`Invalid filename: ${filename}`)
    }
    const vaultPath = getVaultPathOrThrow()
    const filePath = join(vaultPath, filename)

    // Double-check the resolved path is within vault
    const normalizedPath = normalize(filePath)
    if (!normalizedPath.startsWith(normalize(vaultPath))) {
      throw new Error('Path traversal detected')
    }

    await fs.writeFile(filePath, content, 'utf-8')
  } catch (error) {
    console.error('Error writing file:', error)
    throw error
  }
}

/**
 * Delete a file from the vault root
 * SECURITY: filename is validated, vaultPath comes from cached state
 */
export async function handleDeleteFile(filename: string): Promise<void> {
  try {
    if (!isValidFilename(filename)) {
      throw new Error(`Invalid filename: ${filename}`)
    }
    const vaultPath = getVaultPathOrThrow()
    const filePath = join(vaultPath, filename)

    // Double-check the resolved path is within vault
    const normalizedPath = normalize(filePath)
    if (!normalizedPath.startsWith(normalize(vaultPath))) {
      throw new Error('Path traversal detected')
    }

    await fs.unlink(filePath)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return // File already doesn't exist, that's fine
    }
    console.error('Error deleting file:', error)
    throw error
  }
}

// =============================================================================
// DATA I/O (.graphon/*.json files)
// =============================================================================

/**
 * Read JSON data from .graphon/{key}.json
 * Returns null if file doesn't exist (creates .graphon folder if needed)
 */
export async function handleReadData(key: string): Promise<any | null> {
  try {
    if (!isValidFilename(key)) {
      throw new Error(`Invalid data key: ${key}`)
    }
    const vaultPath = getVaultPathOrThrow()
    const graphonPath = await ensureGraphonFolder(vaultPath)
    const filePath = join(graphonPath, `${key}.json`)

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null // File doesn't exist yet
      }
      throw error
    }
  } catch (error) {
    console.error(`Error reading data key "${key}":`, error)
    throw error
  }
}

/**
 * Write JSON data to .graphon/{key}.json
 * Creates .graphon folder if needed
 */
export async function handleWriteData(key: string, data: any): Promise<void> {
  try {
    if (!isValidFilename(key)) {
      throw new Error(`Invalid data key: ${key}`)
    }
    const vaultPath = getVaultPathOrThrow()
    const graphonPath = await ensureGraphonFolder(vaultPath)
    const filePath = join(graphonPath, `${key}.json`)

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error(`Error writing data key "${key}":`, error)
    throw error
  }
}

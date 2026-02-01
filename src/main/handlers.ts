import { dialog, app, shell } from 'electron'
import { promises as fs } from 'fs'
import { join, basename, normalize, dirname } from 'path'
import { db, sqlite } from './database/db'
import { files, links, note_embeddings } from './database/schema'
import { cosineSimilarity } from './utils/math'
import { eq, ne, and } from 'drizzle-orm'
import EmbeddingService from './services/EmbeddingService'

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
  id?: string
  checksum?: string | null
  createdAt?: Date | null
  updatedAt?: Date | null
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
 * Build a tree structure from flat file paths
 */
function buildFileTree(fileRecords: (typeof files.$inferSelect)[]): FileNode[] {
  const root: FileNode[] = []
  const folderMap = new Map<string, FileNode>()

  // Helper to get or create folder node
  function getOrCreateFolder(folderPath: string): FileNode {
    if (folderPath === '' || folderPath === '.') {
      return { name: '', path: '', type: 'folder', children: root }
    }

    let folder = folderMap.get(folderPath)
    if (!folder) {
      const name = basename(folderPath)
      folder = {
        name,
        path: folderPath,
        type: 'folder',
        children: []
      }
      folderMap.set(folderPath, folder)

      // Add to parent folder
      const parentPath = dirname(folderPath)
      if (parentPath === '.' || parentPath === '') {
        root.push(folder)
      } else {
        const parent = getOrCreateFolder(parentPath)
        parent.children!.push(folder)
      }
    }
    return folder
  }

  // Process all files
  for (const file of fileRecords) {
    const filePath = file.path
    const fileName = basename(filePath)
    const folderPath = dirname(filePath)

    const fileNode: FileNode = {
      name: fileName,
      path: filePath,
      type: 'file',
      id: file.id,
      checksum: file.checksum,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }

    if (folderPath === '.' || folderPath === '') {
      root.push(fileNode)
    } else {
      const parent = getOrCreateFolder(folderPath)
      parent.children!.push(fileNode)
    }
  }

  // Sort function: folders first, then alphabetically
  function sortNodes(nodes: FileNode[]): FileNode[] {
    return nodes
      .sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name)
        }
        return a.type === 'folder' ? -1 : 1
      })
      .map((node) => {
        if (node.children) {
          node.children = sortNodes(node.children)
        }
        return node
      })
  }

  return sortNodes(root)
}

/**
 * List files from SQLite database (fast indexed query)
 */
export async function handleListFiles(): Promise<FileNode[]> {
  try {
    const allFiles = await db.select().from(files)
    return buildFileTree(allFiles)
  } catch (error) {
    console.error('Error listing files from database:', error)
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

/**
 * Rename a file in the vault root
 */
export async function handleRenameFile(oldName: string, newName: string): Promise<void> {
  try {
    if (!isValidFilename(oldName) || !isValidFilename(newName)) {
      throw new Error(`Invalid filename`)
    }
    const vaultPath = getVaultPathOrThrow()
    const oldPath = join(vaultPath, oldName)
    const newPath = join(vaultPath, newName)

    await fs.rename(oldPath, newPath)
  } catch (error) {
    console.error('Error renaming file:', error)
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

// =============================================================================
// GRAPH DATA
// =============================================================================

export interface GraphNode {
  id: string
  title: string
  path: string // File path for existing files, empty for ghost nodes
  group: string
  exists: boolean // false = unresolved wikilink (ghost node)
}

export interface GraphLink {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

/**
 * Get graph data for visualization - nodes (files) and links (connections)
 * Only shows files that are TARGETS of wikilinks (mentioned by other files)
 * Includes ghost nodes for unresolved wikilinks
 */
export async function handleGetGraphData(): Promise<GraphData> {
  try {
    // Get all links first to determine which nodes are connected
    const allLinks = await db.select().from(links)

    // Build set of TARGET node IDs only (files that are mentioned by wikilinks)
    // We don't include sources because files should only appear if they are mentioned
    const targetNodeIds = new Set<string>()
    for (const link of allLinks) {
      targetNodeIds.add(link.targetId)
    }

    // Get all files and filter to only those that are TARGETS of links
    const allFiles = await db.select().from(files)
    const nodes: GraphNode[] = []
    const nodeIdSet = new Set<string>()

    for (const file of allFiles) {
      // Only include files that are TARGETS (mentioned by wikilinks)
      if (!targetNodeIds.has(file.id)) continue

      // Extract folder from path for grouping
      const pathParts = file.path.split('/')
      const group = pathParts.length > 1 ? pathParts[0] : 'root'
      // Extract title from filename (remove .md extension)
      const fileName = basename(file.path)
      const title = fileName.replace(/\.md$/i, '')

      nodes.push({
        id: file.id,
        title,
        path: file.path,
        group,
        exists: true
      })
      nodeIdSet.add(file.id)
    }

    // Extract ghost nodes from links (unresolved wikilinks - targets that don't exist)
    for (const link of allLinks) {
      if (link.targetId.startsWith('ghost:') && !nodeIdSet.has(link.targetId)) {
        const ghostTitle = link.targetId.replace('ghost:', '')
        nodes.push({
          id: link.targetId,
          title: ghostTitle,
          path: '', // No path for ghost nodes
          group: 'unresolved',
          exists: false
        })
        nodeIdSet.add(link.targetId)
      }
    }

    // Filter links to only include those where BOTH source AND target are nodes
    // This ensures d3-force can find both ends of each link
    const graphLinks: GraphLink[] = allLinks
      .filter((link) => nodeIdSet.has(link.sourceId) && nodeIdSet.has(link.targetId))
      .map((link) => ({
        source: link.sourceId,
        target: link.targetId
      }))

    return { nodes, links: graphLinks }
  } catch (error) {
    console.error('Error getting graph data:', error)
    return { nodes: [], links: [] }
  }
}

// =============================================================================
// SMART TEMPLATES
// =============================================================================

export interface TemplateFile {
  name: string
  content: string
}

/**
 * Get all templates from .graphon/templates directory
 * Creates the templates folder if it doesn't exist
 */
export async function handleGetTemplates(): Promise<TemplateFile[]> {
  try {
    const vaultPath = getVaultPathOrThrow()
    const graphonPath = await ensureGraphonFolder(vaultPath)
    const templatesPath = join(graphonPath, 'templates')

    // Ensure templates directory exists
    try {
      await fs.mkdir(templatesPath, { recursive: true })
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error
      }
    }

    // Read all .md files from templates directory
    const entries = await fs.readdir(templatesPath, { withFileTypes: true })
    const templates: TemplateFile[] = []

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = join(templatesPath, entry.name)
        const content = await fs.readFile(filePath, 'utf-8')
        templates.push({
          name: entry.name.replace(/\.md$/i, ''),
          content
        })
      }
    }

    return templates
  } catch (error) {
    console.error('Error getting templates:', error)
    return []
  }
}

// =============================================================================
// TASKS API
// =============================================================================

export interface TaskItem {
  id: string
  content: string
  completed: boolean
  filePath: string
  fileTitle: string
}

/**
 * Get all tasks from all indexed files
 * JOINs todos with files to include source file information
 */
export function handleGetAllTasks(): TaskItem[] {
  try {
    const result = sqlite
      .prepare(
        `
      SELECT t.id, t.content, t.completed, f.path as file_path
      FROM todos t
      JOIN files f ON t.file_id = f.id
      ORDER BY t.completed ASC, t.created_at DESC
    `
      )
      .all() as Array<{ id: string; content: string; completed: number; file_path: string }>

    return result.map((row) => {
      // Extract title from path (filename without .md)
      const fileName = basename(row.file_path)
      const fileTitle = fileName.replace(/\.md$/i, '')

      return {
        id: row.id,
        content: row.content,
        completed: row.completed === 1,
        filePath: row.file_path,
        fileTitle
      }
    })
  } catch (error) {
    console.error('Error getting all tasks:', error)
    return []
  }
}

// =============================================================================
// RELATED NOTES (SEMANTIC SEARCH)
// =============================================================================

export interface RelatedNote {
  id: string
  title: string
  path: string
  score: number
}

/**
 * Get related notes based on semantic similarity
 */
export async function handleGetRelatedNotes(filePath: string): Promise<RelatedNote[]> {
  try {
    // 1. Get the current file's ID and vector
    // We normalize path separators to ensure matching
    const normalizedPath = filePath.replace(/\\/g, '/')

    // Try finding by exact path first (DB might have backslashes on Windows)
    let currentFile = await db
      .select({
        id: files.id,
        path: files.path,
        vector: note_embeddings.vector
      })
      .from(files)
      .innerJoin(note_embeddings, eq(files.id, note_embeddings.fileId))
      .where(eq(files.path, filePath))
      .get()

    if (!currentFile) {
      currentFile = await db
        .select({
          id: files.id,
          path: files.path,
          vector: note_embeddings.vector
        })
        .from(files)
        .innerJoin(note_embeddings, eq(files.id, note_embeddings.fileId))
        .where(eq(files.path, normalizedPath))
        .get()
    }

    if (!currentFile || !currentFile.vector) {
      return []
    }

    const targetVector = currentFile.vector

    // 2. Get all other notes' vectors
    const otherNotes = await db
      .select({
        id: files.id,
        path: files.path,
        vector: note_embeddings.vector
      })
      .from(files)
      .innerJoin(note_embeddings, eq(files.id, note_embeddings.fileId))
      .where(ne(files.id, currentFile.id))
      .all()

    // 3. Calculate similarity scores
    const scores: RelatedNote[] = []

    for (const note of otherNotes) {
      if (note.vector) {
        const score = cosineSimilarity(targetVector, note.vector)
        // Extract title from filename
        const fileName = basename(note.path)
        const title = fileName.replace(/\.md$/i, '')

        if (score > 0) {
          scores.push({
            id: note.id,
            title,
            path: note.path,
            score
          })
        }
      }
    }

    // 4. Sort by score (descending) and take top 5
    return scores.sort((a, b) => b.score - a.score).slice(0, 5)
  } catch (error) {
    console.error('Error getting related notes:', error)
    return []
  }
}

// =============================================================================
// SEMANTIC SEARCH
// =============================================================================

export interface SemanticResult {
  id: string
  title: string
  path: string
  score: number
}

/**
 * Perform semantic search using vector embeddings
 */
export async function handleSemanticSearch(query: string): Promise<SemanticResult[]> {
  try {
    if (!query || query.trim().length === 0) {
      return []
    }

    // 1. Generate embedding for query
    const queryVector = await EmbeddingService.generateEmbedding(query)

    if (!queryVector || queryVector.length === 0) {
      return []
    }

    // 2. Fetch all note embeddings
    const notes = await db
      .select({
        id: files.id,
        path: files.path,
        vector: note_embeddings.vector
      })
      .from(files)
      .innerJoin(note_embeddings, eq(files.id, note_embeddings.fileId))
      .all()

    // 3. Calculate similarity scores
    const scores: SemanticResult[] = []

    for (const note of notes) {
      if (note.vector) {
        const score = cosineSimilarity(queryVector, note.vector)

        // Filter out irrelevant scores
        if (score >= 0.25) {
          // Extract title from filename
          const fileName = basename(note.path)
          const title = fileName.replace(/\.md$/i, '')

          scores.push({
            id: note.id,
            title,
            path: note.path,
            score
          })
        }
      }
    }

    // 4. Sort by score (descending) and take top 5
    return scores.sort((a, b) => b.score - a.score).slice(0, 5)
  } catch (error) {
    console.error('Error executing semantic search:', error)
    return []
  }
}

import chokidar, { FSWatcher } from 'chokidar'
import { createHash, randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import { basename, relative } from 'path'
import { db, sqlite } from '../database/db'
import { files, links, note_embeddings } from '../database/schema'
import { eq } from 'drizzle-orm'
import { EventEmitter } from 'events'
import EmbeddingService from './EmbeddingService'

export const indexerEvents = new EventEmitter()

let updateTimeout: NodeJS.Timeout | null = null
function notifyUpdate(): void {
  if (updateTimeout) clearTimeout(updateTimeout)
  updateTimeout = setTimeout(() => {
    indexerEvents.emit('updated')
  }, 100)
}

let watcher: FSWatcher | null = null
let currentVaultPath: string | null = null

/**
 * Regex pattern to match Wikilinks: [[Link Name]] or [[Link Name|Display Text]]
 */
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

/**
 * Regex pattern to match Markdown tasks: - [ ] or - [x] or - [X]
 */
const TASK_REGEX = /^\s*-\s*\[([ xX])\]\s*(.+)$/gm

/**
 * Calculate MD5 checksum of a file
 */
async function calculateChecksum(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath)
    return createHash('md5').update(content).digest('hex')
  } catch {
    return ''
  }
}

/**
 * Generate a unique ID for a file based on its relative path
 */
function generateFileId(relativePath: string): string {
  return createHash('sha256').update(relativePath).digest('hex').slice(0, 16)
}

/**
 * Extract title from markdown content (first H1 or frontmatter title)
 */
function extractTitle(content: string, filePath: string): string {
  // Try to find frontmatter title
  const frontmatterMatch = content.match(
    /^---\s*\n[\s\S]*?title:\s*["']?([^"'\n]+)["']?\s*\n[\s\S]*?---/m
  )
  if (frontmatterMatch) {
    return frontmatterMatch[1].trim()
  }

  // Try to find first H1
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match) {
    return h1Match[1].trim()
  }

  // Fallback to filename without extension
  return basename(filePath, '.md')
}

/**
 * Extract plain text content from markdown (strip frontmatter and markdown syntax)
 */
function extractPlainText(content: string): string {
  // Remove frontmatter
  let text = content.replace(/^---\s*\n[\s\S]*?---\s*\n/m, '')

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '')
  text = text.replace(/`[^`]+`/g, '')

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove wikilinks [[Text]] -> Text
  text = text.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')

  // Remove headers markers
  text = text.replace(/^#{1,6}\s+/gm, '')

  // Remove bold/italic (handle ***, **, *, __, _)
  text = text.replace(/(\*{1,3}|_{1,3})([^*_]+)\1/g, '$2')

  // Remove blockquotes
  text = text.replace(/^>\s+/gm, '')

  // Remove list markers
  text = text.replace(/^[-*+]\s+/gm, '')
  text = text.replace(/^\d+\.\s+/gm, '')

  // Remove task boxes [x] or [ ]
  text = text.replace(/^[-*+]\s*\[[ xX]\]\s+/gm, '')

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '')

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '')

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

// FTS prepared statements - delete then insert for upsert behavior
const deleteFtsByPath = sqlite.prepare(`
  DELETE FROM notes_fts WHERE path = ?
`)

const insertFts = sqlite.prepare(`
  INSERT INTO notes_fts (id, path, title, content) VALUES (?, ?, ?, ?)
`)

// deleteFtsByPath is used for both updates and deletes

// Link prepared statements
const deleteLinks = sqlite.prepare(`
  DELETE FROM links WHERE source_id = ?
`)

const insertLink = sqlite.prepare(`
  INSERT INTO links (source_id, target_id) VALUES (?, ?)
`)

// Todos prepared statements
const deleteTodosByFileId = sqlite.prepare(`
  DELETE FROM todos WHERE file_id = ?
`)

const insertTodo = sqlite.prepare(`
  INSERT INTO todos (id, file_id, content, completed, created_at) VALUES (?, ?, ?, ?, ?)
`)

// Embedding prepared statements
const deleteEmbedding = sqlite.prepare(`
  DELETE FROM note_embeddings WHERE file_id = ?
`)

const insertEmbedding = sqlite.prepare(`
  INSERT INTO note_embeddings (file_id, vector, updated_at) VALUES (?, ?, ?)
`)

// Query to find file ID by filename (without extension)
const findFileByName = sqlite.prepare(`
  SELECT id, path FROM files WHERE path LIKE ? OR path LIKE ?
`)

/**
 * Extract all wikilinks from content
 * Returns an array of unique link target names (the text inside [[...]])
 */
function extractWikilinks(content: string): string[] {
  const linkSet = new Set<string>()
  let match: RegExpExecArray | null

  // Reset regex lastIndex to ensure fresh start
  WIKILINK_REGEX.lastIndex = 0

  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    const linkTarget = match[1].trim()
    if (linkTarget) {
      linkSet.add(linkTarget)
    }
  }

  return Array.from(linkSet)
}

/**
 * Extract all tasks from content
 * Returns an array of tasks with their completion status and content
 */
function extractTasks(content: string): { completed: boolean; content: string }[] {
  const tasks: { completed: boolean; content: string }[] = []

  // Reset regex lastIndex to ensure fresh start
  TASK_REGEX.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = TASK_REGEX.exec(content)) !== null) {
    const checkMark = match[1]
    const taskContent = match[2].trim()
    if (taskContent) {
      tasks.push({
        completed: checkMark.toLowerCase() === 'x',
        content: taskContent
      })
    }
  }

  return tasks
}

/**
 * Resolve a wikilink target to an actual file ID
 * Returns the file ID if found, otherwise returns the original link name (ghost link)
 */
function resolveTargetId(linkTarget: string): string {
  // Try to find the file by name (with or without .md extension)
  const searchPatterns = [
    `%/${linkTarget}.md`, // subfolder/linkTarget.md
    `${linkTarget}.md` // root level linkTarget.md
  ]

  try {
    const result = findFileByName.get(searchPatterns[0], searchPatterns[1]) as
      | { id: string; path: string }
      | undefined

    if (result) {
      return result.id // Return actual file ID
    }
  } catch {
    // Ignore errors, return ghost link
  }

  // Ghost link: target file not found, return link name as-is
  return `ghost:${linkTarget}`
}

/**
 * Clear all data from indexer tables
 */
function clearDatabase(): void {
  sqlite.exec('DELETE FROM todos')
  sqlite.exec('DELETE FROM links')
  sqlite.exec('DELETE FROM note_embeddings')
  sqlite.exec('DELETE FROM notes_fts')
  sqlite.exec('DELETE FROM files')
  console.log('[Indexer] Database cleared')
}

/**
 * Persist file data to database (atomic transaction)
 * Handles: files table upsert, FTS index update, links update
 */
function persistFileData(
  sourceId: string,
  relativePath: string,
  title: string,
  plainText: string,
  wikilinks: string[],
  tasks: { completed: boolean; content: string }[],
  embedding: number[]
): void {
  const transaction = sqlite.transaction(() => {
    // 1. Update FTS table (delete old, insert new)
    deleteFtsByPath.run(relativePath)
    insertFts.run(sourceId, relativePath, title, plainText)

    // 2. Delete all existing links from this source
    deleteLinks.run(sourceId)

    // 3. Insert new links with resolved target IDs
    for (const linkTarget of wikilinks) {
      const targetId = resolveTargetId(linkTarget)
      insertLink.run(sourceId, targetId)
    }

    // 4. Delete all existing todos from this source
    deleteTodosByFileId.run(sourceId)

    // 5. Insert new todos
    const now = Date.now()
    for (const task of tasks) {
      const todoId = randomUUID()
      insertTodo.run(todoId, sourceId, task.content, task.completed ? 1 : 0, now)
    }

    // 6. Update embedding
    deleteEmbedding.run(sourceId)
    // Store vector as JSON string because strict mode requires text for json
    insertEmbedding.run(sourceId, JSON.stringify(embedding), now)
  })

  transaction()

  if (wikilinks.length > 0) {
    console.log(`[Indexer] Persisted ${wikilinks.length} links for: ${relativePath}`)
  }
  if (tasks.length > 0) {
    console.log(`[Indexer] Persisted ${tasks.length} tasks for: ${relativePath}`)
  }
  if (embedding.length > 0) {
    console.log(`[Indexer] Generated and persisted embedding for: ${relativePath}`)
  }
}

/**
 * Handle file add event
 */
async function onFileAdd(absolutePath: string): Promise<void> {
  if (!currentVaultPath) return

  try {
    const relativePath = relative(currentVaultPath, absolutePath)
    const fileId = generateFileId(relativePath)
    const checksum = await calculateChecksum(absolutePath)
    const now = new Date()

    // Read file content for FTS indexing
    const rawContent = await fs.readFile(absolutePath, 'utf-8')
    const title = extractTitle(rawContent, absolutePath)
    const plainText = extractPlainText(rawContent)

    // Extract wikilinks from content
    const wikilinks = extractWikilinks(rawContent)

    // Extract tasks from content
    const tasks = extractTasks(rawContent)

    // Generate embedding
    const embedding = await EmbeddingService.generateEmbedding(plainText)

    // Insert file record
    await db
      .insert(files)
      .values({
        id: fileId,
        path: relativePath,
        checksum,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoNothing()

    // Persist FTS, links, tasks, and embedding in atomic transaction
    persistFileData(fileId, relativePath, title, plainText, wikilinks, tasks, embedding)

    console.log(`[Indexer] Added: ${relativePath}`)
    notifyUpdate()
  } catch (error) {
    console.error(`[Indexer] Error adding file ${absolutePath}:`, error)
  }
}

/**
 * Handle file change event
 */
async function onFileChange(absolutePath: string): Promise<void> {
  if (!currentVaultPath) return

  try {
    const relativePath = relative(currentVaultPath, absolutePath)
    const fileId = generateFileId(relativePath)
    const checksum = await calculateChecksum(absolutePath)
    const now = new Date()

    // Read file content for FTS indexing
    const rawContent = await fs.readFile(absolutePath, 'utf-8')
    const title = extractTitle(rawContent, absolutePath)
    const plainText = extractPlainText(rawContent)

    // Extract wikilinks from content
    const wikilinks = extractWikilinks(rawContent)

    // Extract tasks from content
    const tasks = extractTasks(rawContent)

    // Generate embedding
    const embedding = await EmbeddingService.generateEmbedding(plainText)

    // Update file record
    await db
      .update(files)
      .set({
        checksum,
        updatedAt: now
      })
      .where(eq(files.id, fileId))

    // Persist FTS, links, tasks, and embedding in atomic transaction
    persistFileData(fileId, relativePath, title, plainText, wikilinks, tasks, embedding)

    console.log(`[Indexer] Updated: ${relativePath}`)
    notifyUpdate()
  } catch (error) {
    console.error(`[Indexer] Error updating file ${absolutePath}:`, error)
  }
}

/**
 * Handle file unlink (delete) event
 */
async function onFileUnlink(absolutePath: string): Promise<void> {
  if (!currentVaultPath) return

  try {
    const relativePath = relative(currentVaultPath, absolutePath)
    const fileId = generateFileId(relativePath)

    // Remove from FTS table first
    deleteFtsByPath.run(relativePath)

    // Remove links from this source
    deleteLinks.run(fileId)

    // Remove todos from this source (also handled by FK cascade, but explicit for clarity)
    deleteTodosByFileId.run(fileId)

    // Remove embedding
    deleteEmbedding.run(fileId)

    await db.delete(files).where(eq(files.id, fileId))

    console.log(`[Indexer] Removed: ${relativePath}`)
    notifyUpdate()
  } catch (error) {
    console.error(`[Indexer] Error removing file ${absolutePath}:`, error)
  }
}

/**
 * Start watching a vault directory
 */
export function startIndexer(vaultPath: string): void {
  // Stop existing watcher if any
  stopIndexer()

  // Clear database for the new vault
  clearDatabase()

  currentVaultPath = vaultPath

  watcher = chokidar.watch(vaultPath, {
    ignored: [
      /(^|[\/\\])\../, // Ignore dotfiles/folders
      '**/node_modules/**'
    ],
    persistent: true,
    ignoreInitial: false, // Process existing files on start
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  })

  // Filter for .md files only
  watcher.on('add', (path) => {
    if (path.endsWith('.md')) {
      onFileAdd(path)
    }
  })

  watcher.on('change', (path) => {
    if (path.endsWith('.md')) {
      onFileChange(path)
    }
  })

  watcher.on('unlink', (path) => {
    if (path.endsWith('.md')) {
      onFileUnlink(path)
    }
  })

  watcher.on('error', (error) => {
    console.error('[Indexer] Watcher error:', error)
  })

  watcher.on('ready', () => {
    console.log(`[Indexer] Watching vault: ${vaultPath}`)
    notifyUpdate()
  })
}

/**
 * Stop the file watcher
 */
export function stopIndexer(): void {
  if (watcher) {
    watcher.close()
    watcher = null
    currentVaultPath = null
    console.log('[Indexer] Stopped')
  }
}

/**
 * Check if indexer is running
 */
export function isIndexerRunning(): boolean {
  return watcher !== null
}

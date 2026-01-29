import chokidar, { FSWatcher } from 'chokidar'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import { basename, relative } from 'path'
import { db, sqlite } from '../database/db'
import { files } from '../database/schema'
import { eq } from 'drizzle-orm'

let watcher: FSWatcher | null = null
let currentVaultPath: string | null = null

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

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')

  // Remove headers markers
  text = text.replace(/^#{1,6}\s+/gm, '')

  // Remove bold/italic
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')

  // Remove blockquotes
  text = text.replace(/^>\s+/gm, '')

  // Remove list markers
  text = text.replace(/^[-*+]\s+/gm, '')
  text = text.replace(/^\d+\.\s+/gm, '')

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '')

  // Normalize whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return text
}

// FTS prepared statements
const insertFts = sqlite.prepare(`
  INSERT OR REPLACE INTO notes_fts (rowid, title, content, path)
  SELECT rowid, ?, ?, ? FROM files WHERE id = ?
`)

const deleteFts = sqlite.prepare(`
  DELETE FROM notes_fts WHERE path = ?
`)

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

    // Index content in FTS table
    insertFts.run(title, plainText, relativePath, fileId)

    console.log(`[Indexer] Added: ${relativePath}`)
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

    await db
      .update(files)
      .set({
        checksum,
        updatedAt: now
      })
      .where(eq(files.id, fileId))

    // Update content in FTS table
    insertFts.run(title, plainText, relativePath, fileId)

    console.log(`[Indexer] Updated: ${relativePath}`)
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
    deleteFts.run(relativePath)

    await db.delete(files).where(eq(files.id, fileId))

    console.log(`[Indexer] Removed: ${relativePath}`)
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

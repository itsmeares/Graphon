import chokidar, { FSWatcher } from 'chokidar'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import { basename, relative } from 'path'
import { db, sqlite } from '../database/db'
import { files, links } from '../database/schema'
import { eq } from 'drizzle-orm'
import { EventEmitter } from 'events'

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

// FTS prepared statements - delete then insert for upsert behavior
const deleteFtsByPath = sqlite.prepare(`
  DELETE FROM notes_fts WHERE path = ?
`)

const insertFts = sqlite.prepare(`
  INSERT INTO notes_fts (title, content, path) VALUES (?, ?, ?)
`)

// deleteFtsByPath is used for both updates and deletes

// Link prepared statements
const deleteLinks = sqlite.prepare(`
  DELETE FROM links WHERE source_id = ?
`)

const insertLink = sqlite.prepare(`
  INSERT INTO links (source_id, target_id) VALUES (?, ?)
`)

/**
 * Extract all wikilinks from content
 * Returns an array of link target names (the text inside [[...]])
 */
function extractWikilinks(content: string): string[] {
  const foundLinks: string[] = []
  let match: RegExpExecArray | null

  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    const linkTarget = match[1].trim()
    if (linkTarget) {
      foundLinks.push(linkTarget)
    }
  }

  // Remove duplicates
  return Array.from(new Set(foundLinks))
}

/**
 * Clear all data from indexer tables
 */
function clearDatabase(): void {
  sqlite.exec('DELETE FROM files')
  sqlite.exec('DELETE FROM links')
  sqlite.exec('DELETE FROM notes_fts')
  console.log('[Indexer] Database cleared')
}

/**
 * Update links for a file (atomic operation)
 * First deletes all existing links from this source, then inserts new ones
 */
function updateFileLinks(sourceId: string, wikilinks: string[]): void {
  // Use a transaction for atomic update
  const transaction = sqlite.transaction(() => {
    // Delete all existing links from this source
    deleteLinks.run(sourceId)

    // Insert new links
    // For now, we use the link target name as target_id
    // Later we can resolve these to actual file IDs
    for (const linkTarget of wikilinks) {
      // Store the link target as-is for now
      // We'll resolve to actual file IDs in a future enhancement
      insertLink.run(sourceId, linkTarget)
    }
  })

  transaction()
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

    // Index content in FTS table (delete first to handle potential duplicates)
    deleteFtsByPath.run(relativePath)
    insertFts.run(title, plainText, relativePath)

    // Extract and save wikilinks (async to not block main thread)
    setImmediate(() => {
      const wikilinks = extractWikilinks(rawContent)
      updateFileLinks(fileId, wikilinks)
      if (wikilinks.length > 0) {
        console.log(`[Indexer] Found ${wikilinks.length} links in: ${relativePath}`)
      }
    })

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

    await db
      .update(files)
      .set({
        checksum,
        updatedAt: now
      })
      .where(eq(files.id, fileId))

    // Update content in FTS table (delete then insert for upsert)
    deleteFtsByPath.run(relativePath)
    insertFts.run(title, plainText, relativePath)

    // Extract and save wikilinks (async to not block main thread)
    setImmediate(() => {
      const wikilinks = extractWikilinks(rawContent)
      updateFileLinks(fileId, wikilinks)
      if (wikilinks.length > 0) {
        console.log(`[Indexer] Updated ${wikilinks.length} links in: ${relativePath}`)
      }
    })

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

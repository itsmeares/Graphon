/**
 * Serialization Utilities for Graphon Notes
 *
 * This module handles the conversion between Tiptap JSON format and
 * Markdown files with YAML frontmatter for persistent storage.
 */

import { Markdown } from 'tiptap-markdown'
import fm from 'front-matter'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { generateJSON, generateHTML } from '@tiptap/core'
import type { JSONContent } from '@tiptap/core'

/**
 * Metadata structure for note frontmatter
 */
export interface NoteMetadata {
  title?: string
  id?: string
  date?: string
  created?: string
  modified?: string
  tags?: string[]
  [key: string]: unknown
}

/**
 * Result of parsing a note file
 */
export interface ParsedNote {
  json: JSONContent
  metadata: NoteMetadata
}

/**
 * Extensions used for serialization (must match editor extensions)
 */
const serializationExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3]
    }
  }),
  TaskList,
  TaskItem.configure({
    nested: true
  }),
  Markdown.configure({
    html: true,
    tightLists: true,
    tightListClass: 'tight',
    bulletListMarker: '-',
    linkify: false,
    breaks: false,
    transformPastedText: false,
    transformCopiedText: false
  })
]

/**
 * Converts an object to YAML frontmatter string
 */
function objectToYaml(obj: NoteMetadata): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      if (value.length === 0) continue
      lines.push(`${key}:`)
      for (const item of value) {
        lines.push(`  - ${String(item)}`)
      }
    } else if (typeof value === 'object') {
      // Skip nested objects for simplicity
      continue
    } else {
      // Handle strings with special characters
      const strValue = String(value)
      if (strValue.includes(':') || strValue.includes('#') || strValue.includes('\n')) {
        lines.push(`${key}: "${strValue.replace(/"/g, '\\"')}"`)
      } else {
        lines.push(`${key}: ${strValue}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Serializes Tiptap JSON content to a Markdown string with YAML frontmatter.
 *
 * @param jsonContent - The Tiptap JSON document content
 * @param metadata - Metadata object to include in frontmatter (title, id, date, etc.)
 * @returns A string containing YAML frontmatter followed by Markdown content
 *
 * @example
 * ```ts
 * const markdown = serializeNote(
 *   { type: 'doc', content: [...] },
 *   { title: 'My Note', id: 'abc123', date: '2024-01-29' }
 * )
 * // Returns:
 * // ---
 * // title: My Note
 * // id: abc123
 * // date: 2024-01-29
 * // ---
 * //
 * // # My Note Content...
 * ```
 */
export function serializeNote(jsonContent: JSONContent, metadata: NoteMetadata): string {
  // Generate HTML from JSON first
  const html = generateHTML(jsonContent, serializationExtensions)

  // Convert HTML to Markdown using a temporary div and the Markdown extension
  // Since tiptap-markdown works with the editor, we'll use a simpler approach
  // by converting through the extension's getMarkdown functionality

  // For now, we'll create a simple HTML to Markdown converter
  const markdown = htmlToMarkdown(html)

  // Build frontmatter
  const frontmatter = objectToYaml(metadata)

  // Combine frontmatter and content
  if (frontmatter.trim()) {
    return `---\n${frontmatter}\n---\n\n${markdown}`
  }

  return markdown
}

/**
 * Simple HTML to Markdown converter for common elements
 */
function htmlToMarkdown(html: string): string {
  let md = html

  /**
   * CUSTOM LOGIC: Preserve Callout blocks
   *
   * Since htmlToMarkdown cleaner strips unknown tags, we need to protect our callouts.
   * We'll temporarily replace them with placeholders, run the cleaner,
   * then restore the HTML.
   */
  const calloutMap = new Map<string, string>()
  let calloutCounter = 0

  // Regex to match callout divs: <div data-type="callout" ... > ... </div>
  // Note: maximizing content match until the closing div.
  // IMPORTANT: This is a simple regex assumption that callouts don't nest callouts.
  md = md.replace(/<div\s+data-type="callout"[^>]*>[\s\S]*?<\/div>/gi, (match) => {
    const key = `__CALLOUT_PRESERVE_${calloutCounter++}__`
    calloutMap.set(key, match)
    return key
  })

  // --- Original Cleaning Logic ---

  // Handle headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')

  // Handle paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')

  // Handle bold and italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

  // Handle code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')

  // Handle blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = content
      .trim()
      .split('\n')
      .map((line: string) => `> ${line.trim()}`)
    return lines.join('\n') + '\n\n'
  })

  // Handle task lists FIRST (before generic list handling)
  // Match the entire task list and convert it
  md = md.replace(/<ul[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    // Convert checked items
    let result = content.replace(
      /<li[^>]*data-checked="true"[^>]*>([\s\S]*?)<\/li>/gi,
      '- [x] $1\n'
    )
    // Convert unchecked items
    result = result.replace(/<li[^>]*data-checked="false"[^>]*>([\s\S]*?)<\/li>/gi, '- [ ] $1\n')
    // Clean up any remaining HTML tags inside list items
    result = result.replace(/<\/?p[^>]*>/gi, '')
    return result + '\n'
  })

  // Handle unordered lists (non-task lists)
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return (
      content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n').replace(/<\/?[^>]+(>|$)/g, '') + '\n'
    )
  })

  // Handle ordered lists
  let listCounter = 0
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    listCounter = 0
    return (
      content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => {
        listCounter++
        return `${listCounter}. `
      }) + '\n'
    )
  })

  // Handle links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

  // Handle images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')

  // Handle horizontal rules
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n\n')

  // Handle line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n')

  // Remove remaining HTML tags
  md = md.replace(/<\/?[^>]+(>|$)/g, '')

  // Decode HTML entities
  md = md.replace(/&amp;/g, '&')
  md = md.replace(/&lt;/g, '<')
  md = md.replace(/&gt;/g, '>')
  md = md.replace(/&quot;/g, '"')
  md = md.replace(/&#39;/g, "'")
  md = md.replace(/&nbsp;/g, ' ')

  // Clean up extra whitespace
  md = md.replace(/\n{3,}/g, '\n\n')
  md = md.trim()

  // --- Restore Callouts ---
  if (calloutMap.size > 0) {
    calloutMap.forEach((html, key) => {
      // The markdown cleaner might have messed up whitespace around keys, so use replace
      md = md.replace(key, '\n\n' + html + '\n\n')
    })
  }

  return md
}

/**
 * Parses a Markdown file with YAML frontmatter into Tiptap JSON and metadata.
 *
 * @param fileContent - The raw file content including frontmatter and Markdown
 * @returns An object containing the Tiptap JSON representation and parsed metadata
 *
 * @example
 * ```ts
 * const content = `---
 * title: My Note
 * id: abc123
 * ---
 *
 * # Hello World
 *
 * This is my note content.
 * `
 *
 * const { json, metadata } = parseNote(content)
 * // json: { type: 'doc', content: [...] }
 * // metadata: { title: 'My Note', id: 'abc123' }
 * ```
 */
export function parseNote(fileContent: string): ParsedNote {
  // Parse frontmatter using front-matter package
  const parsed = fm<NoteMetadata>(fileContent)

  const metadata: NoteMetadata = parsed.attributes || {}
  const markdownContent = parsed.body.trim()

  // Convert Markdown to HTML first
  const html = markdownToHtml(markdownContent)

  // Convert HTML to Tiptap JSON
  const json = generateJSON(html, serializationExtensions)

  return {
    json,
    metadata
  }
}

/**
 * Simple Markdown to HTML converter for common elements
 */
function markdownToHtml(markdown: string): string {
  let html = markdown

  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;')
  html = html.replace(/</g, '&lt;')
  html = html.replace(/>/g, '&gt;')

  // Handle code blocks (before other processing)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')

  // Handle inline code (before other inline elements)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Handle headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Handle horizontal rules
  html = html.replace(/^---$/gm, '<hr>')
  html = html.replace(/^\*\*\*$/gm, '<hr>')
  html = html.replace(/^___$/gm, '<hr>')

  // Handle blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')

  // Handle bold and italic (order matters: bold first, then italic)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>')

  // Handle images (before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')

  // Handle links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Handle task lists
  html = html.replace(
    /^- \[x\] (.+)$/gm,
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>$1</p></li></ul>'
  )
  html = html.replace(
    /^- \[ \] (.+)$/gm,
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>$1</p></li></ul>'
  )

  // Handle unordered lists (must come after task lists)
  html = html.replace(/^[-*+] (.+)$/gm, '<ul><li><p>$1</p></li></ul>')

  // Handle ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<ol><li><p>$1</p></li></ol>')

  // Merge consecutive list items
  html = html.replace(/<\/ul>\s*<ul>/g, '')
  html = html.replace(/<\/ol>\s*<ol>/g, '')
  html = html.replace(/<\/ul data-type="taskList">\s*<ul data-type="taskList">/g, '')

  // Handle paragraphs (lines that aren't already wrapped)
  const lines = html.split('\n')
  const processedLines: string[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine === '') {
      processedLines.push('')
    } else if (
      trimmedLine.startsWith('<h') ||
      trimmedLine.startsWith('<ul') ||
      trimmedLine.startsWith('<ol') ||
      trimmedLine.startsWith('<blockquote') ||
      trimmedLine.startsWith('<pre') ||
      trimmedLine.startsWith('<hr') ||
      trimmedLine.startsWith('</') // Closing tags
    ) {
      processedLines.push(line)
    } else if (!trimmedLine.startsWith('<')) {
      processedLines.push(`<p>${trimmedLine}</p>`)
    } else {
      processedLines.push(line)
    }
  }

  html = processedLines.join('\n')

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/\n{2,}/g, '\n')

  return html.trim()
}

/**
 * Extracts just the metadata from a file without parsing the full content.
 * This is useful for building file indexes without loading full content.
 *
 * @param fileContent - The raw file content
 * @returns The parsed metadata object
 */
export function extractMetadata(fileContent: string): NoteMetadata {
  const parsed = fm<NoteMetadata>(fileContent)
  return parsed.attributes || {}
}

/**
 * Creates a new note template with frontmatter
 *
 * @param title - The title of the new note
 * @param additionalMetadata - Optional additional metadata fields
 * @returns A formatted note string with frontmatter
 */
export function createNoteTemplate(
  title: string,
  additionalMetadata?: Partial<NoteMetadata>
): string {
  const now = new Date().toISOString()
  const id = generateNoteId()

  const metadata: NoteMetadata = {
    title,
    id,
    created: now,
    modified: now,
    ...additionalMetadata
  }

  return serializeNote(
    {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: title }]
        },
        {
          type: 'paragraph',
          content: []
        }
      ]
    },
    metadata
  )
}

/**
 * Generates a unique note ID
 */
function generateNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

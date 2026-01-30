/**
 * Template Processing Utility
 * Processes template content by replacing variables with dynamic values
 */

/**
 * Process a template string by replacing variables with dynamic values
 * @param content - The template content with {{variable}} placeholders
 * @returns Processed content with variables replaced
 *
 * Supported variables:
 * - {{date}}: Today's date in YYYY-MM-DD format
 * - {{time}}: Current time in HH:mm format
 * - {{clipboard}}: Text from clipboard
 * - {{cursor}}: Placeholder for cursor position (replaced with empty string)
 */
export async function processTemplate(content: string): Promise<string> {
  let result = content

  // Get current date and time
  const now = new Date()
  const date = now.toISOString().split('T')[0] // YYYY-MM-DD
  const time = now.toTimeString().slice(0, 5) // HH:mm

  // Replace {{date}}
  result = result.replace(/\{\{date\}\}/gi, date)

  // Replace {{time}}
  result = result.replace(/\{\{time\}\}/gi, time)

  // Replace {{clipboard}} with clipboard content
  try {
    const clipboardText = await navigator.clipboard.readText()
    result = result.replace(/\{\{clipboard\}\}/gi, clipboardText)
  } catch {
    // Clipboard access failed (permission denied or not available)
    // Replace with empty string
    result = result.replace(/\{\{clipboard\}\}/gi, '')
  }

  // Replace {{cursor}} with empty string (placeholder for future cursor positioning)
  result = result.replace(/\{\{cursor\}\}/gi, '')

  return result
}

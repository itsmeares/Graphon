import type { FileNode } from '../types'

/**
 * Represents a flattened tree node for virtualization.
 * Each node contains the original FileNode plus metadata for rendering.
 */
export interface FlatNode {
  /** The original FileNode data */
  node: FileNode
  /** Nesting level (0 = root) */
  level: number
  /** Whether this folder is currently expanded */
  isExpanded: boolean
  /** Whether this node has children (only true for non-empty folders) */
  hasChildren: boolean
  /** Unique key for React virtualization */
  key: string
}

/**
 * Flattens a recursive tree structure into a linear array based on expanded state.
 * Only visible nodes (those whose parent folders are all expanded) are included.
 *
 * @param nodes - The tree nodes to flatten
 * @param expandedPaths - Set of folder paths that are currently expanded
 * @param level - Current nesting level (internal, starts at 0)
 * @returns Linear array of FlatNode objects
 */
export function flattenTree(nodes: FileNode[], expandedPaths: Set<string>, level = 0): FlatNode[] {
  const result: FlatNode[] = []

  for (const node of nodes) {
    const isExpanded = expandedPaths.has(node.path)
    const hasChildren = node.type === 'folder' && (node.children?.length ?? 0) > 0

    // Add the node itself
    result.push({
      node,
      level,
      isExpanded,
      hasChildren,
      key: node.path
    })

    // If expanded folder, recursively add children immediately after
    if (isExpanded && node.children) {
      result.push(...flattenTree(node.children, expandedPaths, level + 1))
    }
  }

  return result
}

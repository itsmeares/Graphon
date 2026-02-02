import type { GraphNode, GraphLink, NodeSizeConfig } from '../types'

/**
 * Get all neighboring node IDs for a given node (including the node itself).
 */
export function getNeighbors(nodeId: string, links: GraphLink[]): Set<string> {
  const neighbors = new Set<string>([nodeId])

  for (const link of links) {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id
    const targetId = typeof link.target === 'string' ? link.target : link.target.id

    if (sourceId === nodeId) {
      neighbors.add(targetId)
    }
    if (targetId === nodeId) {
      neighbors.add(sourceId)
    }
  }

  return neighbors
}

/**
 * Calculate node radius based on link count.
 * More connected nodes appear larger.
 */
export function calculateNodeRadius(linkCount: number, config: NodeSizeConfig): number {
  const scale = Math.min(linkCount / 10, 1)
  return config.radiusBase + scale * (config.radiusMax - config.radiusBase)
}

/**
 * Count the number of links connected to each node.
 */
export function calculateLinkCounts(links: GraphLink[]): Map<string, number> {
  const counts = new Map<string, number>()

  for (const link of links) {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id
    const targetId = typeof link.target === 'string' ? link.target : link.target.id

    counts.set(sourceId, (counts.get(sourceId) || 0) + 1)
    counts.set(targetId, (counts.get(targetId) || 0) + 1)
  }

  return counts
}

/**
 * Enrich nodes with their link counts.
 */
export function enrichNodesWithLinkCounts(nodes: GraphNode[], links: GraphLink[]): GraphNode[] {
  const linkCounts = calculateLinkCounts(links)

  return nodes.map((node) => ({
    ...node,
    linkCount: linkCounts.get(node.id) || 0
  }))
}

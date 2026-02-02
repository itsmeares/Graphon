import { useEffect, useCallback } from 'react'
import type { GraphNode } from '../types'
import type { GraphRenderer } from '../engine/GraphRenderer'

interface UseGraphInteractionOptions {
  renderer: GraphRenderer | null
  onSimulationRestart: () => void
  onNodeSelect: (node: GraphNode) => void
}

/**
 * Hook for setting up graph interaction callbacks.
 * Connects the renderer's events to simulation and selection handlers.
 */
export function useGraphInteraction({
  renderer,
  onSimulationRestart,
  onNodeSelect
}: UseGraphInteractionOptions): void {
  // Handle node click (navigation)
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      onNodeSelect(node)
    },
    [onNodeSelect]
  )

  // Handle node drag (restart simulation)
  const handleNodeDrag = useCallback(
    (_node: GraphNode, _x: number, _y: number) => {
      onSimulationRestart()
    },
    [onSimulationRestart]
  )

  // Setup renderer callbacks
  useEffect(() => {
    if (!renderer) return

    renderer.setCallbacks({
      onNodeClick: handleNodeClick,
      onNodeDrag: handleNodeDrag,
      onNodeHover: undefined, // Handled internally by renderer
      onNodeHoverEnd: undefined, // Handled internally by renderer
      onNodeDragStart: undefined,
      onNodeDragEnd: undefined,
      onBackgroundClick: undefined
    })

    return () => {
      renderer.setCallbacks({})
    }
  }, [renderer, handleNodeClick, handleNodeDrag])
}

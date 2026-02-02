import React, { useCallback, useMemo, useRef, useState } from 'react'
import type { GraphViewProps, GraphNode } from './types'
import { createGraphConfig } from './constants'
import { useGraphData } from './hooks/useGraphData'
import { useGraphSimulation } from './hooks/useGraphSimulation'
import { useGraphInteraction } from './hooks/useGraphInteraction'
import { GraphCanvas } from './GraphCanvas'
import { GraphRenderer } from './engine/GraphRenderer'

/**
 * GraphView is the main orchestrator component.
 * It combines data fetching, simulation, rendering, and interaction.
 *
 * Responsibilities:
 * - Create configuration based on theme
 * - Orchestrate hooks (data, simulation, interaction)
 * - Handle node selection callbacks
 * - Render empty state or canvas
 */
export default function GraphView({
  isDarkMode,
  onSelectNode
}: GraphViewProps): React.ReactElement {
  // 1. Configuration
  const config = useMemo(() => createGraphConfig(isDarkMode), [isDarkMode])

  // 2. Data Layer
  const { data, isLoading } = useGraphData()

  // 3. Renderer Reference
  const rendererRef = useRef<GraphRenderer | null>(null)
  const [isRendererReady, setIsRendererReady] = useState(false)

  // 4. Simulation (ticks update renderer positions)
  const onTick = useCallback(() => {
    if (rendererRef.current && data) {
      rendererRef.current.updatePositions()
    }
  }, [data])

  const simulation = useGraphSimulation(data, config, onTick)

  // 5. Node Selection Handler
  const handleNodeSelect = useCallback(
    (node: GraphNode) => {
      if (node.exists && node.path) {
        onSelectNode(node.path)
      } else if (!node.exists) {
        onSelectNode(`create:${node.title}`)
      } else {
        // Fallback: try to find file by title
        onSelectNode(node.title)
      }
    },
    [onSelectNode]
  )

  // 6. Interaction Setup
  useGraphInteraction({
    renderer: isRendererReady ? rendererRef.current : null,
    onSimulationRestart: simulation.restart,
    onNodeSelect: handleNodeSelect
  })

  // 7. Set data when renderer is ready
  const handleRendererReady = useCallback(() => {
    setIsRendererReady(true)
  }, [])

  // Update renderer data when data changes OR when renderer becomes ready
  React.useEffect(() => {
    if (isRendererReady && rendererRef.current && data && data.nodes.length > 0) {
      rendererRef.current.setData(data)
    }
  }, [data, isRendererReady])

  // Empty State
  if (!isLoading && (!data || data.nodes.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <svg
          className="w-16 h-16 text-text-secondary/30 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <h3 className="text-lg font-medium text-text-secondary mb-2">No Connections Yet</h3>
        <p className="text-sm text-text-secondary/60 max-w-sm">
          Create notes and link them together using [[wikilinks]] to see your knowledge graph come
          alive.
        </p>
      </div>
    )
  }

  return <GraphCanvas rendererRef={rendererRef} config={config} onReady={handleRendererReady} />
}

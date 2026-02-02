import { useEffect, useRef, useCallback } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  Simulation
} from 'd3-force'
import type { GraphNode, GraphLink, GraphData, GraphConfig } from '../types'
import { calculateNodeRadius } from '../engine/utils'

interface UseGraphSimulationResult {
  restart: (alpha?: number) => void
  stop: () => void
  fixNode: (node: GraphNode, x: number, y: number) => void
  releaseNode: (node: GraphNode) => void
}

/**
 * Hook for managing D3-force simulation.
 * Calls onTick on each simulation tick to trigger re-render.
 */
export function useGraphSimulation(
  data: GraphData | null,
  config: GraphConfig,
  onTick: () => void
): UseGraphSimulationResult {
  const simulationRef = useRef<Simulation<GraphNode, GraphLink> | null>(null)

  useEffect(() => {
    if (!data || data.nodes.length === 0) {
      simulationRef.current?.stop()
      simulationRef.current = null
      return
    }

    const { physics, nodeSize } = config

    const simulation = forceSimulation<GraphNode>(data.nodes)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(data.links)
          .id((d) => d.id)
          .distance(physics.linkDistance)
          .strength(physics.linkStrength)
      )
      .force('charge', forceManyBody<GraphNode>().strength(physics.chargeStrength))
      .force('center', forceCenter(0, 0).strength(physics.centerStrength))
      .force(
        'collision',
        forceCollide<GraphNode>().radius(
          (d) => calculateNodeRadius(d.linkCount || 0, nodeSize) + physics.collisionPadding
        )
      )
      .alphaDecay(physics.alphaDecay)
      .velocityDecay(physics.velocityDecay)
      .on('tick', onTick)

    simulationRef.current = simulation

    return () => {
      simulation.stop()
    }
  }, [data, config, onTick])

  const restart = useCallback((alpha = 0.3) => {
    simulationRef.current?.alpha(alpha).restart()
  }, [])

  const stop = useCallback(() => {
    simulationRef.current?.stop()
  }, [])

  const fixNode = useCallback((node: GraphNode, x: number, y: number) => {
    node.fx = x
    node.fy = y
  }, [])

  const releaseNode = useCallback((node: GraphNode) => {
    node.fx = null
    node.fy = null
  }, [])

  return { restart, stop, fixNode, releaseNode }
}

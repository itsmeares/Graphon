import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import 'pixi.js/unsafe-eval' // Enable unsafe-eval support for Electron
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum
} from 'd3-force'

// =============================================================================
// TYPES
// =============================================================================

interface GraphNode extends SimulationNodeDatum {
  id: string
  title: string
  path: string
  group: string
  exists: boolean
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  linkCount?: number
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface GraphViewProps {
  isDarkMode: boolean
  onSelectNode: (nodeId: string) => void
}

// =============================================================================
// CONSTANTS
// =============================================================================

const NODE_RADIUS_MAX = 16
const NODE_RADIUS_BASE = 6
const LINK_WIDTH = 1
const LINK_WIDTH_HIGHLIGHT = 2

// Colors
const COLORS = {
  dark: {
    nodeReal: 0xffffff,
    nodeGhost: 0x666666,
    nodeHover: 0x8b5cf6, // Purple accent
    link: 0x444444,
    linkHighlight: 0x888888,
    text: 0xffffff,
    textBg: 0x1a1a1a
  },
  light: {
    nodeReal: 0x333333,
    nodeGhost: 0xaaaaaa,
    nodeHover: 0x7c3aed,
    link: 0xcccccc,
    linkHighlight: 0x888888,
    text: 0x000000,
    textBg: 0xffffff
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function GraphView({
  isDarkMode,
  onSelectNode
}: GraphViewProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const simulationRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null)
  const nodesRef = useRef<Map<string, PIXI.Container>>(new Map())
  const linksGraphicsRef = useRef<PIXI.Graphics | null>(null)
  const graphDataRef = useRef<GraphData>({ nodes: [], links: [] })
  const highlightedNodesRef = useRef<Set<string>>(new Set())

  const [isLoading, setIsLoading] = useState(true)
  const [hasNodes, setHasNodes] = useState(false)

  const colors = isDarkMode ? COLORS.dark : COLORS.light

  // Get neighbors for highlighting
  const getNeighbors = useCallback((nodeId: string, links: GraphLink[]): Set<string> => {
    const neighbors = new Set<string>([nodeId])
    for (const link of links) {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      if (sourceId === nodeId) neighbors.add(targetId)
      if (targetId === nodeId) neighbors.add(sourceId)
    }
    return neighbors
  }, [])

  // Calculate node radius based on link count
  const getNodeRadius = useCallback((node: GraphNode): number => {
    const linkCount = node.linkCount || 0
    const scale = Math.min(linkCount / 10, 1)
    return NODE_RADIUS_BASE + scale * (NODE_RADIUS_MAX - NODE_RADIUS_BASE)
  }, [])

  // Draw all links with optional highlighting (defined early for use in createNodeSprite)
  const drawLinksWithHighlight = useCallback(
    (highlighted: Set<string>) => {
      const graphics = linksGraphicsRef.current
      if (!graphics) return

      graphics.clear()

      for (const link of graphDataRef.current.links) {
        const source = link.source as GraphNode
        const target = link.target as GraphNode

        if (source.x === undefined || source.y === undefined) continue
        if (target.x === undefined || target.y === undefined) continue

        const isHighlighted = highlighted.has(source.id) && highlighted.has(target.id)
        const color = isHighlighted ? colors.linkHighlight : colors.link
        const width = isHighlighted ? LINK_WIDTH_HIGHLIGHT : LINK_WIDTH
        const alpha = isHighlighted ? 0.8 : 0.4

        graphics.moveTo(source.x, source.y)
        graphics.lineTo(target.x, target.y)
        graphics.stroke({ color, width, alpha })
      }
    },
    [colors]
  )

  // Create node sprite
  const createNodeSprite = useCallback(
    (node: GraphNode): PIXI.Container => {
      const container = new PIXI.Container()
      container.eventMode = 'static'
      container.cursor = 'pointer'

      const radius = getNodeRadius(node)

      // Node circle
      const circle = new PIXI.Graphics()
      const color = node.exists ? colors.nodeReal : colors.nodeGhost
      circle.circle(0, 0, radius)
      circle.fill({ color, alpha: node.exists ? 1 : 0.6 })
      container.addChild(circle)

      // Glow effect for real nodes in dark mode
      if (isDarkMode && node.exists) {
        const glow = new PIXI.Graphics()
        glow.circle(0, 0, radius * 2)
        glow.fill({ color: colors.nodeReal, alpha: 0.15 })
        container.addChildAt(glow, 0)
      }

      // Label (always visible)
      const label = new PIXI.Text({
        text: node.title,
        style: {
          fontSize: 11,
          fill: colors.text,
          fontFamily: 'Inter, system-ui, sans-serif'
        },
        resolution: 5 // Higher resolution for crisp text
      })
      label.anchor.set(0.5, 0)
      label.y = radius + 4
      label.label = 'label' // PIXI v8 uses label instead of name
      container.addChild(label)

      // Store node data
      ;(container as any).nodeData = node

      // Event handlers
      container.on('pointerover', () => {
        const neighbors = getNeighbors(node.id, graphDataRef.current.links)
        highlightedNodesRef.current = neighbors
        // Redraw links to show highlighting
        if (linksGraphicsRef.current) {
          drawLinksWithHighlight(highlightedNodesRef.current)
        }
      })

      container.on('pointerout', () => {
        highlightedNodesRef.current = new Set()
        // Redraw links to hide highlighting
        if (linksGraphicsRef.current) {
          drawLinksWithHighlight(highlightedNodesRef.current)
        }
      })

      container.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        // Start drag
        ;(container as any).dragging = true
        ;(container as any).dragData = e
        ;(container as any).dragStartTime = Date.now()
        node.fx = node.x
        node.fy = node.y
      })

      container.on('pointerup', () => {
        // Always stop dragging on pointerup
        ;(container as any).dragging = false

        const dragStartTime = (container as any).dragStartTime || 0
        const dragDuration = Date.now() - dragStartTime
        // If it was a quick tap (not a drag), treat as click
        if (dragDuration < 200) {
          if (node.exists && node.path) {
            onSelectNode(node.path)
          } else if (!node.exists) {
            onSelectNode(`create:${node.title}`)
          } else {
            // Fallback: try to find file by title
            onSelectNode(node.title)
          }
        }
      })

      return container
    },
    [colors, isDarkMode, getNodeRadius, getNeighbors, onSelectNode, drawLinksWithHighlight]
  )

  // Draw links without highlighting (for simulation tick)
  const drawLinks = useCallback(() => {
    drawLinksWithHighlight(highlightedNodesRef.current)
  }, [drawLinksWithHighlight])

  // Update node positions from simulation
  const updatePositions = useCallback(() => {
    for (const node of graphDataRef.current.nodes) {
      const sprite = nodesRef.current.get(node.id)
      if (sprite && node.x !== undefined && node.y !== undefined) {
        sprite.x = node.x
        sprite.y = node.y
      }
    }
    drawLinks()
  }, [drawLinks])

  // Initialize PIXI and simulation
  const initGraph = useCallback(
    async (data: GraphData) => {
      if (!containerRef.current) return

      // Cleanup previous - wrap in try-catch for PIXI v8 compatibility
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true })
        } catch {
          // Ignore cleanup errors
        }
        appRef.current = null
      }
      if (simulationRef.current) {
        simulationRef.current.stop()
        simulationRef.current = null
      }
      nodesRef.current.clear()

      const { width, height } = containerRef.current.getBoundingClientRect()
      if (width === 0 || height === 0) return

      // Create PIXI Application
      const app = new PIXI.Application()
      await app.init({
        width,
        height,
        background: 0x000000,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        clearBeforeRender: true
      })
      // Style canvas to prevent flash
      const canvas = app.canvas as HTMLCanvasElement
      canvas.style.background = 'transparent'
      containerRef.current.appendChild(canvas)
      appRef.current = app

      // Create main container for pan/zoom
      const viewport = new PIXI.Container()
      viewport.x = width / 2
      viewport.y = height / 2
      app.stage.addChild(viewport)

      // Links layer (behind nodes)
      const linksGraphics = new PIXI.Graphics()
      viewport.addChild(linksGraphics)
      linksGraphicsRef.current = linksGraphics

      // Nodes layer
      const nodesContainer = new PIXI.Container()
      viewport.addChild(nodesContainer)

      // Calculate link counts
      const linkCounts = new Map<string, number>()
      for (const link of data.links) {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id
        const targetId = typeof link.target === 'string' ? link.target : link.target.id
        linkCounts.set(sourceId, (linkCounts.get(sourceId) || 0) + 1)
        linkCounts.set(targetId, (linkCounts.get(targetId) || 0) + 1)
      }

      // Create node sprites
      for (const node of data.nodes) {
        node.linkCount = linkCounts.get(node.id) || 0
        const sprite = createNodeSprite(node)
        nodesContainer.addChild(sprite)
        nodesRef.current.set(node.id, sprite)
      }

      graphDataRef.current = data

      // Create d3 force simulation
      const simulation = forceSimulation<GraphNode>(data.nodes)
        .force(
          'link',
          forceLink<GraphNode, GraphLink>(data.links)
            .id((d) => d.id)
            .distance(100)
            .strength(0.5)
        )
        .force('charge', forceManyBody<GraphNode>().strength(-200))
        .force('center', forceCenter(0, 0).strength(0.05))
        .force(
          'collision',
          forceCollide<GraphNode>().radius((d) => getNodeRadius(d) + 10)
        )
        .alphaDecay(0.01)
        .velocityDecay(0.3)
        .on('tick', updatePositions)

      simulationRef.current = simulation

      // Drag handling
      app.stage.eventMode = 'static'
      app.stage.hitArea = app.screen

      const onDragMove = (e: PIXI.FederatedPointerEvent): void => {
        for (const [, sprite] of nodesRef.current) {
          if ((sprite as any).dragging) {
            const node = (sprite as any).nodeData as GraphNode
            const globalPos = e.global
            const localPos = viewport.toLocal(globalPos)
            node.fx = localPos.x
            node.fy = localPos.y
            sprite.x = localPos.x
            sprite.y = localPos.y
            simulation.alpha(0.3).restart()
          }
        }
      }

      const onDragEnd = (): void => {
        for (const [, sprite] of nodesRef.current) {
          if ((sprite as any).dragging) {
            ;(sprite as any).dragging = false
            // Node position stays fixed after drag (like Obsidian)
          }
        }
      }

      app.stage.on('pointermove', onDragMove)
      app.stage.on('pointerup', onDragEnd)
      app.stage.on('pointerupoutside', onDragEnd)

      // Zoom handling
      let scale = 1
      ;(app.canvas as HTMLCanvasElement).addEventListener('wheel', (e) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        scale = Math.max(0.1, Math.min(5, scale * delta))
        viewport.scale.set(scale)
      })

      // Pan handling
      let isPanning = false
      let panStart = { x: 0, y: 0 }

      app.stage.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        // Only pan if clicking on stage, not on node
        if (e.target === app.stage) {
          isPanning = true
          panStart = { x: e.global.x - viewport.x, y: e.global.y - viewport.y }
        }
      })

      app.stage.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
        if (isPanning) {
          viewport.x = e.global.x - panStart.x
          viewport.y = e.global.y - panStart.y
        }
      })

      app.stage.on('pointerup', () => {
        isPanning = false
      })

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: newWidth, height: newHeight } = entry.contentRect
          if (newWidth > 0 && newHeight > 0) {
            app.renderer.resize(newWidth, newHeight)
            viewport.x = newWidth / 2
            viewport.y = newHeight / 2
          }
        }
      })
      resizeObserver.observe(containerRef.current)

      // Store cleanup function
      ;(app as any).cleanup = () => {
        resizeObserver.disconnect()
        simulation.stop()
      }
    },
    [createNodeSprite, getNodeRadius, updatePositions]
  )

  // Fetch graph data
  useEffect(() => {
    let mounted = true

    const fetchData = async (): Promise<void> => {
      try {
        setIsLoading(true)
        const data = await window.api.getGraphData()
        if (!mounted) return

        setHasNodes(data.nodes.length > 0)
        if (data.nodes.length > 0) {
          await initGraph(data as GraphData)
        }
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch graph data:', error)
        setIsLoading(false)
      }
    }

    fetchData()

    // Listen for vault updates
    const unsubscribe = window.api.onVaultIndexUpdated(() => {
      fetchData()
    })

    return () => {
      mounted = false
      unsubscribe()
      if (appRef.current) {
        try {
          ;(appRef.current as any).cleanup?.()
          appRef.current.destroy(true, { children: true })
        } catch {
          // Ignore cleanup errors
        }
      }
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount, initGraph is stable via useCallback

  // Empty state
  if (!isLoading && !hasNodes) {
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-0"
      style={{ touchAction: 'none', background: 'transparent' }}
    />
  )
}

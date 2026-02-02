import * as PIXI from 'pixi.js'
import 'pixi.js/unsafe-eval'
import type { GraphNode, GraphData, GraphConfig, GraphRendererCallbacks } from '../types'
import { calculateNodeRadius, getNeighbors } from './utils'
import { CLICK_THRESHOLD_MS } from '../constants'

/**
 * GraphRenderer encapsulates all PIXI.js rendering logic.
 * This class is React-agnostic and can be tested independently.
 */
export class GraphRenderer {
  private app: PIXI.Application | null = null
  private viewport: PIXI.Container | null = null
  private nodesContainer: PIXI.Container | null = null
  private linksGraphics: PIXI.Graphics | null = null
  private nodeSprites: Map<string, PIXI.Container> = new Map()
  private resizeObserver: ResizeObserver | null = null
  private container: HTMLElement | null = null

  private config: GraphConfig
  private callbacks: GraphRendererCallbacks = {}
  private graphData: GraphData = { nodes: [], links: [] }
  private highlightedNodes: Set<string> = new Set()

  // Zoom/pan state
  private scale = 1
  private isPanning = false
  private panStart = { x: 0, y: 0 }

  constructor(config: GraphConfig) {
    this.config = config
  }

  /**
   * Update configuration (e.g., on theme change).
   */
  setConfig(config: GraphConfig): void {
    this.config = config
    // Re-render nodes with new colors
    this.rebuildNodes()
    this.drawLinks()
  }

  /**
   * Set callback handlers for interactions.
   */
  setCallbacks(callbacks: GraphRendererCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * Initialize PIXI application and attach to container.
   */
  async init(container: HTMLElement): Promise<void> {
    this.container = container

    const { width, height } = container.getBoundingClientRect()
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

    const canvas = app.canvas as HTMLCanvasElement
    canvas.style.background = 'transparent'
    container.appendChild(canvas)
    this.app = app

    // Create viewport for pan/zoom
    const viewport = new PIXI.Container()
    viewport.x = width / 2
    viewport.y = height / 2
    app.stage.addChild(viewport)
    this.viewport = viewport

    // Links layer (behind nodes)
    const linksGraphics = new PIXI.Graphics()
    viewport.addChild(linksGraphics)
    this.linksGraphics = linksGraphics

    // Nodes layer
    const nodesContainer = new PIXI.Container()
    viewport.addChild(nodesContainer)
    this.nodesContainer = nodesContainer

    // Setup stage-level event handling
    this.setupStageEvents()

    // Setup zoom
    this.setupZoom()

    // Setup resize observer
    this.setupResizeObserver()
  }

  /**
   * Set the graph data and create sprites.
   */
  setData(data: GraphData): void {
    this.graphData = data
    this.rebuildNodes()
    this.drawLinks()
  }

  /**
   * Update node positions from simulation tick.
   */
  updatePositions(): void {
    for (const node of this.graphData.nodes) {
      const sprite = this.nodeSprites.get(node.id)
      if (sprite && node.x !== undefined && node.y !== undefined) {
        sprite.x = node.x
        sprite.y = node.y
      }
    }
    this.drawLinks()
  }

  /**
   * Draw all links with optional highlighting.
   */
  drawLinks(): void {
    const graphics = this.linksGraphics
    if (!graphics) return

    graphics.clear()

    const { linkStyle, colors } = this.config

    for (const link of this.graphData.links) {
      const source = link.source as GraphNode
      const target = link.target as GraphNode

      if (source.x === undefined || source.y === undefined) continue
      if (target.x === undefined || target.y === undefined) continue

      const isHighlighted =
        this.highlightedNodes.has(source.id) && this.highlightedNodes.has(target.id)
      const color = isHighlighted ? colors.linkHighlight : colors.link
      const width = isHighlighted ? linkStyle.widthHighlight : linkStyle.widthNormal
      const alpha = isHighlighted ? linkStyle.alphaHighlight : linkStyle.alphaNormal

      graphics.moveTo(source.x, source.y)
      graphics.lineTo(target.x, target.y)
      graphics.stroke({ color, width, alpha })
    }
  }

  /**
   * Set highlighted nodes for link highlighting.
   */
  setHighlightedNodes(nodeIds: Set<string>): void {
    this.highlightedNodes = nodeIds
    this.drawLinks()
  }

  /**
   * Resize the renderer to fit container.
   */
  resize(width: number, height: number): void {
    if (!this.app || !this.viewport) return

    this.app.renderer.resize(width, height)
    this.viewport.x = width / 2
    this.viewport.y = height / 2
  }

  /**
   * Clean up and destroy the renderer.
   */
  destroy(): void {
    this.resizeObserver?.disconnect()
    this.nodeSprites.clear()

    if (this.app) {
      try {
        this.app.destroy(true, { children: true })
      } catch {
        // Ignore cleanup errors
      }
    }

    this.app = null
    this.viewport = null
    this.nodesContainer = null
    this.linksGraphics = null
    this.container = null
  }

  /**
   * Get nodes for external use (e.g., simulation).
   */
  getNodes(): GraphNode[] {
    return this.graphData.nodes
  }

  /**
   * Convert global coordinates to viewport local coordinates.
   */
  toLocal(globalX: number, globalY: number): { x: number; y: number } {
    if (!this.viewport) return { x: globalX, y: globalY }
    const point = this.viewport.toLocal({ x: globalX, y: globalY })
    return { x: point.x, y: point.y }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private rebuildNodes(): void {
    if (!this.nodesContainer) return

    // Clear existing
    this.nodesContainer.removeChildren()
    this.nodeSprites.clear()

    // Create new sprites
    for (const node of this.graphData.nodes) {
      const sprite = this.createNodeSprite(node)
      this.nodesContainer.addChild(sprite)
      this.nodeSprites.set(node.id, sprite)
    }
  }

  private createNodeSprite(node: GraphNode): PIXI.Container {
    const container = new PIXI.Container()
    container.eventMode = 'static'
    container.cursor = 'pointer'

    const { colors, nodeSize } = this.config
    const radius = calculateNodeRadius(node.linkCount || 0, nodeSize)

    // Node circle
    const circle = new PIXI.Graphics()
    const color = node.exists ? colors.nodeReal : colors.nodeGhost
    circle.circle(0, 0, radius)
    circle.fill({ color, alpha: node.exists ? 1 : 0.6 })
    container.addChild(circle)

    // Glow effect for real nodes in dark mode
    if (colors.nodeReal === 0xffffff && node.exists) {
      const glow = new PIXI.Graphics()
      glow.circle(0, 0, radius * 2)
      glow.fill({ color: colors.nodeReal, alpha: 0.15 })
      container.addChildAt(glow, 0)
    }

    // Label
    const label = new PIXI.Text({
      text: node.title,
      style: {
        fontSize: nodeSize.labelFontSize,
        fill: colors.text,
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      resolution: 5
    })
    label.anchor.set(0.5, 0)
    label.y = radius + nodeSize.labelOffset
    label.label = 'label'
    container.addChild(label)

    // Store node data for event handlers
    ;(container as any).nodeData = node

    // Event handlers
    this.setupNodeEvents(container, node)

    // Set initial position
    if (node.x !== undefined && node.y !== undefined) {
      container.x = node.x
      container.y = node.y
    }

    return container
  }

  private setupNodeEvents(container: PIXI.Container, node: GraphNode): void {
    container.on('pointerover', () => {
      const neighbors = getNeighbors(node.id, this.graphData.links)
      this.setHighlightedNodes(neighbors)
      this.callbacks.onNodeHover?.(node.id, neighbors)
    })

    container.on('pointerout', () => {
      this.setHighlightedNodes(new Set())
      this.callbacks.onNodeHoverEnd?.()
    })

    container.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation()
      ;(container as any).dragging = true
      ;(container as any).dragStartTime = Date.now()
      node.fx = node.x
      node.fy = node.y
      this.callbacks.onNodeDragStart?.(node)
    })

    container.on('pointerup', () => {
      ;(container as any).dragging = false

      const dragStartTime = (container as any).dragStartTime || 0
      const dragDuration = Date.now() - dragStartTime

      if (dragDuration < CLICK_THRESHOLD_MS) {
        this.callbacks.onNodeClick?.(node)
      }

      this.callbacks.onNodeDragEnd?.(node)
    })
  }

  private setupStageEvents(): void {
    if (!this.app || !this.viewport) return

    const app = this.app
    const viewport = this.viewport

    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen

    // Drag move
    app.stage.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
      // Check for node dragging
      for (const [, sprite] of this.nodeSprites) {
        if ((sprite as any).dragging) {
          const node = (sprite as any).nodeData as GraphNode
          const localPos = this.toLocal(e.global.x, e.global.y)
          node.fx = localPos.x
          node.fy = localPos.y
          sprite.x = localPos.x
          sprite.y = localPos.y
          this.callbacks.onNodeDrag?.(node, localPos.x, localPos.y)
        }
      }

      // Pan handling
      if (this.isPanning) {
        viewport.x = e.global.x - this.panStart.x
        viewport.y = e.global.y - this.panStart.y
      }
    })

    // Drag end (global)
    const onDragEnd = (): void => {
      for (const [, sprite] of this.nodeSprites) {
        if ((sprite as any).dragging) {
          ;(sprite as any).dragging = false
        }
      }
      this.isPanning = false
    }

    app.stage.on('pointerup', onDragEnd)
    app.stage.on('pointerupoutside', onDragEnd)

    // Pan start (only on background)
    app.stage.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      if (e.target === app.stage) {
        this.isPanning = true
        this.panStart = {
          x: e.global.x - viewport.x,
          y: e.global.y - viewport.y
        }
        this.callbacks.onBackgroundClick?.()
      }
    })
  }

  private setupZoom(): void {
    if (!this.app || !this.viewport) return

    const viewport = this.viewport
    const canvas = this.app.canvas as HTMLCanvasElement

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      this.scale = Math.max(0.1, Math.min(5, this.scale * delta))
      viewport.scale.set(this.scale)
    })
  }

  private setupResizeObserver(): void {
    if (!this.container) return

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          this.resize(width, height)
        }
      }
    })

    this.resizeObserver.observe(this.container)
  }
}

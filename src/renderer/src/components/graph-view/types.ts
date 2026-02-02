import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'

// =============================================================================
// GRAPH DATA TYPES
// =============================================================================

/**
 * A node in the graph, extending D3's SimulationNodeDatum for physics simulation.
 */
export interface GraphNode extends SimulationNodeDatum {
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

/**
 * A link between two nodes in the graph.
 */
export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

/**
 * The complete graph data structure returned from the API.
 */
export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for the main GraphView component.
 */
export interface GraphViewProps {
  isDarkMode: boolean
  onSelectNode: (nodeId: string) => void
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Color palette for a single theme.
 */
export interface ThemeColors {
  nodeReal: number
  nodeGhost: number
  nodeHover: number
  link: number
  linkHighlight: number
  text: number
  textBg: number
}

/**
 * Physics simulation configuration.
 */
export interface PhysicsConfig {
  linkDistance: number
  linkStrength: number
  chargeStrength: number
  centerStrength: number
  collisionPadding: number
  alphaDecay: number
  velocityDecay: number
}

/**
 * Node sizing configuration.
 */
export interface NodeSizeConfig {
  radiusBase: number
  radiusMax: number
  labelFontSize: number
  labelOffset: number
}

/**
 * Link styling configuration.
 */
export interface LinkStyleConfig {
  widthNormal: number
  widthHighlight: number
  alphaNormal: number
  alphaHighlight: number
}

/**
 * Complete graph configuration combining all settings.
 */
export interface GraphConfig {
  colors: ThemeColors
  physics: PhysicsConfig
  nodeSize: NodeSizeConfig
  linkStyle: LinkStyleConfig
}

// =============================================================================
// RENDERER CALLBACKS
// =============================================================================

/**
 * Callback handlers for graph interactions.
 */
export interface GraphRendererCallbacks {
  onNodeClick?: (node: GraphNode) => void
  onNodeHover?: (nodeId: string, neighbors: Set<string>) => void
  onNodeHoverEnd?: () => void
  onNodeDragStart?: (node: GraphNode) => void
  onNodeDrag?: (node: GraphNode, x: number, y: number) => void
  onNodeDragEnd?: (node: GraphNode) => void
  onBackgroundClick?: () => void
}

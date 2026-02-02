import type {
  ThemeColors,
  PhysicsConfig,
  NodeSizeConfig,
  LinkStyleConfig,
  GraphConfig
} from './types'

// =============================================================================
// THEME COLORS
// =============================================================================

export const COLORS_DARK: ThemeColors = {
  nodeReal: 0xffffff,
  nodeGhost: 0x666666,
  nodeHover: 0x8b5cf6, // Purple accent
  link: 0x444444,
  linkHighlight: 0x888888,
  text: 0xffffff,
  textBg: 0x1a1a1a
}

export const COLORS_LIGHT: ThemeColors = {
  nodeReal: 0x333333,
  nodeGhost: 0xaaaaaa,
  nodeHover: 0x7c3aed,
  link: 0xcccccc,
  linkHighlight: 0x888888,
  text: 0x000000,
  textBg: 0xffffff
}

// =============================================================================
// PHYSICS CONFIGURATION
// =============================================================================

export const DEFAULT_PHYSICS: PhysicsConfig = {
  linkDistance: 100,
  linkStrength: 0.5,
  chargeStrength: -200,
  centerStrength: 0.05,
  collisionPadding: 10,
  alphaDecay: 0.01,
  velocityDecay: 0.3
}

// =============================================================================
// NODE SIZING
// =============================================================================

export const DEFAULT_NODE_SIZE: NodeSizeConfig = {
  radiusBase: 6,
  radiusMax: 16,
  labelFontSize: 11,
  labelOffset: 4
}

// =============================================================================
// LINK STYLING
// =============================================================================

export const DEFAULT_LINK_STYLE: LinkStyleConfig = {
  widthNormal: 1,
  widthHighlight: 2,
  alphaNormal: 0.4,
  alphaHighlight: 0.8
}

// =============================================================================
// CONFIG FACTORIES
// =============================================================================

/**
 * Creates a complete GraphConfig for the given theme.
 */
export function createGraphConfig(isDarkMode: boolean): GraphConfig {
  return {
    colors: isDarkMode ? COLORS_DARK : COLORS_LIGHT,
    physics: DEFAULT_PHYSICS,
    nodeSize: DEFAULT_NODE_SIZE,
    linkStyle: DEFAULT_LINK_STYLE
  }
}

// =============================================================================
// ZOOM/PAN LIMITS
// =============================================================================

export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 5
export const ZOOM_FACTOR = 0.1

// =============================================================================
// TIMING
// =============================================================================

/** Maximum duration (ms) for a pointer down/up to be considered a click vs drag */
export const CLICK_THRESHOLD_MS = 200

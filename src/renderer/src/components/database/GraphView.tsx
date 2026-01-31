import { useEffect, useState, useRef, useCallback } from 'react'
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d'

interface GraphNode {
  id: string
  title: string
  group: string
  x?: number
  y?: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface GraphViewProps {
  onSelectNode?: (nodeId: string) => void
  isDarkMode?: boolean
}

export default function GraphView({ onSelectNode, isDarkMode = false }: GraphViewProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods<GraphNode> | undefined>(undefined)

  // Fetch graph data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await window.api.getGraphData()
        setGraphData(data)
      } catch (error) {
        console.error('Failed to fetch graph data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Listen for vault index updates to refresh graph
    const unsubscribe = window.api.onVaultIndexUpdated(() => {
      fetchData()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        })
      }
    }

    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Handle node click
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (onSelectNode && node.id) {
        onSelectNode(node.id)
      }
    },
    [onSelectNode]
  )

  // Generate colors for groups
  const getGroupColor = useCallback(
    (group: string) => {
      const colors = isDarkMode
        ? [
            '#60A5FA', // blue-400
            '#A78BFA', // violet-400
            '#F472B6', // pink-400
            '#FBBF24', // amber-400
            '#34D399', // emerald-400
            '#FB923C', // orange-400
            '#4ADE80', // green-400
            '#F87171' // red-400
          ]
        : [
            '#2563EB', // blue-600
            '#7C3AED', // violet-600
            '#DB2777', // pink-600
            '#D97706', // amber-600
            '#059669', // emerald-600
            '#EA580C', // orange-600
            '#16A34A', // green-600
            '#DC2626' // red-600
          ]

      let hash = 0
      for (let i = 0; i < group.length; i++) {
        hash = group.charCodeAt(i) + ((hash << 5) - hash)
      }
      return colors[Math.abs(hash) % colors.length]
    },
    [isDarkMode]
  )

  // Node paint function with labels
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.title
      const fontSize = 12 / globalScale
      ctx.font = `${fontSize}px Inter, sans-serif`

      const x = node.x || 0
      const y = node.y || 0

      // Node circle
      const nodeRadius = 6
      ctx.beginPath()
      ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI)
      ctx.fillStyle = getGroupColor(node.group)
      ctx.fill()

      // Node border
      ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Label (only show when zoomed in enough)
      if (globalScale > 0.8) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = isDarkMode ? '#E5E5E5' : '#404040'
        ctx.fillText(label, x, y + nodeRadius + 2)
      }
    },
    [getGroupColor, isDarkMode]
  )

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Loading graph...</p>
        </div>
      </div>
    )
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-8">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-neutral-400 dark:text-neutral-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="5" cy="12" r="3" />
              <circle cx="19" cy="5" r="3" />
              <circle cx="19" cy="19" r="3" />
              <line x1="7.5" y1="10.5" x2="16.5" y2="6.5" />
              <line x1="7.5" y1="13.5" x2="16.5" y2="17.5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            No connections yet
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
            Start linking your notes using [[wikilinks]] to see your knowledge graph come to life.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 h-full overflow-hidden">
      <ForceGraph2D
        ref={graphRef as any}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeId="id"
        nodeLabel="title"
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node: GraphNode, color, ctx) => {
          const x = node.x || 0
          const y = node.y || 0
          ctx.beginPath()
          ctx.arc(x, y, 8, 0, 2 * Math.PI)
          ctx.fillStyle = color
          ctx.fill()
        }}
        onNodeClick={handleNodeClick as any}
        linkColor={() => (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)')}
        linkWidth={1}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={() =>
          isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)'
        }
        backgroundColor="transparent"
        cooldownTicks={100}
        onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
      />
    </div>
  )
}

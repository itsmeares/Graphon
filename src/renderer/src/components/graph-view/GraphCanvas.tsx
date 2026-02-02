import React, { useEffect, useRef } from 'react'
import type { GraphConfig } from './types'
import { GraphRenderer } from './engine/GraphRenderer'

interface GraphCanvasProps {
  rendererRef: React.MutableRefObject<GraphRenderer | null>
  config: GraphConfig
  onReady?: () => void
}

/**
 * GraphCanvas manages the PIXI canvas container and GraphRenderer lifecycle.
 * This component is responsible for initializing and destroying the renderer.
 */
export function GraphCanvas({
  rendererRef,
  config,
  onReady
}: GraphCanvasProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return

    let mounted = true

    const initRenderer = async (): Promise<void> => {
      if (!containerRef.current) return

      const renderer = new GraphRenderer(config)
      await renderer.init(containerRef.current)

      if (!mounted) {
        renderer.destroy()
        return
      }

      rendererRef.current = renderer
      initializedRef.current = true
      onReady?.()
    }

    initRenderer()

    return () => {
      mounted = false
      rendererRef.current?.destroy()
      rendererRef.current = null
      initializedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Update config when theme changes
  useEffect(() => {
    if (rendererRef.current && initializedRef.current) {
      rendererRef.current.setConfig(config)
    }
  }, [config, rendererRef])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-0"
      style={{ touchAction: 'none', background: 'transparent' }}
    />
  )
}

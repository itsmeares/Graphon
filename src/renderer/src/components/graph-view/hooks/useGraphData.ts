import { useEffect, useState, useCallback } from 'react'
import type { GraphData } from '../types'
import { enrichNodesWithLinkCounts } from '../engine/utils'

interface UseGraphDataResult {
  data: GraphData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching and managing graph data from the API.
 * Automatically subscribes to vault index updates.
 */
export function useGraphData(): UseGraphDataResult {
  const [data, setData] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const rawData = await window.api.getGraphData()

      // Enrich nodes with link counts for sizing
      const enrichedNodes = enrichNodesWithLinkCounts(rawData.nodes, rawData.links)

      setData({
        nodes: enrichedNodes,
        links: rawData.links
      })
    } catch (err) {
      console.error('Failed to fetch graph data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch graph data'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const loadData = async (): Promise<void> => {
      if (!mounted) return
      await fetchData()
    }

    loadData()

    // Subscribe to vault updates
    const unsubscribe = window.api.onVaultIndexUpdated(() => {
      if (mounted) {
        fetchData()
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

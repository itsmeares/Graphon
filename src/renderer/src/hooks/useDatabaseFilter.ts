import { useMemo } from 'react'
import { Item, ViewConfig, Column, FilterConfig } from '../types'

export const useDatabaseFilter = (items: Item[], config: ViewConfig, columns: Column[]) => {
  return useMemo(() => {
    let processedItems = [...items]

    // 1. Filtering
    if (config.filter && config.filter.length > 0) {
      processedItems = processedItems.filter((item) => {
        // AND logic: Item must match ALL filters
        return config.filter!.every((filter: FilterConfig) => {
          const column = columns.find((c) => c.id === filter.columnId)
          if (!column) return true // Skip invalid filters

          // Special handling for "Title" which is at item level in types but mapped to values usually?
          // In the current architecture: values: Record<string, any>. Title is usually in values.
          // Let's assume values[columnId] is the source of truth.
          const value = item.values[filter.columnId]

          switch (filter.operator) {
            case 'isEmpty':
              return (
                value === undefined ||
                value === null ||
                value === '' ||
                (Array.isArray(value) && value.length === 0)
              )

            case 'equals':
              // Simple equality check. For arrays (multi-select), check if it includes
              if (Array.isArray(value)) {
                return value.includes(filter.value)
              }
              return String(value).toLowerCase() === String(filter.value).toLowerCase()

            case 'contains':
              if (value === undefined || value === null) return false
              return String(value).toLowerCase().includes(filter.value.toLowerCase())

            default:
              return true
          }
        })
      })
    }

    // 2. Sorting
    if (config.sort) {
      const { columnId, direction } = config.sort
      const column = columns.find((c) => c.id === columnId)

      processedItems.sort((a, b) => {
        let valA = a.values[columnId]
        let valB = b.values[columnId]

        // Handle title specifically if it's not in values (though `createDefaultDatabase` puts it there)
        if (columnId === 'title' && !valA) valA = 'Untitled'
        if (columnId === 'title' && !valB) valB = 'Untitled'

        if (valA === valB) return 0
        if (valA === undefined || valA === null) return 1
        if (valB === undefined || valB === null) return -1

        let comparison = 0

        // Type-specific sorting
        if (column?.type === 'number') {
          comparison = Number(valA) - Number(valB)
        } else if (column?.type === 'date') {
          comparison = new Date(valA).getTime() - new Date(valB).getTime()
        } else {
          // Default string comparison
          comparison = String(valA).localeCompare(String(valB))
        }

        return direction === 'asc' ? comparison : -comparison
      })
    }

    return processedItems
  }, [items, config, columns])
}

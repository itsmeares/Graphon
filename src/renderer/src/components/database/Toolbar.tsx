import { useState, useRef, useEffect } from 'react'
import {
  FunnelIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  ChevronDownIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { ViewConfig, Database, SortConfig, FilterConfig } from '../../types'
import { AnimatePresence, motion } from 'framer-motion'
import ViewSwitcher from './ViewSwitcher'

interface ToolbarProps {
  database: Database
  views: ViewConfig[]
  viewConfig: ViewConfig
  onViewConfigChange: (config: ViewConfig) => void
  onAddView: (type: any) => void
  onCurrentViewChange: (id: string) => void
  onAddItem: () => void
}

export default function Toolbar({
  database,
  views,
  viewConfig,
  onViewConfigChange,
  onAddView,
  onCurrentViewChange,
  onAddItem
}: ToolbarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortMenu(false)
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSortChange = (columnId: string) => {
    const currentSort = viewConfig.sort
    let newSort: SortConfig | null = null

    if (currentSort?.columnId === columnId) {
      // Toggle direction or remove if already desc (optional, but standard behavior usually toggles)
      if (currentSort.direction === 'asc') {
        newSort = { columnId, direction: 'desc' }
      } else {
        newSort = null // Toggle off on third click? Or just switch back to asc? Let's do null for "unsort"
      }
    } else {
      newSort = { columnId, direction: 'asc' }
    }

    onViewConfigChange({ ...viewConfig, sort: newSort })
  }

  const handleAddFilter = (columnId: string) => {
    const newFilter: FilterConfig = {
      columnId,
      operator: 'contains',
      value: ''
    }
    // Only support one filter for now for simplicity/UI, or add to array
    // Request mentioned "Filter button: Open a simple filter pop-up".
    // I will append to array.
    const currentFilters = viewConfig.filter || []
    onViewConfigChange({ ...viewConfig, filter: [...currentFilters, newFilter] })
  }

  const handleUpdateFilter = (index: number, updates: Partial<FilterConfig>) => {
    const currentFilters = viewConfig.filter || []
    const newFilters = [...currentFilters]
    newFilters[index] = { ...newFilters[index], ...updates }
    onViewConfigChange({ ...viewConfig, filter: newFilters })
  }

  const handleRemoveFilter = (index: number) => {
    const currentFilters = viewConfig.filter || []
    const newFilters = currentFilters.filter((_, i) => i !== index)
    onViewConfigChange({ ...viewConfig, filter: newFilters })
  }

  return (
    <div className="shrink-0 flex items-center justify-between px-8 py-2 border-b border-black/5 dark:border-white/5 relative z-20">
      <div className="flex items-center flex-1 min-w-0">
        <ViewSwitcher
          views={views}
          currentViewId={viewConfig.id}
          onViewChange={onCurrentViewChange}
          onAddView={onAddView}
        />
      </div>

      <div className="flex items-center gap-1 ml-4">
        {/* FILTER BUTTON & MENU */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`p-1.5 rounded-md btn-squish flex items-center gap-2 text-sm ${
              (viewConfig.filter?.length || 0) > 0
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            {(viewConfig.filter?.length || 0) > 0 && <span>Filter</span>}
          </button>

          <AnimatePresence>
            {showFilterMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl border border-black/10 dark:border-white/10 p-3 flex flex-col gap-3"
              >
                <div className="text-xs font-semibold text-gray-500 uppercase">Filters</div>

                {(!viewConfig.filter || viewConfig.filter.length === 0) && (
                  <div className="text-sm text-gray-400 italic px-2">No filters applied</div>
                )}

                {viewConfig.filter?.map((filter, index) => {
                  const colName =
                    database.columns.find((c) => c.id === filter.columnId)?.name || 'Unknown'

                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-2 p-2 bg-gray-50 dark:bg-white/5 rounded-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{colName}</span>
                        <button
                          onClick={() => handleRemoveFilter(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          className="text-xs p-1 rounded border border-gray-200 dark:border-white/10 dark:bg-[#2a2a2a]"
                          value={filter.operator}
                          onChange={(e) =>
                            handleUpdateFilter(index, { operator: e.target.value as any })
                          }
                        >
                          <option value="contains">Contains</option>
                          <option value="equals">Equals</option>
                          <option value="isEmpty">Is Empty</option>
                        </select>
                        {filter.operator !== 'isEmpty' && (
                          <input
                            type="text"
                            className="text-xs p-1 flex-1 rounded border border-gray-200 dark:border-white/10 dark:bg-[#2a2a2a]"
                            placeholder="Value..."
                            value={filter.value}
                            onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />

                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400 px-2">Add filter for:</span>
                  <div className="flex flex-wrap gap-1">
                    {database.columns.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => handleAddFilter(col.id)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
                      >
                        {col.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SORT BUTTON & MENU */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className={`p-1.5 rounded-md btn-squish flex items-center gap-2 text-sm ${
              viewConfig.sort
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <ArrowsUpDownIcon className="w-4 h-4" />
            {viewConfig.sort && <span>Sort</span>}
          </button>

          <AnimatePresence>
            {showSortMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl border border-black/10 dark:border-white/10 overflow-hidden py-1"
              >
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100 dark:border-white/5">
                  Sort by
                </div>
                {database.columns.map((column) => {
                  const isSorted = viewConfig.sort?.columnId === column.id
                  return (
                    <button
                      key={column.id}
                      onClick={() => handleSortChange(column.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between"
                    >
                      <span>{column.name}</span>
                      {isSorted && (
                        <span className="text-xs text-blue-500 font-medium flex items-center gap-1">
                          {viewConfig.sort?.direction === 'asc' ? 'Asc' : 'Desc'}
                          <CheckIcon className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="p-1.5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-md btn-squish">
          <MagnifyingGlassIcon className="w-4 h-4" />
        </button>
        <button className="p-1.5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-md btn-squish mr-2">
          <EllipsisHorizontalIcon className="w-4 h-4" />
        </button>

        <div className="flex items-center">
          <button
            onClick={onAddItem}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#2383e2] hover:bg-[#0070e0] text-white text-[13px] font-semibold rounded-l-md transition-colors active:scale-95"
          >
            New
          </button>
          <button className="px-1 py-1.5 bg-[#2383e2] hover:bg-[#0070e0] text-white rounded-r-md border-l border-white/20 transition-colors active:scale-95">
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

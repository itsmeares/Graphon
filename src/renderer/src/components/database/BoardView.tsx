import { memo, useState, useCallback } from 'react'
import { PlusIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import type { Database, Item, ViewConfig, Column } from '../../types'

import { DocumentIcon } from '@heroicons/react/24/outline'

interface BoardViewProps {
  database: Database
  viewConfig: ViewConfig
  items: Item[]
  onUpdateItem: (item: Item) => void
  onDeleteItem: (itemId: string) => void
  onAddItem: (initialValues?: Record<string, any>) => void
  onItemClick?: (item: Item) => void
}

// Memoized Board Card
const BoardCard = memo(function BoardCard({
  item,
  columns,
  onDelete,
  onClick
}: {
  item: Item
  columns: Column[]
  onDelete: () => void
  onClick?: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const title = item.values['title'] || 'Untitled'

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Get visible columns (excluding title and groupBy)
  const visibleCols = columns.filter((c) => c.id !== 'title' && c.type !== 'select').slice(0, 2)

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={`
                group relative bg-white dark:bg-graphon-dark-sidebar rounded-xl border border-graphon-border dark:border-[#303030]
                p-3 cursor-grab active:cursor-grabbing hover:border-gray-400 dark:hover:border-[#404040]
                transition-all duration-200 shadow-sm
                ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''}
            `}
    >
      {/* Card Menu */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
        className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white hover:bg-graphon-hover dark:hover:bg-[#353535] rounded transition-all"
      >
        <EllipsisHorizontalIcon className="w-4 h-4" />
      </button>

      {showMenu && (
        <div className="absolute top-8 right-2 w-32 bg-white dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-[#353535] rounded-lg shadow-2xl z-50 overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
              setShowMenu(false)
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      {/* Title */}
      <div className="text-sm text-graphon-text-main dark:text-[#dfdfdf] pr-6 leading-snug">
        {String(title)}
      </div>

      {/* Properties Preview */}
      {visibleCols.length > 0 && (
        <div className="mt-2 space-y-1">
          {visibleCols.map((col) => {
            const value = item.values[col.id]
            if (!value) return null

            return (
              <div
                key={col.id}
                className="flex items-center gap-2 text-[11px] text-graphon-text-secondary dark:text-[#9b9b9b]"
              >
                <span className="opacity-70">{col.name}:</span>
                <span className="truncate">{String(value)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

// Board Column
const BoardColumn = memo(function BoardColumn({
  columnValue,
  columnItems,
  allItems,
  columns,
  groupByColumn,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onItemClick
}: {
  columnValue: string
  columnItems: Item[]
  allItems: Item[]
  columns: Column[]
  groupByColumn: Column
  onUpdateItem: (item: Item) => void
  onDeleteItem: (itemId: string) => void
  onAddItem: (status: string, title?: string) => void
  onItemClick?: (item: Item) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isAddingInline, setIsAddingInline] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const itemId = e.dataTransfer.getData('text/plain')
    const item = allItems.find((i) => i.id === itemId)
    if (item) {
      onUpdateItem({
        ...item,
        values: { ...item.values, [groupByColumn.id]: columnValue },
        updatedAt: new Date().toISOString()
      })
    }
  }

  const handleInlineSubmit = () => {
    if (newTitle.trim()) {
      onAddItem(columnValue, newTitle.trim())
    }
    setIsAddingInline(false)
    setNewTitle('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInlineSubmit()
    } else if (e.key === 'Escape') {
      setIsAddingInline(false)
      setNewTitle('')
    }
  }

  const getStatusColor = (val: string) => {
    const v = val.toLowerCase()
    if (v.includes('to do') || v.includes('not started'))
      return { dot: 'bg-[#9b9b9b]', text: 'text-[#9b9b9b]', bg: 'bg-[#9b9b9b]/10' }
    if (v.includes('in progress'))
      return {
        dot: 'bg-(--color-accent)',
        text: 'text-(--color-accent)',
        bg: 'bg-(--color-accent)/10'
      }
    if (v.includes('done') || v.includes('complete'))
      return { dot: 'bg-[#448361]', text: 'text-[#448361]', bg: 'bg-[#448361]/10' }
    return { dot: 'bg-gray-400', text: 'text-gray-400', bg: 'bg-gray-400/10' }
  }

  const statusStyle = getStatusColor(columnValue)

  return (
    <div
      className={`
                shrink-0 w-72 flex flex-col min-h-full
                transition-colors duration-200
                 ${isDragOver ? 'bg-(--color-accent)/5 dark:bg-(--color-accent)/5 rounded-xl' : ''}
            `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
          >
            <div className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
            <span className="text-sm font-medium text-graphon-text-main dark:text-[#dfdfdf]">
              {columnValue}
            </span>
            <span className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary ml-1">
              {columnItems.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAddingInline(true)}
            className="p-1 text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          <button className="p-1 text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors">
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 px-1">
        {columnItems.map((item) => (
          <BoardCard
            key={item.id}
            item={item}
            columns={columns}
            onDelete={() => onDeleteItem(item.id)}
            onClick={() => onItemClick?.(item)}
          />
        ))}

        {/* Inline Creation Input */}
        {isAddingInline && (
          <div className="bg-white dark:bg-graphon-dark-sidebar rounded-xl border border-graphon-border dark:border-[#303030] p-3 shadow-sm flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleInlineSubmit}
              onKeyDown={handleKeyDown}
              placeholder="Type a name..."
              className="w-full bg-transparent outline-none text-sm text-graphon-text-main dark:text-[#dfdfdf] placeholder-gray-500"
            />
          </div>
        )}

        {/* New Item Button at bottom of column */}
        {!isAddingInline && (
          <button
            onClick={() => setIsAddingInline(true)}
            className={`
              w-full flex items-center gap-2 px-3 py-1.5 rounded-lg
              text-sm font-medium text-graphon-text-secondary dark:text-graphon-dark-text-secondary
              hover:bg-black/5 dark:hover:bg-white/5 transition-all group
            `}
          >
            <PlusIcon className="w-4 h-4 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
            <span>New Value</span>
          </button>
        )}

        {columnItems.length === 0 && !isAddingInline && (
          <div className="h-2" /> // Spacer for empty columns
        )}
      </div>
    </div>
  )
})

export default function BoardView({
  database,
  viewConfig,
  items,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onItemClick
}: BoardViewProps) {
  // Find groupBy column
  const groupByColId = viewConfig.groupBy || database.columns.find((c) => c.type === 'select')?.id
  const groupByColumn = database.columns.find((c) => c.id === groupByColId)

  const handleAddItemToColumn = useCallback(
    (status: string, title?: string) => {
      onAddItem({
        [groupByColId!]: status,
        title: title || 'Untitled'
      })
    },
    [onAddItem, groupByColId]
  )

  if (!groupByColumn || !groupByColumn.options) {
    return (
      <div className="flex-1 flex items-center justify-center text-graphon-text-secondary">
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-20">📊</div>
          <p className="text-lg font-bold text-graphon-text-main dark:text-graphon-dark-text-main mb-1">
            No group column found
          </p>
          <p className="text-sm">Add a select column to use Board view</p>
        </div>
      </div>
    )
  }

  // Group items by the groupBy column
  const columns = groupByColumn.options.map((optionValue) => ({
    value: optionValue,
    items: items.filter((item) => item.values[groupByColId!] === optionValue)
  }))

  // Items without a status
  const unassigned = items.filter((item) => !item.values[groupByColId!])

  return (
    <div className="h-full flex gap-6 px-8 py-6 overflow-x-auto bg-graphon-bg dark:bg-[#191919] transition-colors duration-300 no-scrollbar">
      {/* Unassigned column if there are items */}
      {unassigned.length > 0 && (
        <BoardColumn
          columnValue="Unassigned"
          columnItems={unassigned}
          allItems={items}
          columns={database.columns}
          groupByColumn={groupByColumn}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onAddItem={handleAddItemToColumn}
          onItemClick={onItemClick}
        />
      )}

      {/* Regular columns */}
      {columns.map((column, idx) => (
        <BoardColumn
          key={`${column.value}-${idx}`}
          columnValue={column.value}
          columnItems={column.items}
          allItems={items}
          columns={database.columns}
          groupByColumn={groupByColumn}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onAddItem={handleAddItemToColumn}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  )
}

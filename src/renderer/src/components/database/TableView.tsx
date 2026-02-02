import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TrashIcon, PlusIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import type { Database, Item, Column } from '../../types'

interface TableViewProps {
  database: Database
  items: Item[]
  onUpdateItem: (item: Item) => void
  onDeleteItem: (itemId: string) => void
  onAddItem: (initialValues?: Record<string, any>) => void
  onAddColumn: (column: Omit<Column, 'id'>) => void
  onUpdateColumn: (columnId: string, updates: Partial<Column>) => void
  onUpdateDatabase: (updates: Partial<Database>) => void
  onItemClick?: (item: Item) => void
}

// Memoized cell components for performance
const TextCell = memo(function TextCell({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleBlur = () => {
    setEditing(false)
    if (localValue !== value) {
      onChange(localValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setLocalValue(value)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 bg-graphon-hover dark:bg-graphon-dark-hover border border-(--color-accent) rounded text-sm focus:outline-none text-graphon-text-main dark:text-graphon-dark-text-main"
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="px-2 py-1 cursor-text hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover rounded text-sm truncate min-h-7 text-graphon-text-main dark:text-graphon-dark-text-main"
    >
      {value || <span className="text-graphon-text-secondary/30">Empty</span>}
    </div>
  )
})

const SelectCell = memo(function SelectCell({
  value,
  options,
  onChange
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const colors: Record<string, string> = {
    'To Do': 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    'In Progress': 'bg-(--color-accent)/10 text-(--color-accent) dark:bg-(--color-accent)/20',
    Done: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    Low: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    Medium: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    High: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 cursor-pointer hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover rounded min-h-7 flex items-center transition-colors"
      >
        {value ? (
          <span
            className={`px-2 py-0.5 rounded textxs font-bold ${colors[value] || 'bg-graphon-hover dark:bg-graphon-dark-hover text-graphon-text-main dark:text-graphon-dark-text-main border border-graphon-border dark:border-graphon-dark-border'}`}
          >
            {value}
          </span>
        ) : (
          <span className="text-graphon-text-secondary/30 text-sm">Select...</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-graphon-dark-border rounded-lg shadow-xl z-50">
          {options.map((option, idx) => (
            <button
              key={`${option}-${idx}`}
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover flex items-center transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${colors[option] || 'bg-graphon-hover dark:bg-graphon-dark-hover text-graphon-text-main dark:text-graphon-dark-text-main border border-graphon-border dark:border-graphon-dark-border'}`}
              >
                {option}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

const CheckboxCell = memo(function CheckboxCell({
  value,
  onChange
}: {
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="px-2 py-1 flex items-center">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-graphon-border dark:border-graphon-dark-border text-(--color-accent) focus:ring-(--color-accent) bg-white dark:bg-graphon-dark-sidebar"
      />
    </div>
  )
})

// Memoized Table Row
const TableRow = memo(function TableRow({
  item,
  columns,
  rowHeight = 36,
  onUpdateItem,
  onDeleteItem,
  onItemClick
}: {
  item: Item
  columns: Column[]
  rowHeight?: number
  onUpdateItem: (item: Item) => void
  onDeleteItem: () => void
  onItemClick?: (item: Item) => void
}) {
  const [showActions, setShowActions] = useState(false)

  const handleCellChange = useCallback(
    (columnId: string, value: unknown) => {
      onUpdateItem({
        ...item,
        values: { ...item.values, [columnId]: value },
        updatedAt: new Date().toISOString()
      })
    },
    [item, onUpdateItem]
  )

  const renderCell = (column: Column) => {
    const value = item.values[column.id]

    switch (column.type) {
      case 'text':
      case 'url':
      case 'email':
        // Make title field clickable to open editor
        if (column.id === 'title') {
          return (
            <div
              onClick={() => onItemClick?.(item)}
              className="px-2 py-1 cursor-pointer hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover rounded text-sm font-semibold text-graphon-text-main dark:text-graphon-dark-text-main truncate min-h-7 flex items-center"
            >
              {String(value || 'Untitled')}
            </div>
          )
        }
        return (
          <TextCell value={String(value || '')} onChange={(v) => handleCellChange(column.id, v)} />
        )
      case 'number':
        return (
          <TextCell
            value={String(value || '')}
            onChange={(v) => handleCellChange(column.id, Number(v) || 0)}
          />
        )
      case 'select':
        return (
          <SelectCell
            value={String(value || '')}
            options={column.options || []}
            onChange={(v) => handleCellChange(column.id, v)}
          />
        )
      case 'checkbox':
        return (
          <CheckboxCell value={Boolean(value)} onChange={(v) => handleCellChange(column.id, v)} />
        )
      case 'date':
        return (
          <input
            type="date"
            value={value ? String(value) : ''}
            onChange={(e) => handleCellChange(column.id, e.target.value)}
            className="px-2 py-1 bg-transparent text-sm border-none focus:ring-0 text-graphon-text-main dark:text-graphon-dark-text-main scheme-light dark:scheme-dark"
          />
        )
      default:
        return (
          <TextCell value={String(value || '')} onChange={(v) => handleCellChange(column.id, v)} />
        )
    }
  }

  return (
    <tr
      className="border-b border-graphon-border dark:border-graphon-dark-border hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors"
      style={{ height: `${rowHeight}px` }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Actions column */}
      <td className="w-10 px-2 border-r border-graphon-border dark:border-graphon-dark-border">
        <button
          onClick={onDeleteItem}
          className={`p-1 text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-red-500 dark:hover:text-red-400 rounded transition-all ${showActions ? 'opacity-100' : 'opacity-0'}`}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </td>
      {columns.map((column) => (
        <td
          key={column.id}
          className="border-r border-graphon-border dark:border-graphon-dark-border overflow-hidden"
          style={{
            width: column.width || (column.id === 'title' ? 250 : 150),
            minWidth: column.width || (column.id === 'title' ? 250 : 150)
          }}
        >
          {renderCell(column)}
        </td>
      ))}
      <td className="w-full"></td>
    </tr>
  )
})

export default function TableView({
  database,
  items,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onAddColumn,
  onUpdateColumn,
  onUpdateDatabase,
  onItemClick
}: TableViewProps) {
  const visibleColumns = database.columns
  const [resizing, setResizing] = useState<{
    id: string
    startX: number
    startWidth: number
  } | null>(null)

  // Ref for the virtualized scroll container
  const parentRef = useRef<HTMLDivElement>(null)

  // Load row height presets
  const [rowHeightPresets] = useState<{ label: string; value: number }[]>(() => {
    const saved = localStorage.getItem('graphon-row-height-presets')
    return saved
      ? JSON.parse(saved)
      : [
          { label: 'S', value: 32 },
          { label: 'M', value: 44 },
          { label: 'L', value: 64 }
        ]
  })

  // Current row height (dynamic)
  const currentRowHeight = database.rowHeight || 36

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => currentRowHeight,
    overscan: 5
  })

  const handleResizeStart = (e: React.PointerEvent, column: Column) => {
    e.preventDefault()
    setResizing({
      id: column.id,
      startX: e.pageX,
      startWidth: column.width || (column.id === 'title' ? 250 : 150)
    })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizing) return
    const diff = e.pageX - resizing.startX
    const newWidth = Math.max(80, resizing.startWidth + diff)
    onUpdateColumn(resizing.id, { width: newWidth })
  }

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!resizing) return
    setResizing(null)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // Calculate spacer sizes for virtualization
  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  // Padding to simulate scroll height
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto bg-white dark:bg-graphon-dark-bg transition-colors duration-300"
    >
      <table className="w-full border-collapse table-fixed">
        {/* Header */}
        <thead className="sticky top-0 bg-graphon-sidebar dark:bg-graphon-dark-sidebar border-b border-graphon-border dark:border-graphon-dark-border z-10 transition-colors">
          <tr>
            <th className="w-10 border-r border-graphon-border dark:border-graphon-dark-border relative group overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-graphon-text-secondary dark:text-graphon-dark-text-secondary/50 group-hover:opacity-0 transition-opacity">
                <ArrowsUpDownIcon className="w-3.5 h-3.5" />
              </div>
              <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center transition-opacity bg-white/90 dark:bg-graphon-dark-sidebar/90">
                <select
                  className="bg-transparent text-[10px] outline-none cursor-pointer font-bold uppercase w-full h-full text-center appearance-none"
                  value={database.rowHeight || 36}
                  onChange={(e) => onUpdateDatabase({ rowHeight: Number(e.target.value) })}
                  title="Row Height"
                >
                  {rowHeightPresets.map((preset) => (
                    <option key={preset.label} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            </th>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="px-3 py-2 text-left text-[11px] font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary uppercase tracking-widest border-r border-graphon-border dark:border-graphon-dark-border relative group cursor-default"
                style={{ width: column.width || (column.id === 'title' ? 250 : 150) }}
              >
                <div className="truncate pr-2">{column.name}</div>
                {/* Resize Handle */}
                <div
                  onPointerDown={(e) => handleResizeStart(e, column)}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  className={`
                    absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-(--color-accent) transition-colors
                    ${resizing?.id === column.id ? 'bg-(--color-accent) w-0.5' : 'bg-transparent'}
                  `}
                />
              </th>
            ))}
            {/* Add Column Button */}
            <th className="w-12 border-r border-graphon-border dark:border-graphon-dark-border">
              <button
                onClick={() => onAddColumn({ name: 'New Column', type: 'text' })}
                className="p-1 text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover rounded transition-colors"
                title="Add Column"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </th>
            <th className="w-full bg-graphon-sidebar dark:bg-graphon-dark-sidebar"></th>
          </tr>
        </thead>

        {/* Virtualized Body */}
        <tbody
          style={{
            display: 'block',
            paddingTop: `${paddingTop}px`,
            paddingBottom: `${paddingBottom}px`
          }}
        >
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index]
            return (
              <TableRow
                key={item.id}
                item={item}
                columns={visibleColumns}
                rowHeight={currentRowHeight}
                onUpdateItem={onUpdateItem}
                onDeleteItem={() => onDeleteItem(item.id)}
                onItemClick={onItemClick}
              />
            )
          })}
        </tbody>
      </table>

      {/* Add New Row */}
      <button
        onClick={() => onAddItem()}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors border-t border-graphon-border dark:border-graphon-dark-border"
      >
        <PlusIcon className="w-4 h-4" />
        New row
      </button>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-graphon-text-secondary">
          <div className="text-4xl mb-4 opacity-30">📋</div>
          <p className="text-lg font-bold text-graphon-text-main dark:text-graphon-dark-text-main">
            No items yet
          </p>
          <p className="text-sm">Click "New" to add your first item</p>
        </div>
      )}
    </div>
  )
}

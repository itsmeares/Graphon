import { useState } from 'react'
import { X, Plus, Maximize2, Minimize2, Star, MoreHorizontal, History, User } from 'lucide-react'
import type { Database, Item, Column } from '../../types'

interface NewItemEditorProps {
  database: Database
  item: Item
  onClose: () => void
  onUpdate: (item: Item) => void
  onAddColumn: (column: Omit<Column, 'id'>) => string
  onDeleteItem?: (id: string) => void
  onToggleFavorite?: (item: Item) => void
  isFavorite?: boolean
  mode?: 'side-panel' | 'modal' | 'full-page'
}

export default function NewItemEditor({
  database,
  item,
  onClose,
  onUpdate,
  onAddColumn,
  onDeleteItem,
  onToggleFavorite,
  isFavorite = false,
  mode = 'side-panel'
}: NewItemEditorProps) {
  // Local state for the item being edited
  const [localItem, setLocalItem] = useState<Item>(item)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isFullPage, setIsFullPage] = useState(mode === 'full-page')

  const toggleFullPage = () => {
    setIsFullPage(!isFullPage)
  }

  // Update a property value and trigger onUpdate
  const updateValue = (columnId: string, value: any) => {
    const updatedItem: Item = {
      ...localItem,
      values: {
        ...localItem.values,
        [columnId]: value
      },
      updatedAt: new Date().toISOString()
    }
    setLocalItem(updatedItem)
    onUpdate(updatedItem) // Immediately propagate changes
  }

  // Update content field
  const updateContent = (content: string) => {
    const updatedItem: Item = {
      ...localItem,
      content,
      updatedAt: new Date().toISOString()
    }
    setLocalItem(updatedItem)
    onUpdate(updatedItem)
  }

  // Handle adding a new property
  const handleAddProperty = () => {
    const newColumnId = onAddColumn({
      name: 'New Property',
      type: 'text'
    })

    // Update local item to include empty value for new column
    updateValue(newColumnId, '')
  }

  // Render editable input for each property type
  const renderPropertyInput = (columnId: string, type: string) => {
    const value = localItem.values[columnId]

    switch (type) {
      case 'text':
      case 'url':
      case 'email':
        return (
          <input
            type={type === 'url' ? 'url' : type === 'email' ? 'email' : 'text'}
            value={String(value || '')}
            onChange={(e) => updateValue(columnId, e.target.value)}
            placeholder="Empty"
            className="w-full px-2 py-0.5 text-sm bg-transparent border-none focus:ring-0 outline-none transition-colors text-graphon-text-main dark:text-[#dfdfdf] placeholder-graphon-text-secondary/30 dark:placeholder-[#444444]"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value !== undefined ? Number(value) : ''}
            onChange={(e) => updateValue(columnId, e.target.value ? Number(e.target.value) : '')}
            placeholder="Empty"
            className="w-full px-2 py-0.5 text-sm bg-transparent border-none focus:ring-0 outline-none transition-colors text-graphon-text-main dark:text-[#dfdfdf] placeholder-graphon-text-secondary/30 dark:placeholder-[#444444]"
          />
        )

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateValue(columnId, e.target.checked)}
            className="ml-2 w-4 h-4 rounded border-graphon-border dark:border-[#333333] text-(--color-accent) focus:ring-0 bg-transparent dark:bg-graphon-dark-sidebar"
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value ? String(value) : ''}
            onChange={(e) => updateValue(columnId, e.target.value)}
            className="w-full px-2 py-0.5 text-sm bg-transparent border-none focus:ring-0 outline-none transition-colors text-graphon-text-main dark:text-[#dfdfdf] scheme-light dark:scheme-dark"
          />
        )

      case 'select':
        const column = database.columns.find((c) => c.id === columnId)
        if (value) {
          return (
            <div className="px-2 py-0.5 text-sm">
              <span className="bg-graphon-hover dark:bg-[#333] px-2 py-0.5 rounded text-graphon-text-main dark:text-[#dfdfdf]">
                {String(value)}
              </span>
            </div>
          )
        }
        return (
          <select
            value={String(value || '')}
            onChange={(e) => updateValue(columnId, e.target.value)}
            className="w-full px-1.5 py-0.5 text-sm bg-transparent border-none focus:ring-0 outline-none transition-colors text-graphon-text-secondary/50"
          >
            <option value="" className="bg-white dark:bg-[#1c1c1c]">
              Empty
            </option>
            {column?.options?.map((option, idx) => (
              <option
                key={idx}
                value={option}
                className="bg-white dark:bg-[#1c1c1c] text-graphon-text-main dark:text-[#dfdfdf]"
              >
                {option}
              </option>
            ))}
          </select>
        )

      default:
        return (
          <span className="text-graphon-text-secondary/30 dark:text-[#444444] text-sm px-2">
            Empty
          </span>
        )
    }
  }

  const isModal = mode === 'modal' && !isFullPage
  const layoutMode = isFullPage ? 'full-page' : isModal ? 'modal' : 'side-panel'

  return (
    <>
      {(layoutMode === 'modal' || layoutMode === 'side-panel') && (
        <div
          className={`fixed inset-0 z-50 transition-all duration-500 ${layoutMode === 'modal' ? 'bg-black/20 dark:bg-black/60 backdrop-blur-xs' : 'bg-transparent'} animate-in fade-in`}
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed z-60 flex flex-col bg-white/95 dark:bg-[#1c1c1c]/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-graphon-border dark:border-[#333333] transition-all duration-500 ease-apple
          ${
            layoutMode === 'full-page'
              ? 'inset-0'
              : layoutMode === 'modal'
                ? 'inset-y-12 inset-x-4 md:inset-x-[15%] lg:inset-x-[20%] xl:inset-x-[25%] rounded-2xl animate-in zoom-in-95'
                : 'inset-y-0 right-0 w-162.5 border-l animate-in slide-in-from-right'
          }
        `}
      >
        {/* Top Control Bar */}
        <div
          className="flex items-center justify-between px-3 py-2 text-graphon-text-secondary dark:text-graphon-dark-text-secondary border-b border-graphon-border dark:border-[#333333]"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <div className="flex items-center gap-1">
            {layoutMode === 'full-page' ? (
              <div className="flex items-center gap-2 text-xs font-medium px-2">
                <span className="hover:text-graphon-text-main dark:text-[#9b9b9b] dark:hover:text-[#dfdfdf] cursor-pointer">
                  {database.name}
                </span>
                <span className="text-graphon-text-secondary/30 dark:text-[#444]">/</span>
                <span className="text-graphon-text-main dark:text-[#dfdfdf]">
                  {String(localItem.values.title || 'Untitled')}
                </span>
              </div>
            ) : (
              <button
                onClick={toggleFullPage}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                title="Open in full page"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {layoutMode === 'full-page' && (
              <button
                onClick={toggleFullPage}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                title="Back to normal view"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center text-[11px] text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50 mr-2">
              Edited{' '}
              {new Date(localItem.updatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <button className="flex items-center gap-1 px-2 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white">
              Share
            </button>
            <button
              onClick={() => onToggleFavorite?.(localItem)}
              className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors ${isFavorite ? 'text-yellow-500' : ''}`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
              >
                <History className="w-4 h-4" />
              </button>
              {showHistory && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-[#333333] rounded-lg shadow-xl z-70 p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-graphon-text-secondary/50">
                    History
                  </h3>
                  <div className="space-y-3">
                    <div className="text-[11px]">
                      <div className="text-graphon-text-main dark:text-[#dfdfdf] font-medium">
                        Original Version
                      </div>
                      <div className="text-graphon-text-secondary dark:text-[#666]">
                        {new Date(localItem.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-[11px]">
                      <div className="text-graphon-text-main dark:text-[#dfdfdf] font-medium">
                        Last Edited
                      </div>
                      <div className="text-graphon-text-secondary dark:text-[#666]">
                        {new Date(localItem.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-[#333333] rounded-lg shadow-xl z-70 py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      if (onDeleteItem) {
                        onDeleteItem(localItem.id)
                        onClose()
                      }
                      setShowMoreMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    Delete Page
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar"
          onClick={() => {
            if (showMoreMenu) setShowMoreMenu(false)
            if (showHistory) setShowHistory(false)
          }}
        >
          <div
            className={`${layoutMode === 'full-page' ? 'max-w-4xl' : 'max-w-3xl'} mx-auto px-12 py-10`}
          >
            {/* Title */}
            <input
              type="text"
              placeholder="Untitled"
              value={String(localItem.values.title || '')}
              onChange={(e) => updateValue('title', e.target.value)}
              className="w-full text-4xl font-bold text-graphon-text-main dark:text-[#dfdfdf] placeholder-graphon-text-secondary/20 dark:placeholder-[#333333] border-none outline-none focus:ring-0 mb-8 bg-transparent"
            />

            {/* Properties List */}
            <div className="space-y-1 mb-6">
              {database.columns.map((column) => (
                <div key={column.id} className="grid grid-cols-[140px_1fr] items-center group">
                  <div className="flex items-center gap-2 text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary px-2 py-1 relative">
                    <span className="opacity-70 text-base">
                      {column.type === 'select' ? '🏷️' : column.type === 'date' ? '📅' : '📄'}
                    </span>
                    <span className="font-medium">{column.name}</span>
                  </div>
                  <div className="hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors">
                    {renderPropertyInput(column.id, column.type)}
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddProperty}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors w-full mt-1 group"
              >
                <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                <span>Add a property</span>
              </button>
            </div>

            {/* Comments Placeholder */}
            <div className="border-t border-graphon-border dark:border-[#333333] mt-8 pt-6">
              <h4 className="text-xs font-semibold text-graphon-text-secondary dark:text-[#9b9b9b] mb-4 uppercase tracking-wider">
                Comments
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-graphon-hover dark:bg-[#333] flex items-center justify-center">
                  <User className="w-4 h-4 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
                </div>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-graphon-text-main dark:text-[#dfdfdf] placeholder-graphon-text-secondary/30 dark:placeholder-[#444444]"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="my-8 border-t border-graphon-border dark:border-[#333333]"></div>

            {/* Content Editor */}
            <div className="min-h-50">
              <textarea
                value={localItem.content || ''}
                onChange={(e) => updateContent(e.target.value)}
                placeholder="Press Enter to continue with an empty page, or create a template"
                className="w-full min-h-37.5 text-base text-graphon-text-main dark:text-[#dfdfdf] placeholder-graphon-text-secondary/30 dark:placeholder-[#444444] border-none outline-none focus:ring-0 resize-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

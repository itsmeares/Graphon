import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Database, Item, ViewConfig, ViewType, Column, CalendarEvent } from '../../types'
import {
  createDefaultDatabase,
  createDefaultViews,
  generateItemId,
  generateColumnId
} from '../../types'
import TableView from './TableView'
import BoardView from './BoardView'
import GalleryView from './GalleryView'
import CalendarView from '../CalendarView'
import NewItemEditor from './NewItemEditor'
import Toolbar from './Toolbar'
import { useDatabaseFilter } from '../../hooks/useDatabaseFilter'

interface DatabaseViewProps {
  initialDatabase?: Database
  databaseId?: string
  isSidebarVisible?: boolean
  preselectedItemId?: string | null
  preselectedItemMode?: 'side-panel' | 'modal' | 'full-page'
  onClearPreselectedItem?: () => void
  favorites: { databaseId: string; itemId: string; title: string; icon?: string }[]
  onToggleFavorite: (databaseId: string, item: Item) => void
  onItemDeleted?: (databaseId: string, itemId: string) => void
}

interface ExtendedDatabase extends Database {
  views: ViewConfig[]
  defaultViewId: string
}

export default function DatabaseView({
  initialDatabase,
  databaseId,
  preselectedItemId,
  preselectedItemMode,
  onClearPreselectedItem,
  favorites,
  onToggleFavorite,
  onItemDeleted
}: DatabaseViewProps) {
  const storageKey = databaseId ? `graphon-db-${databaseId}` : 'graphon-db'

  // 1. Initial State: Sadece yapısal kurulumu yapar
  const [database, setDatabase] = useState<ExtendedDatabase>(() => {
    const defaultDb = createDefaultDatabase('My Database')
    const statusCol = defaultDb.columns.find((c) => c.type === 'select')

    const views = createDefaultViews(statusCol?.id)

    return {
      ...(initialDatabase || defaultDb),
      views,
      defaultViewId: views[0].id
    }
  })

  const [currentViewId, setCurrentViewId] = useState(database.defaultViewId)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [editorMode, setEditorMode] = useState<'side-panel' | 'modal' | 'full-page' | undefined>(
    undefined
  )

  // 2. Load Data: Sayfa yüklendiğinde hafızadaki veriyi çeker
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setDatabase(parsed)
        if (parsed.defaultViewId) setCurrentViewId(parsed.defaultViewId)
      } catch (e) {
        console.error('Failed to load database from storage', e)
      }
    }
  }, [storageKey])

  // Handle preselected item from favorites
  useEffect(() => {
    if (preselectedItemId && database.items.length > 0) {
      const item = database.items.find((i) => i.id === preselectedItemId)
      if (item) {
        setSelectedItem(item)
        setEditorMode(preselectedItemMode)
        onClearPreselectedItem?.()
      }
    }
  }, [preselectedItemId, database.items, onClearPreselectedItem, preselectedItemMode])

  // 3. Persistence: Her değişiklikte hafızaya kaydeder
  const saveDatabase = useCallback(
    (db: ExtendedDatabase) => {
      localStorage.setItem(storageKey, JSON.stringify(db))
    },
    [storageKey]
  )

  const handleAddItem = useCallback(
    (initialValues?: Record<string, any>) => {
      // Find the status column - prefer one named 'Status' with 'To Do' option
      const statusCol = database.columns.find(
        (c) => c.type === 'select' && (c.name === 'Status' || c.options?.includes('To Do'))
      )

      const defaultValues: Record<string, any> = { title: '' }
      if (statusCol && statusCol.options?.includes('To Do')) {
        defaultValues[statusCol.id] = 'To Do'
      }

      const newItem: Item = {
        id: generateItemId(),
        values: { ...defaultValues, ...initialValues },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setDatabase((prev) => {
        const updated = { ...prev, items: [...prev.items, newItem] }
        saveDatabase(updated)
        return updated
      })

      // Open the properties menu for the new item
      setSelectedItem(newItem)
      setEditorMode(undefined) // Reset to default mode for new items
    },
    [database.columns, saveDatabase]
  )

  const handleUpdateItem = useCallback(
    (updatedItem: Item) => {
      setDatabase((prev) => {
        const updated = {
          ...prev,
          items: prev.items.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        }
        saveDatabase(updated)
        return updated
      })
    },
    [saveDatabase]
  )

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      setDatabase((prev) => {
        const updated = {
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId)
        }
        saveDatabase(updated)
        onItemDeleted?.(prev.id, itemId)
        return updated
      })
    },
    [saveDatabase, onItemDeleted]
  )

  const handleAddColumn = useCallback(
    (column: Omit<Column, 'id'>) => {
      const newColumn: Column = { ...column, id: generateColumnId() }
      setDatabase((prev) => {
        const updated = { ...prev, columns: [...prev.columns, newColumn] }
        saveDatabase(updated)
        return updated
      })
      return newColumn.id
    },
    [saveDatabase]
  )

  const handleAddView = useCallback(
    (type: ViewType) => {
      const newView: ViewConfig = {
        id: `view_${Date.now()}`,
        type,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        sort: null,
        filter: []
      }
      setDatabase((prev) => {
        const updated = { ...prev, views: [...prev.views, newView] }
        saveDatabase(updated)
        return updated
      })
      setCurrentViewId(newView.id)
    },
    [saveDatabase]
  )

  const handleUpdateColumn = useCallback(
    (columnId: string, updates: Partial<Column>) => {
      setDatabase((prev) => {
        const updated = {
          ...prev,
          columns: prev.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c))
        }
        saveDatabase(updated)
        return updated
      })
    },
    [saveDatabase]
  )

  const handleUpdateDatabase = useCallback(
    (updates: Partial<Database>) => {
      setDatabase((prev) => {
        const updated = { ...prev, ...updates }
        saveDatabase(updated)
        return updated
      })
    },
    [saveDatabase]
  )

  const handleViewConfigChange = useCallback(
    (newConfig: ViewConfig) => {
      setDatabase((prev) => {
        const updatedViews = prev.views.map((v) => (v.id === newConfig.id ? newConfig : v))
        const updated = { ...prev, views: updatedViews }
        saveDatabase(updated)
        return updated
      })
    },
    [saveDatabase]
  )

  // Helpers and Render
  const currentView = useMemo(
    () => database.views.find((v) => v.id === currentViewId) || database.views[0],
    [database.views, currentViewId]
  )

  // Apply Filter and Sort Logic using the hook
  const filteredItems = useDatabaseFilter(database.items, currentView, database.columns)

  const renderView = () => {
    const viewProps = {
      database,
      viewConfig: currentView,
      items: filteredItems,
      onUpdateItem: handleUpdateItem,
      onDeleteItem: handleDeleteItem,
      onAddItem: handleAddItem,
      onAddColumn: handleAddColumn,
      onUpdateColumn: handleUpdateColumn,
      onUpdateDatabase: handleUpdateDatabase,
      onItemClick: (item: Item) => {
        setSelectedItem(item)
        setEditorMode(undefined) // Use default mode for normal clicks
      }
    }

    switch (currentView.type) {
      case 'table':
        return <TableView {...viewProps} />
      case 'board':
        return <BoardView {...viewProps} />
      case 'gallery':
        return <GalleryView {...viewProps} />
      case 'calendar':
        // Map Items to CalendarEvents
        const calendarEvents: CalendarEvent[] = filteredItems.map((item) => {
          return {
            ...item,
            title: (item.values.title as string) || 'Untitled',
            startDate: item.values.startDate
              ? new Date(item.values.startDate)
              : new Date(item.createdAt || Date.now()),
            endDate: item.values.endDate
              ? new Date(item.values.endDate)
              : new Date(
                  (item.values.startDate ? new Date(item.values.startDate).getTime() : Date.now()) +
                    3600000
                )
          } as CalendarEvent
        })

        return (
          <CalendarView
            isSidebarIntegrated={false} // DatabaseView manages layout
            events={calendarEvents}
            onEventCreate={(event) => {
              handleAddItem({
                title: event.title,
                startDate: event.startDate.toISOString(),
                endDate: event.endDate.toISOString()
              })
            }}
            onEventUpdate={(event) => {
              const updatedItem: Item = {
                ...event,
                values: {
                  ...event.values,
                  title: event.title, // Sync specific fields back to values
                  startDate: event.startDate.toISOString(),
                  endDate: event.endDate.toISOString()
                }
              }
              handleUpdateItem(updatedItem)
            }}
            onEventDelete={handleDeleteItem}
          />
        )
      default:
        return <TableView {...viewProps} />
    }
  }

  return (
    <div className="flex-1 h-screen flex flex-col overflow-hidden text-graphon-text-main dark:text-[#dfdfdf] font-sans relative">
      {/* Main Content Wrapper with Blur/Scale Effect */}
      <div
        className={`flex-1 flex flex-col transition-all duration-500 ease-apple ${selectedItem ? 'blur-[3px] scale-[0.985] brightness-[0.9] pointer-events-none' : ''}`}
      >
        {/* Database Header */}
        <div className="shrink-0 px-8 pt-10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{database.icon}</span>
            <h1 className="text-3xl font-bold text-graphon-text-main dark:text-[#dfdfdf] tracking-tight">
              {database.name}
            </h1>
          </div>
        </div>

        {/* View Toolbar */}
        <Toolbar
          database={database}
          views={database.views}
          viewConfig={currentView}
          onViewConfigChange={handleViewConfigChange}
          onAddView={handleAddView}
          onCurrentViewChange={setCurrentViewId}
          onAddItem={() => handleAddItem()}
        />

        <div className="flex-1 overflow-hidden">{renderView()}</div>
      </div>

      {selectedItem && (
        <NewItemEditor
          database={database}
          item={selectedItem}
          onClose={() => {
            setSelectedItem(null)
            setEditorMode(undefined)
          }}
          onUpdate={(updated) => {
            handleUpdateItem(updated)
            setSelectedItem(updated)
          }}
          onAddColumn={handleAddColumn}
          onDeleteItem={handleDeleteItem}
          mode={editorMode || (currentView.type === 'gallery' ? 'modal' : 'side-panel')}
          onToggleFavorite={(item) => onToggleFavorite(database.id, item)}
          isFavorite={favorites.some(
            (f) => f.databaseId === database.id && f.itemId === selectedItem.id
          )}
        />
      )}
    </div>
  )
}

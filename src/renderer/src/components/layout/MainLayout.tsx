import { ReactNode } from 'react'
import ActivityBar, { ActivityId } from './ActivityBar'
import FileExplorer from './FileExplorer'
import Titlebar from './Titlebar'
import { useVault } from '../../contexts/VaultContext'
import CalendarSidebar from '../CalendarSidebar'
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core'
import { useState } from 'react'

interface MainLayoutProps {
  children: ReactNode
  selectedDate: Date
  onSelectDate: (date: Date) => void
  activeActivity: ActivityId
  onActivityChange: (id: ActivityId) => void
  titlebarStyle?: 'macos' | 'windows'
  isSidebarVisible?: boolean
  onToggleSidebar?: () => void
  darkMode?: boolean
  onToggleDarkMode?: () => void
  favorites?: any[]
  onFavoriteClick?: (databaseId: string, itemId: string) => void
  onToggleFavorite?: (databaseId: string, item: any) => void
  moduleVisibility?: { notes: boolean; calendar: boolean; database: boolean }
}

export default function MainLayout({
  children,
  selectedDate,
  onSelectDate,
  activeActivity,
  onActivityChange,
  titlebarStyle = 'macos',
  isSidebarVisible,
  onToggleSidebar
}: MainLayoutProps) {
  const { files } = useVault()
  const [activeDragItem, setActiveDragItem] = useState<any>(null)

  // Side Panel Width (Resizable logic could go here, for now static)
  const SIDE_PANEL_WIDTH = 280

  const renderSidePanelContent = () => {
    switch (activeActivity) {
      case 'files':
        return <FileExplorer nodes={files} />
      case 'search':
        return <div className="p-4 text-neutral-500">Search not implemented yet</div>
      case 'calendar':
        return <CalendarSidebar selectedDate={selectedDate} onSelectDate={onSelectDate} />
      case 'database':
        return <div className="p-4 text-neutral-500">Database List</div>
      case 'settings':
        return <div className="p-4 text-neutral-500">Settings Shortcuts</div>
      default:
        return null
    }
  }

  // Dnd Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative flex flex-col h-screen w-screen overflow-hidden text-neutral-900 dark:text-neutral-100 font-sans border-none bg-transparent">
        <div className="absolute top-0 left-0 w-full z-50">
          <Titlebar
            style={titlebarStyle}
            isSidebarVisible={isSidebarVisible}
            onToggleSidebar={onToggleSidebar}
          />
        </div>

        <div className="flex-1 flex gap-3 p-3 pt-12 overflow-hidden z-10">
          {/* 1. Activity Bar */}
          <ActivityBar activeId={activeActivity} onSelect={onActivityChange} />

          {/* 2. Side Panel - Ghost (transparent) */}
          <div
            className="flex flex-col scrim-high"
            style={{
              width: !isSidebarVisible || activeActivity === 'settings' ? 0 : SIDE_PANEL_WIDTH,
              display: !isSidebarVisible || activeActivity === 'settings' ? 'none' : 'flex'
            }}
          >
            <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center px-4 font-bold text-xs uppercase tracking-wider text-neutral-500">
              {activeActivity.toUpperCase()}
            </div>
            {renderSidePanelContent()}
          </div>

          {/* 3. Main Content Area - Floating Island */}
          <main className="flex-1 scrim-low overflow-hidden flex flex-col relative">
            {/* Editor / View Content */}
            <div className="flex-1 overflow-hidden relative">{children}</div>
          </main>
        </div>
      </div>

      <DragOverlay>
        {activeDragItem ? (
          activeDragItem.type === 'task' ? (
            <div className="p-2 bg-white dark:bg-graphon-dark-sidebar rounded-md shadow-xl border border-graphon-border dark:border-graphon-dark-border text-xs w-48 opacity-90 cursor-grabbing">
              <div className="font-medium text-graphon-text-main dark:text-graphon-dark-text-main truncate">
                {activeDragItem.task.content}
              </div>
            </div>
          ) : activeDragItem.type === 'event' ? (
            <div className="bg-(--color-accent) text-white p-1 rounded text-xs opacity-80 w-40 truncate shadow-xl cursor-grabbing">
              <div className="font-bold">{activeDragItem.event.title}</div>
            </div>
          ) : null
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

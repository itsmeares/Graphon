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
import { LayoutGrid, Settings } from 'lucide-react'

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
  surfaceMode?: 'glass' | 'solid'
  onSwitchToGateway?: () => void
}

export default function MainLayout({
  children,
  selectedDate,
  onSelectDate,
  activeActivity,
  onActivityChange,
  titlebarStyle = 'macos',
  isSidebarVisible,
  onToggleSidebar,
  surfaceMode = 'glass',
  onSwitchToGateway
}: MainLayoutProps) {
  const { files } = useVault()
  const [activeDragItem, setActiveDragItem] = useState<any>(null)

  // Side Panel Width (Resizable logic could go here, for now static)
  const SIDE_PANEL_WIDTH = 280

  const renderSidePanelContent = () => {
    switch (activeActivity) {
      case 'files':
        return <FileExplorer nodes={files} />
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

  const handleDragEnd = (_event: DragEndEvent) => {
    setActiveDragItem(null)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative flex flex-col h-screen w-screen overflow-hidden text-neutral-900 dark:text-neutral-100 font-sans border-none bg-transparent noise-overlay">
        <div className="absolute top-0 left-0 w-full z-50">
          <Titlebar
            style={titlebarStyle}
            mode="local"
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
            {/* Vault Label */}
            <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center px-4 font-bold text-xs uppercase tracking-wider text-neutral-500">
              {activeActivity.toUpperCase()}
            </div>

            {/* Side Panel Content */}
            <div className="flex-1 overflow-hidden">{renderSidePanelContent()}</div>

            {/* Footer: Gateway + Settings */}
            <div className="px-2 py-2 border-t border-black/5 dark:border-white/5 space-y-0.5">
              {onSwitchToGateway && (
                <button
                  onClick={onSwitchToGateway}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors"
                  title="Switch to Gateway"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="font-medium">Switch to Gateway</span>
                </button>
              )}
              <button
                onClick={() => onActivityChange('settings')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </div>

          {/* 3. Main Content Area - Dynamic Surface */}
          <main
            className={`
              flex-1 overflow-hidden flex flex-col relative
              transition-colors duration-300 ease-out
              ${surfaceMode === 'solid' ? 'surface-opaque specular-border' : 'scrim-low'}
            `}
          >
            {/* Editor / View Content */}
            <div className="flex-1 overflow-hidden relative z-10">{children}</div>
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

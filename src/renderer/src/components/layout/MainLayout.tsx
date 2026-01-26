import { ReactNode } from 'react'
import ActivityBar, { ActivityId } from './ActivityBar'
import FileExplorer from './FileExplorer'
import Titlebar from './Titlebar'
import { useVault } from '../../contexts/VaultContext'
import CalendarSidebar from '../CalendarSidebar'

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-50 dark:bg-[#1C1C1A] text-neutral-900 dark:text-neutral-100 font-sans border border-neutral-200 dark:border-neutral-800/50 rounded-lg">
      <Titlebar
        style={titlebarStyle}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 1. Activity Bar */}
        <ActivityBar activeId={activeActivity} onSelect={onActivityChange} />

        {/* 2. Side Panel */}
        <div
          className="flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-[#1C1C1A]"
          style={{
            width: !isSidebarVisible || activeActivity === 'settings' ? 0 : SIDE_PANEL_WIDTH,
            display: !isSidebarVisible || activeActivity === 'settings' ? 'none' : 'flex'
          }}
        >
          <div className="h-10 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 font-bold text-xs uppercase tracking-wider text-neutral-500">
            {activeActivity.toUpperCase()}
          </div>
          {renderSidePanelContent()}
        </div>

        {/* 3. Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1C1C1A]">
          {/* Editor / View Content */}
          <div className="flex-1 overflow-hidden relative">{children}</div>
        </div>
      </div>
    </div>
  )
}

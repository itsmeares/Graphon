import { X, Settings, Calendar, Database, FileText, Plus, Share2 } from 'lucide-react'
import { useVault } from '../../contexts/VaultContext'
import { TabType } from '../../types'

const getTabIcon = (type: TabType) => {
  switch (type) {
    case 'settings':
      return <Settings className="w-4 h-4 text-neutral-500" />
    case 'calendar':
      return <Calendar className="w-4 h-4 text-neutral-500" />
    case 'database':
      return <Database className="w-4 h-4 text-neutral-500" />
    case 'graph':
      return <Share2 className="w-4 h-4 text-neutral-500" />
    default:
      return <FileText className="w-4 h-4 text-neutral-500" />
  }
}

export default function TabBar() {
  const { tabs, activeTabIndex, setActiveTab, closeTab, createNote } = useVault()

  return (
    <div
      className="flex-1 w-0 flex items-center h-full overflow-x-auto no-scrollbar pt-1.5"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {tabs.map((tab, index) => {
        const isActive = index === activeTabIndex

        return (
          <div
            key={`${tab.id}-${index}`}
            className={`
              group flex items-center min-w-36 max-w-64 h-full px-3 mx-1 rounded-t-md cursor-pointer select-none transition-all duration-100 ease-out
              ${
                isActive
                  ? 'bg-neutral-50 dark:bg-[#1C1C1A] text-neutral-900 dark:text-neutral-200 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-700 dark:hover:text-neutral-300'
              }
            `}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onClick={() => setActiveTab(index)}
          >
            <div
              className={`mr-2.5 flex items-center justify-center opacity-70 ${isActive ? 'opacity-100' : ''}`}
            >
              {getTabIcon(tab.type)}
            </div>
            <span className="flex-1 truncate text-sm font-medium">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(index)
              }}
              className={`p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all ml-1.5 ${isActive ? 'opacity-100 visible' : 'invisible group-hover:visible'}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}

      {/* New Tab Button */}
      <button
        onClick={() => createNote()}
        className="ml-1 p-1 rounded-md text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

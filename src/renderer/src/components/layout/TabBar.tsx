import {
  XMarkIcon,
  Cog6ToothIcon,
  CalendarIcon,
  TableCellsIcon,
  DocumentIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { useVault } from '../../contexts/VaultContext'
import { TabType } from '../../types'

const getTabIcon = (type: TabType) => {
  switch (type) {
    case 'settings':
      return <Cog6ToothIcon className="w-3.5 h-3.5 text-blue-500" />
    case 'calendar':
      return <CalendarIcon className="w-3.5 h-3.5 text-red-500" />
    case 'database':
      return <TableCellsIcon className="w-3.5 h-3.5 text-green-500" />
    default:
      return <DocumentIcon className="w-3.5 h-3.5 text-neutral-400" />
  }
}

export default function TabBar() {
  const { tabs, activeTabIndex, setActiveTab, closeTab, createNote } = useVault()

  return (
    <div
      className="flex-1 w-0 flex items-center h-full overflow-x-auto no-scrollbar"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {tabs.map((tab, index) => {
        const isActive = index === activeTabIndex

        return (
          <div
            key={`${tab.id}-${index}`}
            className={`
              group flex items-center min-w-30 max-w-50 h-8 mt-1 mx-0.5 px-3 rounded-t-lg cursor-pointer select-none transition-all duration-200
              ${
                isActive
                  ? 'bg-white dark:bg-[#1C1C1A] text-neutral-900 dark:text-white shadow-sm font-semibold border-t-2 border-blue-500'
                  : 'bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-white/5 hover:text-neutral-800 dark:hover:text-neutral-200'
              }
            `}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onClick={() => setActiveTab(index)}
          >
            <div className="mr-2 flex items-center justify-center">{getTabIcon(tab.type)}</div>
            <span className="flex-1 truncate text-xs font-medium">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(index)
              }}
              className={`p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all ${isActive ? 'opacity-100' : ''}`}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        )
      })}

      {/* New Tab Button */}
      <button
        onClick={() => createNote()}
        className="ml-1 p-1 rounded-md text-neutral-500 hover:bg-neutral-200 dark:hover:bg-white/10 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

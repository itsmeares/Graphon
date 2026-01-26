import { Folder, Calendar, Database, Search, Settings, Home } from 'lucide-react'

export type ActivityId =
  | 'files'
  | 'search'
  | 'calendar'
  | 'database'
  | 'settings'
  | 'home'
  | 'notes'

interface ActivityBarProps {
  activeId: ActivityId
  onSelect: (id: ActivityId) => void
}

export default function ActivityBar({ activeId, onSelect }: ActivityBarProps) {
  return (
    <div className="w-12.5 h-full flex flex-col items-center py-4 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shrink-0 z-20">
      {/* Top Activities */}
      <div className="flex flex-col space-y-4">
        <ActivityButton
          id="home"
          active={activeId === 'home'}
          onClick={() => onSelect('home')}
          icon={<Home className="w-6 h-6" />}
          label="Home"
        />
        <ActivityButton
          id="files"
          active={activeId === 'files'}
          onClick={() => onSelect('files')}
          icon={<Folder className="w-6 h-6" />}
          label="Files"
        />
        <ActivityButton
          id="search"
          active={activeId === 'search'}
          onClick={() => onSelect('search')}
          icon={<Search className="w-6 h-6" />}
          label="Search"
        />
        <ActivityButton
          id="calendar"
          active={activeId === 'calendar'}
          onClick={() => onSelect('calendar')}
          icon={<Calendar className="w-6 h-6" />}
          label="Calendar"
        />
        <ActivityButton
          id="database"
          active={activeId === 'database'}
          onClick={() => onSelect('database')}
          icon={<Database className="w-6 h-6" />}
          label="Database"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Activities */}
      <div className="flex flex-col space-y-4">
        <ActivityButton
          id="settings"
          active={activeId === 'settings'}
          onClick={() => onSelect('settings')}
          icon={<Settings className="w-6 h-6" />}
          label="Settings"
        />
      </div>
    </div>
  )
}

interface ActivityButtonProps {
  id: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function ActivityButton({ active, onClick, icon, label }: ActivityButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        p-2 rounded-lg transition-colors duration-200
        ${
          active
            ? 'text-(--color-accent) bg-(--color-accent)/10 dark:bg-(--color-accent)/20'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800'
        }
      `}
    >
      {icon}
    </button>
  )
}

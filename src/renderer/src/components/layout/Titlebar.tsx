import { Bars3Icon } from '@heroicons/react/24/outline'
import TabBar from './TabBar'

interface TitlebarProps {
  style: 'macos' | 'windows'
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
  isSidebarVisible?: boolean
  onToggleSidebar?: () => void
}

export default function Titlebar({ style, isSidebarVisible, onToggleSidebar }: TitlebarProps) {
  // @ts-ignore
  const handleMin = () => window.api?.minimize()
  // @ts-ignore
  const handleMax = () => window.api?.maximize()
  // @ts-ignore
  const handleClose = () => window.api?.close()

  return (
    <div
      className="h-9 w-full flex items-center bg-transparent select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Native Traffic Lights are handled by Electron on macOS */}
      {style === 'macos' && <div className="w-20 shrink-0" />}

      <div
        className={`flex-1 flex items-center h-full overflow-hidden ${style === 'windows' ? 'pl-2' : 'px-2'}`}
      >
        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={`p-1 rounded-md mr-2 text-neutral-500 transition-colors ${isSidebarVisible ? 'bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <Bars3Icon className="w-4 h-4" />
        </button>

        {/* Dynamic spacer to push tabs to the right of the sidebar: 
            330px (Sidebar) - ~124px (Traffic Lights + Toggle Area) = ~206px offset needed
         */}
        <div
          className="h-full transition-all duration-300 ease-in-out shrink-0"
          style={{
            width: isSidebarVisible
              ? style === 'macos'
                ? '206px'
                : '290px' // Mac: 330-124; Win: 330-40 (approx)
              : '10px'
          }}
        />

        {/* Browser-like Tab Bar */}
        <TabBar />
      </div>

      {style === 'windows' && (
        <div className="flex h-full items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={handleMin}
            className="h-full px-4 hover:bg-neutral-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors outline-none text-neutral-500 dark:text-neutral-400"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10">
              <path d="M1,5 L9,5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          <button
            onClick={handleMax}
            className="h-full px-4 hover:bg-neutral-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors outline-none text-neutral-500 dark:text-neutral-400"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10">
              <path d="M1,1 L9,1 L9,9 L1,9 Z" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="h-full px-4 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors outline-none text-neutral-500 dark:text-neutral-400"
          >
            <svg className="w-3 h-3" viewBox="0 0 10 10">
              <path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

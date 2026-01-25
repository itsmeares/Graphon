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
      className="h-9 w-full flex items-center bg-neutral-100 dark:bg-[#121212] border-b border-neutral-200 dark:border-neutral-800 select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {style === 'macos' && (
        <div
          className="px-4 flex items-center space-x-2"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 flex items-center justify-center group outline-none"
          >
            <svg
              className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black/50"
              viewBox="0 0 10 10"
            >
              <path d="M2,2 L8,8 M8,2 L2,8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            onClick={handleMin}
            className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 flex items-center justify-center group outline-none"
          >
            <svg
              className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black/50"
              viewBox="0 0 10 10"
            >
              <path d="M2,5 L8,5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            onClick={handleMax}
            className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 flex items-center justify-center group outline-none"
          >
            <svg
              className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black/50"
              viewBox="0 0 10 10"
            >
              <path d="M2,5 L8,5 M5,2 L5,8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      )}

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

      {/* Spacer for macOS style to balance center title */}
      {style === 'macos' && <div className="w-20" />}
    </div>
  )
}

import { Bars3Icon } from '@heroicons/react/24/outline'
import TabBar from './TabBar'

interface TitlebarProps {
  style: 'macos' | 'windows'
  mode?: 'local' | 'team'
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
  isSidebarVisible?: boolean
  onToggleSidebar?: () => void
}

export default function Titlebar({
  style,
  mode = 'local',
  isSidebarVisible,
  onToggleSidebar
}: TitlebarProps) {
  const platform = (window as any).api?.platform || 'win32'
  const isMac = platform === 'darwin'
  const isTeamMode = mode === 'team'

  const handleMin = () => (window as any).api?.minimize()
  const handleMax = () => (window as any).api?.maximize()
  const handleClose = () => (window as any).api?.close()

  return (
    <div
      className="h-9 w-full flex items-center bg-transparent select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* macOS style traffic lights simulation for non-macOS platforms */}
      {style === 'macos' && (
        <div className="w-20 shrink-0 flex items-center justify-center space-x-2 pl-4">
          {!isMac ? (
            <div className="flex space-x-2 group/traffic">
              <button
                onClick={handleClose}
                className="w-3 h-3 rounded-full bg-[#FF5F57] flex items-center justify-center transition-all duration-200"
                style={{ WebkitAppRegion: 'no-drag' } as any}
              >
                <svg
                  className="w-2 h-2 opacity-0 group-hover/traffic:opacity-100 transition-opacity text-black/50"
                  viewBox="0 0 10 10"
                >
                  <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
              <button
                onClick={handleMin}
                className="w-3 h-3 rounded-full bg-[#FEBC2E] flex items-center justify-center transition-all duration-200"
                style={{ WebkitAppRegion: 'no-drag' } as any}
              >
                <svg
                  className="w-2 h-2 opacity-0 group-hover/traffic:opacity-100 transition-opacity text-black/50"
                  viewBox="0 0 10 10"
                >
                  <rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
                </svg>
              </button>
              <button
                onClick={handleMax}
                className="w-3 h-3 rounded-full bg-[#28C840] flex items-center justify-center transition-all duration-200"
                style={{ WebkitAppRegion: 'no-drag' } as any}
              >
                <svg
                  className="w-1.5 h-1.5 opacity-0 group-hover/traffic:opacity-100 transition-opacity text-black/50"
                  viewBox="0 0 10 10"
                >
                  <path
                    d="M1 1.5L8.5 1.5V9H1V1.5Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    fill="none"
                  />
                  <path d="M1 9L8.5 1.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="w-20 shrink-0" />
          )}
        </div>
      )}

      <div
        className={`flex-1 flex items-center h-full overflow-hidden ${style === 'windows' ? 'pl-2' : 'px-2'}`}
      >
        {/* Sidebar Toggle - Only show in local mode */}
        {!isTeamMode && (
          <button
            onClick={onToggleSidebar}
            className={`p-1 rounded-md mr-2 text-neutral-500 transition-colors ${isSidebarVisible ? 'bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <Bars3Icon className="w-4 h-4" />
          </button>
        )}

        {/* Team Mode: Centered Title, No Tabs */}
        {isTeamMode ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] font-bold text-graphon-text-secondary/30 dark:text-graphon-dark-text-secondary/40 uppercase tracking-[0.35em]">
              Graphon • Teamspace
            </span>
          </div>
        ) : (
          <>
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
          </>
        )}
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

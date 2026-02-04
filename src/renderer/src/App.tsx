import { useState, useEffect, useMemo } from 'react'
import MainLayout from './components/layout/MainLayout'
import Gateway, { AppMode } from './components/gateway/Gateway'
import { ActivityId } from './components/layout/ActivityBar'
import NotesView from './components/NotesView'
import CalendarView from './components/CalendarView'
import SettingsView from './components/SettingsView'
import DatabaseView from './components/database/DatabaseView'
import DatabaseList from './components/database/DatabaseList'
import GraphView from './components/graph-view/GraphView'
import TasksView from './components/TasksView'
import LoadingScreen from './components/LoadingScreen'
import WelcomeView from './components/WelcomeView'
import NewPageView from './components/NewPageView'
import HomeView from './components/HomeView'
import { Theme } from './types'
import { CommandPalette } from './components/CommandPalette'

// Edition-specific imports (swappable for Open Core builds)
import { Components } from './config/edition'
const { AuthProvider, WorkspaceProvider, TeamLayout, AuthModal, LocalFilePicker } = Components

// Accent colors
export const ACCENT_COLORS = [
  { id: 'blue', label: 'Blue', value: '#007aff' },
  { id: 'purple', label: 'Purple', value: '#af52de' },
  { id: 'pink', label: 'Pink', value: '#ff2d55' },
  { id: 'orange', label: 'Orange', value: '#ff9500' },
  { id: 'green', label: 'Green', value: '#28cd41' },
  { id: 'red', label: 'Red', value: '#ff3b30' },
  { id: 'graphite', label: 'Graphite', value: '#8e8e93' }
]

import { KeybindingProvider, useKeybindings } from './contexts/KeybindingContext'
import { VaultProvider, useVault } from './contexts/VaultContext'

function AppContent() {
  const {
    currentVaultPath,
    isLoading: vaultLoading,
    tabs,
    activeTabIndex,
    openTab,
    closeTab,
    setActiveTab,
    createNote,
    openFile
  } = useVault()

  const { checkMatch } = useKeybindings()

  // Computed active tab
  const activeTab = activeTabIndex >= 0 ? tabs[activeTabIndex] : undefined

  // Determine surface mode based on active view
  // Glass = transparent/glassy for empty/new-page states
  // Solid = opaque background for focused work (editor, calendar, etc.)
  const surfaceMode = useMemo(() => {
    if (!activeTab) return 'glass' // Empty state = glass
    const solidViews = ['file', 'calendar', 'settings', 'database', 'graph', 'tasks']
    return solidViews.includes(activeTab.type) ? 'solid' : 'glass'
  }, [activeTab])

  const [isLoading, setIsLoading] = useState(true)
  // State
  const [activeActivity, setActiveActivity] = useState<ActivityId>('files')
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // === GATEWAY STATE MACHINE ===
  // Always start at gateway - user chooses their path each session
  const [appMode, setAppMode] = useState<AppMode>('gateway')
  const [isGatewayAuthModalOpen, setIsGatewayAuthModalOpen] = useState(false)
  const [isLocalFilePickerOpen, setIsLocalFilePickerOpen] = useState(false)

  // Mode switching handlers
  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode)
  }

  const handleReturnToGateway = () => {
    setAppMode('gateway')
  }

  // Handle import from local vault (mock)
  const handleImportFromLocal = (filePath: string, fileName: string) => {
    // TODO: Implement actual import logic
    console.log('[Airlock] Importing:', filePath, fileName)
    // Show toast notification (using existing toast system if available)
    alert(`Imported "${fileName.replace('.md', '')}" to Team Drafts`)
  }

  // Favorites State
  const [favorites, setFavorites] = useState<
    { databaseId: string; itemId: string; title: string; icon?: string }[]
  >(() => {
    const saved = localStorage.getItem('graphon-favorites')
    return saved ? JSON.parse(saved) : []
  })

  // Module Visibility State
  const [moduleVisibility, setModuleVisibility] = useState<{
    notes: boolean
    calendar: boolean
    database: boolean
  }>(() => {
    const saved = localStorage.getItem('graphon-module-visibility')
    return saved ? JSON.parse(saved) : { notes: true, calendar: true, database: true }
  })

  // Database Preselection State
  const [preselectedItemMode, setPreselectedItemMode] = useState<
    'side-panel' | 'modal' | 'full-page' | undefined
  >(undefined)
  const [preselectedItemId, setPreselectedItemId] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('graphon-module-visibility', JSON.stringify(moduleVisibility))
  }, [moduleVisibility])

  // Handle Global Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (checkMatch(e, 'closeTab')) {
        e.preventDefault()
        e.stopPropagation()
        if (activeTabIndex !== -1) {
          closeTab(activeTabIndex)
        }
        return
      }

      if (checkMatch(e, 'nextTab')) {
        e.preventDefault()
        e.stopPropagation()
        if (tabs.length > 1) {
          const nextIndex = (activeTabIndex + 1) % tabs.length
          setActiveTab(nextIndex)
        }
        return
      }

      if (checkMatch(e, 'previousTab')) {
        e.preventDefault()
        e.stopPropagation()
        if (tabs.length > 1) {
          const prevIndex = (activeTabIndex - 1 + tabs.length) % tabs.length
          setActiveTab(prevIndex)
        }
        return
      }

      if (checkMatch(e, 'newTab')) {
        // Block new tab shortcut in team mode
        if (appMode === 'team') {
          e.preventDefault()
          return
        }
        e.preventDefault()
        e.stopPropagation()
        openTab({
          id: `new-page-${Date.now()}`,
          type: 'new-page',
          title: 'New Page',
          icon: '📄'
        })
        return
      }

      if (checkMatch(e, 'newItem')) {
        e.preventDefault()
        e.stopPropagation()
        createNote()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    checkMatch,
    activeTabIndex,
    tabs.length,
    closeTab,
    setActiveTab,
    openTab,
    createNote,
    appMode
  ])

  const handleToggleModule = (module: 'notes' | 'calendar' | 'database') => {
    setModuleVisibility((prev) => ({ ...prev, [module]: !prev[module] }))
  }

  // Sync ActivityBar with Active Tab
  useEffect(() => {
    if (!activeTab) return

    if (activeTab.type === 'file') {
      setActiveActivity('files')
    } else if (activeTab.type === 'calendar') {
      setActiveActivity('calendar')
    } else if (activeTab.type === 'settings') {
      setActiveActivity('settings')
    } else if (activeTab.type === 'database') {
      setActiveActivity('database')
    }
  }, [activeTab])

  // Handle Activity Selection -> Open/Switch Tab
  const handleActivityChange = (id: ActivityId) => {
    setActiveActivity(id)

    // Auto-open tab for specific activities
    if (id === 'settings') {
      openTab({ id: 'settings', type: 'settings', title: 'Settings' })
    } else if (id === 'calendar') {
      openTab({ id: 'calendar', type: 'calendar', title: 'Calendar' })
    } else if (id === 'database') {
      // If we have a current DB, open it? For now just generic DB view?
      // Maybe open "Databases" list tab
      openTab({ id: 'database-list', type: 'database', title: 'Databases' })
    } else if (id === 'graph') {
      openTab({ id: 'graph', type: 'graph', title: 'Graph View' })
    } else if (id === 'tasks') {
      openTab({ id: 'tasks', type: 'tasks', title: 'Tasks' })
    } else if (id === 'home') {
      openTab({
        id: `new-page-${Date.now()}`,
        type: 'new-page',
        title: 'New Page',
        icon: '📄'
      })
    } else if (id === 'notes') {
      setActiveActivity('files')
      // If no tab is open, maybe we don't do anything, just let Sidebar show selection?
    } else if (id === 'files') {
      // Just show sidebar? Ensure a file tab is active?
      // If no file active, maybe don't force one.
    }
  }

  const handleToggleSidebar = () => setIsSidebarVisible((prev) => !prev)

  useEffect(() => {
    localStorage.setItem('graphon-favorites', JSON.stringify(favorites))
  }, [favorites])

  const handleToggleFavorite = (databaseId: string, item: any) => {
    setFavorites((prev) => {
      const isFav = prev.find((f) => f.databaseId === databaseId && f.itemId === item.id)
      if (isFav) {
        return prev.filter((f) => !(f.databaseId === databaseId && f.itemId === item.id))
      } else {
        return [
          ...prev,
          {
            databaseId,
            itemId: item.id,
            title: item.values.title || 'Untitled',
            icon: item.icon
          }
        ]
      }
    })
  }

  const handleDeleteItemWithFavoriteSync = (databaseId: string, itemId: string) => {
    setFavorites((prev) =>
      prev.filter((f) => !(f.databaseId === databaseId && f.itemId === itemId))
    )
  }

  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('graphon-theme') as Theme | null
    return saved || 'system'
  })

  // Titlebar Style State
  const [titlebarStyle, setTitlebarStyle] = useState<'macos' | 'windows'>(() => {
    const saved = localStorage.getItem('graphon-titlebar-style')
    return saved === 'windows' ? 'windows' : 'macos'
  })

  const handleSetTitlebarStyle = (style: 'macos' | 'windows') => {
    setTitlebarStyle(style)
    localStorage.setItem('graphon-titlebar-style', style)
  }

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)

  // Initialize theme and handle system preference changes
  useEffect(() => {
    const applyTheme = () => {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const shouldBeDark = theme === 'dark' || (theme === 'system' && systemPrefersDark)
      setIsDarkMode(shouldBeDark)

      if (shouldBeDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    applyTheme()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [theme])

  // Theme synchronization for main process
  useEffect(() => {
    const bgColor = isDarkMode ? '#1C1C1A' : '#FFFCF8'
    // @ts-ignore
    window.api?.updateThemeColor(bgColor)
    // @ts-ignore
    window.api?.updateThemePreference?.(theme)
  }, [isDarkMode, theme])

  const handleSetTheme = (newTheme: Theme): void => {
    setTheme(newTheme)
    localStorage.setItem('graphon-theme', newTheme)
  }

  // Accent Color State
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('graphon-accent-color') || 'blue'
  })

  useEffect(() => {
    const colorObj = ACCENT_COLORS.find((c) => c.id === accentColor) || ACCENT_COLORS[0]
    document.documentElement.style.setProperty('--color-accent', colorObj.value)
  }, [accentColor])

  const handleSetAccentColor = (id: string) => {
    setAccentColor(id)
    localStorage.setItem('graphon-accent-color', id)
  }

  // Global Selection State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleClose = () => {
    // @ts-ignore
    window.api?.close()
  }
  const handleMinimize = () => {
    // @ts-ignore
    window.api?.minimize()
  }
  const handleMaximize = () => {
    // @ts-ignore
    window.api?.maximize()
  }

  // Show loading screen during initial app load
  if (isLoading) {
    return <LoadingScreen onFinished={() => setIsLoading(false)} />
  }

  // === GATEWAY MODE (Always show first!) ===
  if (appMode === 'gateway') {
    return (
      <div className="w-screen h-screen p-[0.5px] bg-transparent overflow-hidden relative">
        <div className="w-full h-full overflow-hidden bg-white/10 dark:bg-black/10 border border-graphon-border/40 dark:border-graphon-dark-border/20 rounded-xl shadow-2xl transition-colors duration-300 flex flex-col relative z-10">
          {/* Custom Titlebar for Gateway */}
          <div
            className="h-10 w-full flex items-center px-4 shrink-0 select-none drag scrim-high border-b border-graphon-border/10 dark:border-graphon-dark-border/5"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
            {(window as any).api?.platform !== 'darwin' ? (
              <div
                className="flex space-x-2 mr-4 group"
                style={{ WebkitAppRegion: 'no-drag' } as any}
              >
                <button
                  onClick={handleClose}
                  className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57] flex items-center justify-center group/btn relative overflow-hidden transition-all duration-200"
                >
                  <svg
                    className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity text-black/50"
                    viewBox="0 0 10 10"
                  >
                    <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
                <button
                  onClick={handleMinimize}
                  className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E] flex items-center justify-center group/btn relative overflow-hidden transition-all duration-200"
                >
                  <svg
                    className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity text-black/50"
                    viewBox="0 0 10 10"
                  >
                    <rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={handleMaximize}
                  className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#28C840] flex items-center justify-center group/btn relative overflow-hidden transition-all duration-200"
                >
                  <svg
                    className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-black/50"
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
              <div className="w-20" />
            )}
            <div className="flex-1 text-center">
              <span className="text-[10px] font-bold text-graphon-text-secondary/30 dark:text-graphon-dark-text-secondary/40 uppercase tracking-[0.35em]">
                Graphon
              </span>
            </div>
            <div className="w-20" />
          </div>
          <Gateway
            onSelectMode={handleSelectMode}
            onOpenAuthModal={() => setIsGatewayAuthModalOpen(true)}
          />
          <AuthModal
            isOpen={isGatewayAuthModalOpen}
            onClose={() => setIsGatewayAuthModalOpen(false)}
          />
        </div>
      </div>
    )
  }

  // === LOCAL MODE: Show vault selector if no vault is selected ===
  if (appMode === 'local' && !vaultLoading && !currentVaultPath) {
    return (
      <div className="w-screen h-screen p-[0.5px] bg-transparent overflow-hidden relative">
        <div className="w-full h-full overflow-hidden bg-white/10 dark:bg-black/10 border border-graphon-border/40 dark:border-graphon-dark-border/20 rounded-xl shadow-2xl transition-colors duration-300 flex flex-col relative z-10">
          {/* Custom Titlebar for Welcome Screen */}
          <div
            className="h-10 w-full flex items-center px-4 shrink-0 select-none drag scrim-high border-b border-graphon-border/10 dark:border-graphon-dark-border/5"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
            {(window as any).api?.platform !== 'darwin' ? (
              <div
                className="flex space-x-2 mr-4 group"
                style={{ WebkitAppRegion: 'no-drag' } as any}
              >
                <button
                  onClick={handleClose}
                  className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57] flex items-center justify-center group/btn relative overflow-hidden transition-all duration-200"
                >
                  <svg
                    className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity text-black/50"
                    viewBox="0 0 10 10"
                  >
                    <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
                <button
                  onClick={handleMinimize}
                  className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E] flex items-center justify-center group/btn relative overflow-hidden transition-all duration-200"
                >
                  <svg
                    className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity text-black/50"
                    viewBox="0 0 10 10"
                  >
                    <rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={handleMaximize}
                  className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#28C840] flex items-center justify-center group/btn relative overflow-hidden transition-all duration-200"
                >
                  <svg
                    className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-black/50"
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
              <div className="w-20" />
            )}
            <div className="flex-1 text-center">
              <span className="text-[10px] font-bold text-graphon-text-secondary/30 dark:text-graphon-dark-text-secondary/40 uppercase tracking-[0.35em]">
                Graphon
              </span>
            </div>
            <div className="w-20" />
          </div>

          <WelcomeView />
        </div>
      </div>
    )
  }

  // === TEAM MODE ===
  if (appMode === 'team') {
    return (
      <div className="w-screen h-screen p-[0.5px] bg-transparent overflow-hidden">
        <div className="w-full h-full overflow-hidden bg-transparent border border-graphon-border/20 dark:border-graphon-dark-border/10 rounded-xl">
          <TeamLayout titlebarStyle={titlebarStyle} onReturnToGateway={handleReturnToGateway}>
            {/* Team content placeholder */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-graphon-text-secondary">Team Dashboard coming soon...</p>
                <button
                  onClick={() => setIsLocalFilePickerOpen(true)}
                  className="mt-4 px-4 py-2 rounded-lg bg-(--color-accent) text-white text-sm font-medium"
                >
                  Import from Local Vault
                </button>
              </div>
            </div>
          </TeamLayout>
          <LocalFilePicker
            isOpen={isLocalFilePickerOpen}
            onClose={() => setIsLocalFilePickerOpen(false)}
            onImport={handleImportFromLocal}
          />
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            setIsOpen={setIsCommandPaletteOpen}
            onViewChange={() => {}}
            darkMode={isDarkMode}
            onToggleDarkMode={() => handleSetTheme(isDarkMode ? 'light' : 'dark')}
            onToggleSidebar={() => {}}
            isTeamMode={true}
            onImportFromLocal={() => setIsLocalFilePickerOpen(true)}
          />
        </div>
      </div>
    )
  }

  // === LOCAL MODE (default) ===
  return (
    <div className="w-screen h-screen p-[0.5px] bg-transparent overflow-hidden">
      {/* Window outer border decorator for rounded appearance */}
      <div className="w-full h-full overflow-hidden bg-transparent border border-graphon-border/20 dark:border-graphon-dark-border/10 rounded-xl">
        <MainLayout
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          activeActivity={activeActivity}
          onActivityChange={handleActivityChange}
          titlebarStyle={titlebarStyle}
          isSidebarVisible={isSidebarVisible}
          onToggleSidebar={handleToggleSidebar}
          surfaceMode={surfaceMode}
          onSwitchToGateway={handleReturnToGateway}
        >
          {/* Render Content based on Active Tab */}
          {!activeTab && (
            <div className="flex-1 h-full flex flex-col items-center justify-center select-none transition-colors duration-300">
              <div className="flex flex-col items-center max-w-lg mx-auto p-12">
                {/* App Icon / Logo Placeholder */}
                <div className="w-24 h-24 mb-8 rounded-4xl bg-linear-to-b from-neutral-100 to-white dark:from-[#2C2C2A] dark:to-[#1C1C1A] shadow-xl dark:shadow-2xl dark:shadow-black/20 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/5">
                  <svg
                    className="w-10 h-10 text-neutral-400 dark:text-neutral-500 drop-shadow-sm"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16V12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-3 tracking-tight">
                  Graphon
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-center text-sm mb-10 max-w-sm leading-relaxed">
                  Your personal knowledge base. <br /> Open a file or create a new page to begin.
                </p>

                {/* Shortcuts */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm w-full">
                  <div className="flex items-center justify-between group">
                    <span className="text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                      New Page
                    </span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-0.5 min-w-5 h-6 inline-flex items-center justify-center rounded bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/30 dark:border-neutral-700/30 text-[10px] font-sans font-medium text-neutral-500 dark:text-neutral-400">
                        Ctrl
                      </kbd>
                      <kbd className="px-2 py-0.5 min-w-5 h-6 inline-flex items-center justify-center rounded bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/30 dark:border-neutral-700/30 text-[10px] font-sans font-medium text-neutral-500 dark:text-neutral-400">
                        N
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between group">
                    <span className="text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                      Command Palette
                    </span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-0.5 min-w-5 h-6 inline-flex items-center justify-center rounded bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/30 dark:border-neutral-700/30 text-[10px] font-sans font-medium text-neutral-500 dark:text-neutral-400">
                        Ctrl
                      </kbd>
                      <kbd className="px-2 py-0.5 min-w-5 h-6 inline-flex items-center justify-center rounded bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/30 dark:border-neutral-700/30 text-[10px] font-sans font-medium text-neutral-500 dark:text-neutral-400">
                        K
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between group">
                    <span className="text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                      New Tab
                    </span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-0.5 min-w-5 h-6 inline-flex items-center justify-center rounded bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/30 dark:border-neutral-700/30 text-[10px] font-sans font-medium text-neutral-500 dark:text-neutral-400">
                        Ctrl
                      </kbd>
                      <kbd className="px-2 py-0.5 min-w-5 h-6 inline-flex items-center justify-center rounded bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/30 dark:border-neutral-700/30 text-[10px] font-sans font-medium text-neutral-500 dark:text-neutral-400">
                        T
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between group">
                    <span className="text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                      Close Tab
                    </span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-0.5 min-w-5 h-6 inline-flex items-center justify-center rounded bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/30 dark:border-neutral-700/30 text-[10px] font-sans font-medium text-neutral-500 dark:text-neutral-400">
                        Ctrl
                      </kbd>
                      <kbd className="px-2 py-0.5 min-w-5 h-6 inline-flex items-center justify-center rounded bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/30 dark:border-neutral-700/30 text-[10px] font-sans font-medium text-neutral-500 dark:text-neutral-400">
                        W
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab?.type === 'new-page' && (
            <HomeView
              notes={[]} // Passing empty for now as VaultContext doesn't provide Note objects
              onSelectNote={(id) => openFile(id)}
              onCreateNote={() => createNote()}
              onViewChange={(view) => {
                if (view === 'calendar') {
                  openTab({ id: 'calendar', type: 'calendar', title: 'Calendar' })
                } else if (view === 'database') {
                  openTab({ id: 'database-list', type: 'database', title: 'Databases' })
                }
              }}
            />
          )}

          {activeTab?.type === 'new-page' && <NewPageView />}

          {activeTab?.type === 'file' && <NotesView isSidebarVisible={isSidebarVisible} />}

          {activeTab?.type === 'calendar' && (
            <CalendarView
              isSidebarIntegrated={false}
              onToggleSidebar={() => {}}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
            />
          )}

          {activeTab?.type === 'settings' && (
            <SettingsView
              theme={theme}
              onSetTheme={handleSetTheme}
              isSidebarVisible={isSidebarVisible}
              moduleVisibility={moduleVisibility}
              onToggleModule={handleToggleModule}
              titlebarStyle={titlebarStyle}
              onSetTitlebarStyle={handleSetTitlebarStyle}
              accentColor={accentColor}
              onSetAccentColor={handleSetAccentColor}
              accentColors={ACCENT_COLORS}
            />
          )}

          {activeTab?.type === 'database' &&
            // Simplification: if activeTab.path exists, it's a specific DB, else List
            (activeTab.path ? (
              <DatabaseView
                databaseId={activeTab.path}
                isSidebarVisible={isSidebarVisible}
                preselectedItemId={preselectedItemId}
                preselectedItemMode={preselectedItemMode}
                onClearPreselectedItem={() => {
                  setPreselectedItemId(null)
                  setPreselectedItemMode(undefined)
                }}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onItemDeleted={handleDeleteItemWithFavoriteSync}
              />
            ) : (
              <DatabaseList
                onSelectDatabase={(id) => {
                  // When selecting a DB from list, update the current tab or open new one?
                  // Let's replace current tab
                  // Update tab implementation needed in VaultContext, or close/open
                  // For now, simpler: Open new tab
                  openTab({ id: `db-${id}`, type: 'database', title: 'Database', path: id })
                }}
              />
            ))}

          {activeTab?.type === 'graph' && (
            <GraphView
              isDarkMode={isDarkMode}
              onSelectNode={async (nodeValue) => {
                if (!nodeValue) return

                if (nodeValue.startsWith('create:')) {
                  // Ghost node clicked - check if file exists first
                  const fileName = nodeValue.replace('create:', '')
                  const fn = fileName.endsWith('.md') ? fileName : `${fileName}.md`

                  // Try to read the file to check if it exists
                  const existingContent = await window.api.readFile(fn)
                  if (existingContent !== null) {
                    // File now exists (was created), just open it
                    openFile(fn)
                  } else {
                    // File doesn't exist, create it
                    createNote(fileName)
                  }
                } else {
                  // Existing file - open it by path
                  openFile(nodeValue)
                }
              }}
            />
          )}

          {activeTab?.type === 'tasks' && (
            <TasksView
              onOpenFile={(path) => {
                openFile(path)
              }}
            />
          )}
        </MainLayout>
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          setIsOpen={setIsCommandPaletteOpen}
          onViewChange={(view) => {
            // Handle view changes from Palette
            if (view === 'notes') {
              setActiveActivity('files')
            } else if (view === 'calendar') {
              openTab({ id: 'calendar', type: 'calendar', title: 'Calendar' })
            } else if (view === 'database') {
              openTab({ id: 'database-list', type: 'database', title: 'Databases' })
            } else if (view === 'home') {
              openTab({
                id: `new-page-${Date.now()}`,
                type: 'new-page',
                title: 'New Page',
                icon: '📄'
              })
            } else if (view === 'graph') {
              openTab({ id: 'graph', type: 'graph', title: 'Graph View' })
            }
          }}
          darkMode={isDarkMode}
          onToggleDarkMode={() => handleSetTheme(isDarkMode ? 'light' : 'dark')}
          onToggleSidebar={handleToggleSidebar}
        />
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <VaultProvider>
        <WorkspaceProvider>
          <KeybindingProvider>
            <AppContent />
          </KeybindingProvider>
        </WorkspaceProvider>
      </VaultProvider>
    </AuthProvider>
  )
}

export default App

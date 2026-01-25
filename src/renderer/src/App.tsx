import { useState, useEffect } from 'react'
import MainLayout from './components/layout/MainLayout'
import { ActivityId } from './components/layout/ActivityBar'
import NotesView from './components/NotesView'
import CalendarView from './components/CalendarView'
import SettingsView from './components/SettingsView'
import DatabaseView from './components/database/DatabaseView'
import DatabaseList from './components/database/DatabaseList'
import LoadingScreen from './components/LoadingScreen'
import WelcomeView from './components/WelcomeView'
import NewPageView from './components/NewPageView'
import HomeView from './components/HomeView'
import { Theme } from './types'

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

  const [isLoading, setIsLoading] = useState(true)
  // State
  const [activeActivity, setActiveActivity] = useState<ActivityId>('files')
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)

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
  }, [checkMatch, activeTabIndex, tabs.length, closeTab, setActiveTab, openTab, createNote])

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

  // Show welcome screen if no vault is selected
  if (!vaultLoading && !currentVaultPath) {
    return (
      <div className="w-screen h-screen p-[0.5px] bg-transparent overflow-hidden">
        <div className="w-full h-full overflow-hidden bg-graphon-bg dark:bg-graphon-dark-bg border border-graphon-border/40 dark:border-graphon-dark-border/20 rounded-xl shadow-2xl transition-colors duration-300 flex flex-col relative">
          {/* Custom Titlebar for Welcome Screen */}
          <div
            className="h-10 w-full flex items-center px-4 shrink-0 select-none drag glass-header border-b border-graphon-border/10 dark:border-graphon-dark-border/5"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
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

  return (
    <div className="w-screen h-screen p-[0.5px] bg-transparent overflow-hidden">
      <MainLayout
        selectedDate={selectedDate}
        onSelectDate={handleDateSelect}
        activeActivity={activeActivity}
        onActivityChange={handleActivityChange}
        titlebarStyle={titlebarStyle}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={handleToggleSidebar}
      >
        {/* Render Content based on Active Tab */}
        {!activeTab && (
          <div className="flex-1 flex items-center justify-center text-neutral-400 select-none bg-graphon-bg dark:bg-graphon-dark-bg">
            <div className="text-center">
              <p className="mb-2">No Open Tabs</p>
              <p className="text-sm opacity-50">Select a file or activity to get started</p>
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
      </MainLayout>
    </div>
  )
}

function App() {
  return (
    <VaultProvider>
      <KeybindingProvider>
        <AppContent />
      </KeybindingProvider>
    </VaultProvider>
  )
}

export default App

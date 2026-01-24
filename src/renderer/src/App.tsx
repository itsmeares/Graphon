import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import NotesView from './components/NotesView'
import CalendarView from './components/CalendarView'
import SettingsView from './components/SettingsView'
import DatabaseView from './components/database/DatabaseView'
import DatabaseList from './components/database/DatabaseList'
import HomeView from './components/HomeView'
import type { ViewType, Theme, Note } from './types'
import { KeybindingProvider } from './contexts/KeybindingContext'

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home') // Default to home
  const [currentDatabaseId, setCurrentDatabaseId] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [isPeeking, setIsPeeking] = useState(false)
  const [preselectedItemMode, setPreselectedItemMode] = useState<
    'side-panel' | 'modal' | 'full-page' | undefined
  >(undefined)
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

  useEffect(() => {
    localStorage.setItem('graphon-module-visibility', JSON.stringify(moduleVisibility))
  }, [moduleVisibility])

  const handleToggleModule = (module: 'notes' | 'calendar' | 'database') => {
    setModuleVisibility((prev) => ({ ...prev, [module]: !prev[module] }))
  }

  // Notes State
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('graphon-notes')
    return saved ? JSON.parse(saved) : []
  })
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('graphon-notes', JSON.stringify(notes))
  }, [notes])

  const handleCreateNote = () => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title: '',
      content: '',
      updatedAt: new Date().toISOString()
    }
    setNotes((prev) => [newNote, ...prev])
    setActiveNoteId(newNote.id)
    if (currentView !== 'notes') {
      setCurrentView('notes')
    }
  }

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
      )
    )
  }

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (activeNoteId === id) {
      setActiveNoteId(null)
    }
  }

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

  const handleFavoriteClick = (databaseId: string, itemId: string) => {
    setCurrentView('database')
    setCurrentDatabaseId(databaseId)
    setPreselectedItemId(itemId)
    setPreselectedItemMode('full-page')
  }

  const [preselectedItemId, setPreselectedItemId] = useState<string | null>(null)

  const handleDeleteItemWithFavoriteSync = (databaseId: string, itemId: string) => {
    // This is a helper that we'll pass to DatabaseView if needed,
    // or we just handle it in DatabaseView and tell App.
    setFavorites((prev) =>
      prev.filter((f) => !(f.databaseId === databaseId && f.itemId === itemId))
    )
  }

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('graphon-theme') as Theme | null
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark)
    setDarkMode(shouldBeDark)

    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Theme synchronization for main process
  useEffect(() => {
    const bgColor = darkMode ? '#1C1C1A' : '#FFFCF8'
    // @ts-ignore
    window.electron?.ipcRenderer.send('update-theme-color', bgColor)
  }, [darkMode])

  const handleToggleDarkMode = (): void => {
    const newMode = !darkMode
    setDarkMode(newMode)

    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('graphon-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('graphon-theme', 'light')
    }
  }

  // Global Selection State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleViewChange = (view: ViewType) => {
    if (view === 'database' && currentView === 'database' && currentDatabaseId) {
      setCurrentDatabaseId(null)
      return
    }
    if (view !== 'database') {
      setCurrentDatabaseId(null)
    }
    setCurrentView(view)
  }

  const handleMinimize = () => {
    // @ts-ignore
    window.electron?.ipcRenderer.send('window-minimize')
  }

  const handleMaximize = () => {
    // @ts-ignore
    window.electron?.ipcRenderer.send('window-maximize')
  }

  const handleClose = () => {
    // @ts-ignore
    window.electron?.ipcRenderer.send('window-close')
  }

  return (
    <KeybindingProvider>
      <div className="w-screen h-screen p-[0.5px] bg-transparent overflow-hidden">
        <div className="w-full h-full overflow-hidden bg-graphon-bg dark:bg-graphon-dark-bg border border-graphon-border/40 dark:border-graphon-dark-border/20 rounded-xl shadow-2xl transition-colors duration-300 flex flex-col relative">
          {/* Custom macOS-style Titlebar */}
          <div
            className="h-10 w-full flex items-center px-4 flex-shrink-0 select-none drag glass-header border-b border-graphon-border/10 dark:border-graphon-dark-border/5"
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

          <div className="flex-1 flex overflow-hidden">
            {/* Invisible Hover Zone for Peeking */}
            {!isSidebarVisible && (
              <div
                className="fixed left-0 top-10 bottom-0 w-3 z-[60]"
                onMouseEnter={() => setIsPeeking(true)}
              />
            )}

            {/* Sidebar Component */}
            <div
              className={`
                top-0 bottom-0 z-50 h-full transition-all duration-400 ease-apple overflow-hidden
                ${
                  isSidebarVisible
                    ? 'relative w-72 translate-x-0'
                    : isPeeking
                      ? 'fixed left-0 w-72 shadow-2xl translate-x-0 bg-graphon-sidebar dark:bg-graphon-dark-sidebar'
                      : 'fixed left-0 w-0 -translate-x-full opacity-0'
                }
              `}
              onMouseLeave={() => setIsPeeking(false)}
            >
              <Sidebar
                currentView={currentView}
                onViewChange={handleViewChange}
                darkMode={darkMode}
                onToggleDarkMode={handleToggleDarkMode}
                onToggleVisibility={() => {
                  setIsSidebarVisible(!isSidebarVisible)
                  setIsPeeking(false)
                }}
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
                favorites={favorites}
                onFavoriteClick={handleFavoriteClick}
                notes={notes}
                activeNoteId={activeNoteId}
                onCreateNote={handleCreateNote}
                onSelectNote={(id) => {
                  setActiveNoteId(id)
                  setCurrentView('notes')
                }}
                onDeleteNote={handleDeleteNote}
                moduleVisibility={moduleVisibility}
              />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 h-full overflow-hidden transition-all duration-400 ease-apple flex flex-col relative">
              {!isSidebarVisible && !isPeeking && (
                <button
                  onClick={() => setIsSidebarVisible(true)}
                  className="absolute top-3 left-4 z-40 p-2 rounded-lg text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-squish btn-squish animate-in fade-in zoom-in duration-300"
                  title="Show Sidebar"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <rect
                      x="3"
                      y="4"
                      width="14"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path d="M7.5 4V16" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
              )}

              <div className="flex-1 overflow-hidden page-transition">
                {currentView === 'home' && (
                  <HomeView
                    notes={notes}
                    onSelectNote={(id) => {
                      setActiveNoteId(id)
                      setCurrentView('notes')
                    }}
                    onCreateNote={handleCreateNote}
                    onViewChange={handleViewChange}
                  />
                )}
                {currentView === 'notes' && (
                  <NotesView
                    isSidebarVisible={isSidebarVisible}
                    activeNoteId={activeNoteId}
                    notes={notes}
                    onUpdateNote={handleUpdateNote}
                  />
                )}
                {currentView === 'calendar' && (
                  <CalendarView
                    isSidebarIntegrated={isSidebarVisible}
                    onToggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
                    selectedDate={selectedDate}
                    onSelectDate={handleDateSelect}
                  />
                )}
                {currentView === 'settings' && (
                  <SettingsView
                    darkMode={darkMode}
                    onToggleDarkMode={handleToggleDarkMode}
                    isSidebarVisible={isSidebarVisible}
                    moduleVisibility={moduleVisibility}
                    onToggleModule={handleToggleModule}
                  />
                )}
                {currentView === 'database' &&
                  (currentDatabaseId ? (
                    <DatabaseView
                      databaseId={currentDatabaseId}
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
                    <DatabaseList onSelectDatabase={setCurrentDatabaseId} />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </KeybindingProvider>
  )
}

export default App

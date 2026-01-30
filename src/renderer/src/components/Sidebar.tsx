import {
  Calendar,
  Settings,
  Sun,
  Moon,
  Database,
  Plus,
  ChevronRight,
  Home,
  Folder,
  RefreshCw as ArrowPathIcon,
  ArrowUpCircle
} from 'lucide-react'
import type { ViewType } from '../types'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CalendarSidebar from './CalendarSidebar'
import { useVault } from '../contexts/VaultContext'
import { FileContextMenu } from './FileContextMenu'
import { SidebarSkeleton } from './SkeletonLoader'
import RelatedNotes from './RelatedNotes'

interface SidebarProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  darkMode: boolean
  onToggleDarkMode: () => void
  onToggleVisibility: () => void
  selectedDate: Date
  onSelectDate: (date: Date) => void
  favorites: { databaseId: string; itemId: string; title: string; icon?: string }[]
  onFavoriteClick: (databaseId: string, itemId: string) => void
  moduleVisibility: { notes: boolean; calendar: boolean; database: boolean }
}

export default function Sidebar({
  currentView,
  onViewChange,
  darkMode,
  onToggleDarkMode,
  onToggleVisibility,
  selectedDate,
  onSelectDate,
  favorites,
  onFavoriteClick,
  moduleVisibility,
  onToggleFavorite // Add this prop
}: SidebarProps & { onToggleFavorite?: (databaseId: string, item: any) => void }) {
  const [isFilesExpanded, setIsFilesExpanded] = useState(true)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const {
    currentVaultPath,
    files,
    refreshFiles,
    activeFile,
    setActiveFile,
    createNote,
    renameNote,
    deleteNote,
    isLoading
  } = useVault()

  // Update Listener
  useEffect(() => {
    // @ts-ignore
    const unsubscribe = window.api?.onUpdateMessage?.((msg: any) => {
      if (msg === 'update-available' || msg.type === 'update-downloaded') {
        setUpdateAvailable(true)
      }
    })
    return () => {}
  }, [])

  if (isLoading) return <SidebarSkeleton />

  // Handle file click
  const handleFileClick = async (filename: string) => {
    await setActiveFile(filename)
    onViewChange('notes')
  }

  // Handle creating a new note
  const handleCreateNote = async () => {
    const name = `Untitled-${Date.now()}`
    await createNote(name)
    onViewChange('notes')
  }

  // Handlers for Context Menu
  const handleRename = async (filename: string) => {
    const newName = window.prompt('Enter new name:', filename)
    if (newName && newName !== filename) {
      // Ensure .md extension for safety if backend doesn't, but backend renameFile takes plain strings
      // Ideally we keep extension logic consistent
      let safeNewName = newName
      if (filename.endsWith('.md') && !safeNewName.endsWith('.md')) {
        safeNewName += '.md'
      }
      await renameNote(filename, safeNewName)
    }
  }

  const handleDelete = async (filename: string) => {
    if (confirm(`Are you sure you want to delete "${filename}"?`)) {
      await deleteNote(filename)
    }
  }

  const handleRevealInExplorer = (filename: string) => {
    // @ts-ignore
    window.api?.showItemInFolder?.(filename)
  }

  const handleAddToFavorites = (filename: string) => {
    // Favorites usually track DB items, but maybe files too?
    // App.tsx favorites logic expects databaseId and itemId.
    // If we want to favorite files, we need to adapt App.tsx or pass dummy DB ID.
    // For now, assuming "databaseId" can be "files"
    if (onToggleFavorite) {
      onToggleFavorite('files', { id: filename, values: { title: filename }, icon: '📄' })
    }
  }

  // Get vault name from path
  const vaultName = currentVaultPath ? currentVaultPath.split(/[/\\]/).pop() || 'Vault' : 'No Vault'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-72 h-full flex flex-col glass-sidebar transition-colors duration-300 overflow-hidden"
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center space-x-3 overflow-hidden select-none">
          <div className="w-8 h-8 rounded-xl bg-(--color-accent) flex items-center justify-center text-white text-[12px] font-bold shrink-0 shadow-lg btn-squish">
            G
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-sm text-graphon-text-main dark:text-graphon-dark-text-main tracking-tight truncate">
              Graphon
            </span>
            <span className="text-[10px] text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 truncate">
              {vaultName}
            </span>
          </div>
        </div>

        <button
          onClick={onToggleVisibility}
          className="p-2 rounded-lg text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-squish btn-squish"
          title="Close Sidebar"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
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
      </div>

      {/* Main Navigation Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar">
        {/* Main Links */}
        <div className="px-3 mb-6 flex flex-col space-y-1">
          <SidebarBtn
            active={currentView === 'home'}
            onClick={() => onViewChange('home')}
            icon={<Home className="w-4 h-4" />}
            label="Home"
          />

          {/* Files Section */}
          {currentVaultPath && (
            <div className="flex flex-col">
              {/* Header Row */}
              <div
                className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors select-none cursor-pointer"
                onClick={() => setIsFilesExpanded(!isFilesExpanded)}
              >
                <div className="flex items-center flex-1 min-w-0 space-x-3">
                  <div
                    className="w-4 h-4 shrink-0 flex items-center justify-center"
                    style={{ minWidth: '16px', minHeight: '16px' }}
                  >
                    <Folder className="w-4 h-4 text-graphon-text-secondary dark:text-graphon-dark-text-secondary block" />
                  </div>
                  <span className="text-sm font-semibold text-graphon-text-secondary dark:text-graphon-dark-text-secondary group-hover:text-graphon-text-main dark:group-hover:text-white truncate">
                    Files
                  </span>
                </div>

                {/* Toggle Chevron */}
                <div className="p-0.5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary shrink-0">
                  <ChevronRight
                    className={`w-3 h-3 transition-transform duration-200 ${isFilesExpanded ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>

              {/* Files List */}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isFilesExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <div className="ml-2 mt-1 space-y-0.5">
                    {files.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50">
                        No files in vault
                      </div>
                    ) : (
                      files.map((file) => (
                        <FileContextMenu
                          key={file.path}
                          filename={file.name}
                          onRename={handleRename}
                          onDelete={handleDelete}
                          onAddToFavorites={handleAddToFavorites}
                          onRevealInExplorer={handleRevealInExplorer}
                        >
                          <div
                            onClick={() => handleFileClick(file.name)}
                            className={`group/file flex items-center justify-between px-2 py-1.5 transition-all cursor-pointer hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover rounded-md ${
                              activeFile === file.name || activeFile === file.path
                                ? 'nav-item-active'
                                : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary border border-transparent'
                            }`}
                          >
                            <span className="truncate flex-1 text-[13px] leading-none py-0.5">
                              {file.name}
                            </span>
                          </div>
                        </FileContextMenu>
                      ))
                    )}
                    <button
                      onClick={handleCreateNote}
                      className="w-full flex items-center px-2 py-1.5 rounded-md text-sm text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 hover:text-graphon-text-secondary dark:hover:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors group/add border-l-2 border-transparent"
                      title="Create new file"
                    >
                      <Plus className="w-3 h-3 mr-1 group-hover/add:scale-110 transition-transform" />
                      <span className="text-[13px]">New File</span>
                    </button>
                    <button
                      onClick={() => refreshFiles()}
                      className="w-full flex items-center px-2 py-1.5 rounded-md text-sm text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 hover:text-graphon-text-secondary dark:hover:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors group/refresh border-l-2 border-transparent"
                      title="Refresh files"
                    >
                      <ArrowPathIcon className="w-3 h-3 mr-1 group-hover/refresh:rotate-180 transition-transform duration-300" />
                      <span className="text-[13px]">Refresh</span>
                    </button>
                  </div>
                </div>
                {/* Related Notes Section */}
                {activeFile && (
                  <RelatedNotes currentFilePath={activeFile} onNoteClick={handleFileClick} />
                )}
              </div>
            </div>
          )}

          {moduleVisibility.calendar && (
            <SidebarBtn
              active={currentView === 'calendar'}
              onClick={() => onViewChange('calendar')}
              icon={<Calendar className="w-4 h-4" />}
              label="Calendar"
            />
          )}
          {moduleVisibility.database && (
            <SidebarBtn
              active={currentView === 'database'}
              onClick={() => onViewChange('database')}
              icon={<Database className="w-4 h-4" />}
              label="Database"
            />
          )}
        </div>

        {/* Calendar integrated view */}
        {currentView === 'calendar' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 px-3">
            <div className="rounded-xl overflow-hidden glass-modal border border-graphon-border dark:border-graphon-dark-border mb-4">
              <CalendarSidebar selectedDate={selectedDate} onSelectDate={onSelectDate} />
            </div>
          </div>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="mt-8 px-3">
            <h3 className="px-3 mb-2 text-[11px] font-bold text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50 uppercase tracking-widest">
              Favorites
            </h3>
            <div className="flex flex-col space-y-1">
              {favorites.map((fav) => (
                <button
                  key={`${fav.databaseId}-${fav.itemId}`}
                  onClick={() => onFavoriteClick(fav.databaseId, fav.itemId)}
                  className="w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover hover:text-graphon-text-main dark:hover:text-white transition-all btn-squish group"
                >
                  <span className="text-base shrink-0">{fav.icon || '📄'}</span>
                  <span className="truncate">{fav.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Update Notification */}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 pb-2 shrink-0"
          >
            <div
              className="bg-(--color-accent)/10 border border-(--color-accent)/20 text-(--color-accent) text-xs p-2 rounded-lg flex items-center justify-between cursor-pointer hover:bg-(--color-accent)/20 transition-colors shadow-sm"
              onClick={() => {
                // Trigger install or check
                alert('Update is ready to install!')
              }}
            >
              <span className="font-medium">Update Available</span>
              <ArrowUpCircle className="w-4 h-4" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="p-4 mt-0 flex items-center justify-between shrink-0">
        <button
          onClick={() => onViewChange('settings')}
          className={`
            p-2 rounded-xl transition-squish btn-squish
            ${
              currentView === 'settings'
                ? 'bg-(--color-accent) text-white shadow-md'
                : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover hover:text-graphon-text-main dark:hover:text-white'
            }
          `}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover hover:text-graphon-text-main dark:hover:text-white transition-squish btn-squish"
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </motion.div>
  )
}

interface SidebarBtnProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function SidebarBtn({ active, onClick, icon, label }: SidebarBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`
                w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold transition-squish btn-squish
                ${
                  active
                    ? 'bg-(--color-accent) shadow-md text-white'
                    : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover hover:text-graphon-text-main dark:hover:text-white'
                }
            `}
    >
      <span className={active ? 'scale-110' : ''}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

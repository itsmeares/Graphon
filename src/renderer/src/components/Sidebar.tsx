import {
  CalendarIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  TableCellsIcon,
  PlusIcon,
  ChevronRightIcon,
  HomeIcon,
  FolderIcon
} from '@heroicons/react/24/outline'
import type { ViewType } from '../types'
import { useState } from 'react'
import CalendarSidebar from './CalendarSidebar'
import { useVault } from '../contexts/VaultContext'

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
  moduleVisibility
}: SidebarProps) {
  const [isFilesExpanded, setIsFilesExpanded] = useState(true)
  const { currentVaultPath, files, refreshFiles, activeFile, setActiveFile, createNote } =
    useVault()

  // Handle file click - set active file and switch to notes view
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

  // Get vault name from path
  const vaultName = currentVaultPath ? currentVaultPath.split(/[/\\]/).pop() || 'Vault' : 'No Vault'

  return (
    <div className="w-72 h-full flex flex-col glass-sidebar transition-colors duration-300 overflow-hidden">
      {/* Header with Space Name and Toggle */}
      <div className="h-16 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center space-x-3 overflow-hidden select-none">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0 shadow-lg btn-squish">
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
            icon={<HomeIcon className="w-4 h-4" />}
            label="Home"
          />

          {/* Files Section (from Vault) */}
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
                    <FolderIcon className="w-4 h-4 text-graphon-text-secondary dark:text-graphon-dark-text-secondary block" />
                  </div>
                  <span className="text-sm font-semibold text-graphon-text-secondary dark:text-graphon-dark-text-secondary group-hover:text-graphon-text-main dark:group-hover:text-white truncate">
                    Files
                  </span>
                </div>

                {/* Toggle Chevron on Right */}
                <div className="p-0.5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary shrink-0">
                  <ChevronRightIcon
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
                        <div
                          key={file}
                          onClick={() => handleFileClick(file)}
                          className={`group/file flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-all cursor-pointer border-l-2 hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover ${
                            activeFile === file
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                              : 'border-transparent text-graphon-text-secondary dark:text-graphon-dark-text-secondary'
                          }`}
                        >
                          <span className="truncate flex-1 text-[13px] leading-none py-0.5">
                            {file}
                          </span>
                        </div>
                      ))
                    )}
                    <button
                      onClick={handleCreateNote}
                      className="w-full flex items-center px-2 py-1.5 rounded-md text-sm text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 hover:text-graphon-text-secondary dark:hover:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors group/add border-l-2 border-transparent"
                      title="Create new file"
                    >
                      <PlusIcon className="w-3 h-3 mr-1 group-hover/add:scale-110 transition-transform" />
                      <span className="text-[13px]">New File</span>
                    </button>
                    <button
                      onClick={() => refreshFiles()}
                      className="w-full flex items-center px-2 py-1.5 rounded-md text-sm text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 hover:text-graphon-text-secondary dark:hover:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors group/refresh border-l-2 border-transparent"
                      title="Refresh files"
                    >
                      <svg
                        className="w-3 h-3 mr-1 group-hover/refresh:rotate-180 transition-transform duration-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span className="text-[13px]">Refresh</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {moduleVisibility.calendar && (
            <SidebarBtn
              active={currentView === 'calendar'}
              onClick={() => onViewChange('calendar')}
              icon={<CalendarIcon className="w-4 h-4" />}
              label="Calendar"
            />
          )}
          {moduleVisibility.database && (
            <SidebarBtn
              active={currentView === 'database'}
              onClick={() => onViewChange('database')}
              icon={<TableCellsIcon className="w-4 h-4" />}
              label="Database"
            />
          )}
        </div>

        {/* Integrated Calendar Logic (if in Calendar view) */}
        {currentView === 'calendar' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 px-3">
            <div className="rounded-xl overflow-hidden glass border border-graphon-border dark:border-graphon-dark-border mb-4">
              <CalendarSidebar selectedDate={selectedDate} onSelectDate={onSelectDate} />
            </div>
          </div>
        )}

        {/* Favorites Section */}
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

      {/* Footer Actions (Settings & Dark Mode) */}
      <div className="p-4 mt-auto flex items-center justify-between shrink-0">
        <button
          onClick={() => onViewChange('settings')}
          className={`
            p-2 rounded-xl transition-squish btn-squish
            ${
              currentView === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover hover:text-graphon-text-main dark:hover:text-white'
            }
          `}
          title="Settings"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover hover:text-graphon-text-main dark:hover:text-white transition-squish btn-squish"
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
        </button>
      </div>
    </div>
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
                    ? 'bg-blue-600 shadow-md text-white'
                    : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover hover:text-graphon-text-main dark:hover:text-white'
                }
            `}
    >
      <span className={active ? 'scale-110' : ''}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

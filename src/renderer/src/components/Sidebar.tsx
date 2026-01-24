import {
  DocumentTextIcon,
  CalendarIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  TableCellsIcon,
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  HomeIcon
} from '@heroicons/react/24/outline'
import type { ViewType, Note } from '../types'
import { useState, useEffect } from 'react'
import CalendarSidebar from './CalendarSidebar'

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
  notes: Note[]
  activeNoteId: string | null
  onCreateNote: () => void
  onSelectNote: (id: string) => void
  onDeleteNote: (id: string, e: React.MouseEvent) => void
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
  notes,
  activeNoteId,
  onCreateNote,
  onSelectNote,
  onDeleteNote,
  moduleVisibility
}: SidebarProps) {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false)

  // Auto-expand/collapse Notes section based on current view
  useEffect(() => {
    if (currentView === 'notes') {
      setIsNotesExpanded(true)
    } else {
      setIsNotesExpanded(false)
    }
  }, [currentView])

  return (
    <div className="w-72 h-full flex flex-col glass-sidebar transition-colors duration-300 overflow-hidden">
      {/* Header with Space Name and Toggle */}
      <div className="h-16 flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center space-x-3 overflow-hidden select-none">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 shadow-lg btn-squish">
            G
          </div>
          <span className="font-bold text-sm text-graphon-text-main dark:text-graphon-dark-text-main tracking-tight truncate">
            Graphon
          </span>
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

          <div className="flex flex-col">
             {/* Header Row */}
             <div className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors select-none cursor-pointer" 
                onClick={() => {
                   // Clicking the row usually expands
                   if (moduleVisibility.notes) {
                       setIsNotesExpanded(!isNotesExpanded)
                   }
                }}
             >
               {moduleVisibility.notes && (
                 <>
                   <div className="flex items-center flex-1 min-w-0 space-x-3" onClick={(e) => {
                       e.stopPropagation()
                       onViewChange('notes')
                       // Expanded state is handled by useEffect
                   }}>
                     <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center" style={{ minWidth: '16px', minHeight: '16px' }}>
                        <DocumentTextIcon className="w-4 h-4 text-graphon-text-secondary dark:text-graphon-dark-text-secondary block" />
                     </div>
                     <span className="text-sm font-semibold text-graphon-text-secondary dark:text-graphon-dark-text-secondary group-hover:text-graphon-text-main dark:group-hover:text-white truncate">Notes</span>
                   </div>
                   
                   {/* Toggle Chevron on Right */}
                   <div className="p-0.5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary flex-shrink-0">
                      <ChevronRightIcon className={`w-3 h-3 transition-transform duration-200 ${isNotesExpanded ? 'rotate-90' : ''}`} />
                   </div>
                 </>
               )}
             </div>
             
             {/* Notes List with Smooth Transition */}
             {moduleVisibility.notes && (
             <div 
               className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isNotesExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
             >
               <div className="overflow-hidden">
                 <div className="ml-2 mt-1 space-y-0.5">
                   {notes.map(note => (
                     <div 
                        key={note.id}
                        className={`
                          group/note flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-all cursor-pointer border-l-2
                          ${activeNoteId === note.id && currentView === 'notes'
                            ? 'bg-blue-600/10 border-blue-600 text-blue-600 dark:bg-white/10 dark:text-white font-medium'
                            : 'border-transparent text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover'
                          }
                        `}
                        onClick={() => onSelectNote(note.id)}
                     >
                       <span className="truncate flex-1 text-[13px] leading-none py-0.5">{note.title || 'Untitled'}</span>
                       <button
                          onClick={(e) => onDeleteNote(note.id, e)}
                          className="opacity-0 group-hover/note:opacity-100 p-0.5 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all scale-90"
                          title="Delete Note"
                       >
                         <TrashIcon className="w-3 h-3" />
                       </button>
                     </div>
                   ))}
                   
                   {/* New Page Button at Bottom of List */}
                   <button
                      onClick={onCreateNote}
                      className="w-full flex items-center px-2 py-1.5 rounded-md text-sm text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 hover:text-graphon-text-secondary dark:hover:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors group/add border-l-2 border-transparent"
                   >
                      <PlusIcon className="w-3 h-3 mr-1 group-hover/add:scale-110 transition-transform" />
                      <span className="text-[13px]">New Page</span>
                   </button>
                 </div>
               </div>
             </div>
             )}
          </div>

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
                  <span className="text-base flex-shrink-0">
                    {fav.icon || '📄'}
                  </span>
                  <span className="truncate">{fav.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions (Settings & Dark Mode) */}
      <div className="p-4 mt-auto flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => onViewChange('settings')}
          className={`
            p-2 rounded-xl transition-squish btn-squish
            ${currentView === 'settings' 
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

import { useState, useEffect, useMemo } from 'react'
import {
  DocumentTextIcon,
  ClockIcon,
  PlusIcon,
  SparklesIcon,
  BookOpenIcon,
  CalendarIcon,
  TableCellsIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import type { Note, ViewType, CalendarEvent, Database, Item } from '../types'
import { startOfWeek, addDays, format, isSameDay, isToday } from 'date-fns'

interface HomeViewProps {
  notes: Note[]
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onViewChange: (view: ViewType) => void
}

export default function HomeView({
  notes,
  onSelectNote,
  onCreateNote,
  onViewChange
}: HomeViewProps) {
  const [greeting, setGreeting] = useState('')
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [homeDatabase, setHomeDatabase] = useState<{
    name: string
    items: Item[]
    id: string
    icon?: string
  } | null>(null)

  // Database Selection State
  const [availableDatabases, setAvailableDatabases] = useState<Database[]>([])
  const [isSelectingDatabase, setIsSelectingDatabase] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Load All Events
  useEffect(() => {
    const savedEvents = localStorage.getItem('graphon-calendar-events')
    if (savedEvents) {
      try {
        const parsed: CalendarEvent[] = JSON.parse(savedEvents)
        const events = parsed.map((e) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate)
        }))
        setAllEvents(events)
      } catch (e) {
        console.error('Failed to load events', e)
      }
    }
  }, [])

  // Load Home Database & Available Databases
  useEffect(() => {
    const dbId = localStorage.getItem('graphon-home-database-id')

    // Scan localStorage for databases (naive approach)
    const dbs: Database[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('graphon-db-')) {
        try {
          const db = JSON.parse(localStorage.getItem(key)!)
          dbs.push(db)
        } catch (e) {
          console.error('Failed to parse db', key)
        }
      }
    }
    setAvailableDatabases(dbs)

    if (dbId) {
      const dbData = localStorage.getItem(`graphon-db-${dbId}`)
      if (dbData) {
        try {
          const db: Database = JSON.parse(dbData)
          setHomeDatabase({
            name: db.name,
            items: db.items.slice(0, 50), // Load more so we can scroll
            id: db.id,
            icon: db.icon
          })
        } catch (e) {
          console.error('Failed to load home database', e)
        }
      }
    }
  }, [])

  const handlePinDatabase = (db: Database) => {
    localStorage.setItem('graphon-home-database-id', db.id)
    setHomeDatabase({
      name: db.name,
      items: db.items.slice(0, 50),
      id: db.id,
      icon: db.icon
    })
    setIsSelectingDatabase(false)
  }

  // --- Mini Calendar Logic ---
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const displayedEvents = useMemo(() => {
    // Filter events for the selected DATE
    return allEvents
      .filter((e) => isSameDay(e.startDate, selectedDate))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [allEvents, selectedDate])

  // Check if days have events for dots
  const dayHasEvents = (day: Date) => {
    return allEvents.some((e) => isSameDay(e.startDate, day))
  }

  // Sort notes by updatedAt for "Recently visited"
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const handleCreateFromTemplate = (_templateId: string, _title: string, _description: string) => {
    onCreateNote()
  }

  const templates = [
    {
      id: 'template_1',
      title: 'Project Roadmap',
      description: 'Track milestones and deliverables.',
      imageColor:
        'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/20',
      icon: <TableCellsIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />,
      readTime: 'Template'
    },
    {
      id: 'template_2',
      title: 'Meeting Notes',
      description: 'Standard format for weekly recurring meetings.',
      imageColor:
        'bg-gradient-to-br from-(--color-accent)/10 to-(--color-accent)/20 dark:from-(--color-accent)/40 dark:to-(--color-accent)/20',
      icon: <DocumentTextIcon className="w-6 h-6 text-(--color-accent)" />,
      readTime: 'Template'
    },
    {
      id: 'template_3',
      title: 'Weekly Agenda',
      description: 'Plan your week ahead.',
      imageColor:
        'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/20',
      icon: <CalendarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />,
      readTime: 'Template'
    },
    {
      id: 'template_4',
      title: 'Brainstorming',
      description: 'Capture ideas and thoughts freely.',
      imageColor:
        'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/20',
      icon: <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
      readTime: 'Template'
    }
  ]

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden p-6 md:p-12 space-y-12">
      {/* Greeting Section */}
      <div className="text-center md:text-left flex flex-col items-center justify-center pt-8 pb-4">
        <h1 className="text-3xl font-bold text-graphon-text-main dark:text-white mb-2">
          {greeting}
        </h1>
      </div>

      {/* Recently Visited */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="flex items-center space-x-2 text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-4 px-1">
          <ClockIcon className="w-4 h-4" />
          <h2 className="text-xs font-semibold uppercase tracking-wider">Recently visited</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* New Page Card */}
          <button
            onClick={onCreateNote}
            className="group flex flex-col p-4 rounded-xl text-left bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-graphon-border dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200 w-full h-32 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-br from-transparent to-black/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="mb-auto">
              <DocumentTextIcon className="w-6 h-6 text-graphon-text-secondary dark:text-graphon-dark-text-secondary group-hover:text-(--color-accent) transition-colors" />
            </div>
            <div className="z-10">
              <span className="text-sm font-medium text-graphon-text-main dark:text-white block">
                New page
              </span>
              <span className="text-[10px] text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 mt-1 flex items-center">
                <PlusIcon className="w-3 h-3 mr-1" /> Create new
              </span>
            </div>
          </button>

          {recentNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className="group flex flex-col p-4 rounded-xl text-left bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-graphon-border dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200 w-full h-32 relative overflow-hidden"
            >
              <div className="mb-auto">
                <DocumentTextIcon className="w-5 h-5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
              </div>
              <div className="z-10">
                <span className="text-sm font-medium text-graphon-text-main dark:text-white block truncate w-full">
                  {note.title || 'Untitled'}
                </span>
                <span className="text-[10px] text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 mt-1">
                  {new Date(note.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Templates */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <div className="flex items-center space-x-2 text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-4 px-1">
          <SparklesIcon className="w-4 h-4" />
          <h2 className="text-xs font-semibold uppercase tracking-wider">Featured Templates</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() =>
                handleCreateFromTemplate(template.id, template.title, template.description)
              }
              className="group cursor-pointer flex flex-col rounded-xl overflow-hidden bg-white dark:bg-zinc-800/50 border border-graphon-border dark:border-white/5 shadow-sm hover:shadow-lg hover:border-(--color-accent)/30 dark:hover:border-(--color-accent)/30 transition-all duration-300"
            >
              {/* Image/Preview Top Area */}
              <div
                className={`h-32 w-full ${template.imageColor} flex items-center justify-center relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="transform group-hover:scale-110 transition-transform duration-500">
                  {template.icon}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-graphon-text-main dark:text-white mb-1 line-clamp-2">
                  {template.title}
                </h3>
                <p className="text-xs text-graphon-text-secondary dark:text-graphon-dark-text-secondary line-clamp-2 mb-4">
                  {template.description}
                </p>
                <div className="mt-auto flex items-center text-[10px] text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60">
                  <BookOpenIcon className="w-3 h-3 mr-1.5" />
                  {template.readTime}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Events & Home Views (Side by Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
        {/* Calendar / Events */}
        <section>
          <div className="flex items-center space-x-2 text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-4 px-1">
            <CalendarIcon className="w-4 h-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Calendar</h2>
          </div>

          <div className="bg-white dark:bg-zinc-800/30 rounded-xl border border-graphon-border dark:border-white/5 flex flex-col h-100">
            {/* Mini Calendar Header */}
            <div className="p-4 border-b border-graphon-border/50 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-graphon-text-main dark:text-white">
                {format(selectedDate, 'MMMM yyyy')}
              </h3>
              <div className="flex space-x-1">
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded"
                >
                  <ChevronLeftIcon className="w-4 h-4 text-zinc-500" />
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs font-medium px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded"
                >
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded"
                >
                  <ChevronRightIcon className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Mini Calendar Days */}
            <div className="flex justify-between px-4 py-2 bg-zinc-50/50 dark:bg-zinc-900/20 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="w-8 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="flex justify-between px-4 py-2">
              {weekDays.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate)
                const isTodayDate = isToday(day)
                const hasEvents = dayHasEvents(day)

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`
                                w-8 h-8 rounded-full flex flex-col items-center justify-center text-xs relative transition-all
                                ${
                                  isSelected
                                    ? 'bg-(--color-accent) text-white shadow-md scale-105'
                                    : isTodayDate
                                      ? 'bg-(--color-accent)/10 dark:bg-(--color-accent)/20 text-(--color-accent)'
                                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50 text-graphon-text-main dark:text-white'
                                }
                            `}
                  >
                    {format(day, 'd')}
                    {!isSelected && hasEvents && (
                      <div className="absolute bottom-1 w-1 h-1 bg-(--color-accent) rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Events List for Selected Day */}
            <div className="flex-1 overflow-auto p-2 bg-zinc-50/30 dark:bg-zinc-900/10 border-t border-graphon-border/50 dark:border-white/5">
              <div className="px-3 py-1 mb-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                {format(selectedDate, 'EEEE, MMM d')}
              </div>
              {displayedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <p className="text-xs text-zinc-400 mb-1">No events</p>
                  <button
                    onClick={() => onViewChange('calendar')}
                    className="text-xs text-(--color-accent) hover:opacity-80"
                  >
                    Open Calendar
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col px-3 py-2 bg-white dark:bg-zinc-800/80 rounded-lg border border-graphon-border/50 dark:border-white/5 shadow-sm"
                    >
                      <span className="text-sm font-medium text-graphon-text-main dark:text-white">
                        {event.title}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {formatEventTime(event.startDate)} - {formatEventTime(event.endDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Home Views / Database */}
        <section>
          <div className="flex items-center space-x-2 text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-4 px-1">
            <TableCellsIcon className="w-4 h-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Home views</h2>
          </div>

          <div className="bg-white dark:bg-zinc-800/30 rounded-xl border border-graphon-border dark:border-white/5 h-100 flex flex-col">
            {!homeDatabase ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 mb-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 flex items-center justify-center">
                  <TableCellsIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                </div>

                {!isSelectingDatabase ? (
                  <>
                    <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-6 max-w-xs">
                      Pin a database view to quickly access it from Home.
                    </p>
                    <button
                      onClick={() => {
                        // If we have databases, show list, else go to DB view
                        if (availableDatabases.length > 0) {
                          setIsSelectingDatabase(true)
                        } else {
                          onViewChange('database') // Go create one
                        }
                      }}
                      className="text-sm font-medium text-(--color-accent) hover:opacity-80 transition-colors"
                    >
                      Select database
                    </button>
                  </>
                ) : (
                  <div className="w-full max-w-xs animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 text-left">
                      Select to pin
                    </p>
                    <div className="max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800">
                      {availableDatabases.map((db) => (
                        <button
                          key={db.id}
                          onClick={() => handlePinDatabase(db)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50 flex items-center"
                        >
                          <span className="mr-2">{db.icon || '📋'}</span>
                          <span className="truncate">{db.name}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setIsSelectingDatabase(false)}
                      className="mt-3 text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-graphon-border/50 dark:border-white/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{homeDatabase.icon || '📋'}</span>{' '}
                    {/* We don't have icon in minimal state, just use default */}
                    <h3 className="font-medium text-graphon-text-main dark:text-white">
                      {homeDatabase.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        localStorage.removeItem('graphon-home-database-id')
                        setHomeDatabase(null)
                      }}
                      className="text-xs text-zinc-400 hover:text-red-500"
                    >
                      Unpin
                    </button>
                    <button
                      onClick={() => onViewChange('database')}
                      className="text-xs text-(--color-accent) hover:underline"
                    >
                      Open Full
                    </button>
                  </div>
                </div>
                <div className="p-2 space-y-1 overflow-auto flex-1 h-full">
                  {homeDatabase.items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                      <p className="text-xs">No items</p>
                      <button
                        onClick={() => onViewChange('database')}
                        className="mt-2 text-xs text-(--color-accent)"
                      >
                        + Add Item in Database
                      </button>
                    </div>
                  ) : (
                    homeDatabase.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 rounded-lg transition-colors cursor-default border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700/50"
                      >
                        <span className="text-sm text-graphon-text-main dark:text-white truncate flex-1">
                          {(item.values?.title as string) || 'Untitled'}
                        </span>
                        {/* Try to show Status if exists */}
                        {item.values?.Status && (
                          <span
                            className={`
                                        text-[10px] px-2 py-0.5 rounded-full font-medium ml-2
                                        ${
                                          item.values.Status === 'Done'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : item.values.Status === 'In Progress'
                                              ? 'bg-(--color-accent)/10 text-(--color-accent) dark:bg-(--color-accent)/20'
                                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                        }
                                   `}
                          >
                            {item.values.Status}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

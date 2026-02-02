import { useState, useEffect, useCallback, memo, useMemo } from 'react'
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  addDays
} from 'date-fns'
import type { CalendarEvent, PositionedEvent } from '../types'
import { useToast } from './Toast'
import ConfirmationModal from './ConfirmationModal'
import { useHistory } from '../hooks/useHistory'
import EventDetailsPanel from './EventDetailsPanel'
import { useKeybindings } from '../contexts/KeybindingContext'
import { WEEK_STARTS_ON, toDateOnly } from '../utils/calendarUtils'
import MonthView from './MonthView'
import { useVault } from '../contexts/VaultContext'
import { useDndMonitor, useDroppable, useDraggable, DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

// Constants for calendar layout
const HOUR_HEIGHT = 60 // Each hour slot is 60px tall
const MINUTES_IN_HOUR = 60
const SNAP_MINUTES = 15

export interface CalendarViewProps {
  isSidebarIntegrated?: boolean
  onToggleSidebar?: () => void

  // Controlled Interface
  events?: CalendarEvent[]
  onEventCreate?: (event: CalendarEvent) => void
  onEventUpdate?: (event: CalendarEvent) => void
  onEventDelete?: (eventId: string) => void

  // Selection
  selectedDate?: Date
  onSelectDate?: (date: Date) => void
}

// Memoized Event Card for performance
const EventCard = memo(function EventCard({
  event,
  style,
  isSelected,
  onClick,
  onResizeStart
}: {
  event: PositionedEvent
  style: { top: number; height: number; width: string; left: string }
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onResizeStart: (e: React.MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: {
      type: 'event',
      event
    }
  })

  const bgColor = event.color || 'bg-(--color-accent)'

  // Format time range
  const formatTimeRange = () => {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    const startStr = format(start, 'h:mm a')
    const endStr = format(end, 'h:mm a')
    return `${startStr} - ${endStr}`
  }

  const finalStyle = {
    ...style,
    top: `${style.top}px`,
    height: `${style.height}px`,
    // If dragging, we might want to disable left/width constraints or keep them?
    // dnd-kit transform handles movement.
    // However, if we move it, transform applies translation.
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    minHeight: '24px',
    cursor: isDragging ? 'grabbing' : 'pointer',
    zIndex: isDragging ? 50 : isSelected ? 20 : 10,
    opacity: isDragging ? 0.6 : 1
  }

  return (
    <div
      ref={setNodeRef}
      className={`
                absolute rounded-md px-2 py-1.5
                border border-black/10 dark:border-white/10
                ${bgColor} 
                ${isSelected ? 'ring-2 ring-(--color-accent) ring-offset-2 dark:ring-offset-[#191919]' : 'hover:brightness-110'}
                transition-all duration-200
            `}
      style={finalStyle}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div className="flex flex-col h-full overflow-hidden text-white">
        <div className="font-bold text-[11px] leading-tight truncate">
          {event.title || '(No Title)'}
        </div>
        {style.height > 28 && (
          <div className="text-[10px] text-white/80 font-medium mt-0.5">{formatTimeRange()}</div>
        )}
        {style.height > 55 && event.description && (
          <div className="text-[10px] text-white/70 mt-1 line-clamp-2">{event.description}</div>
        )}
      </div>

      {/* Resize Handle */}
      {/* Stop propagation of drag on resize handle? */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize z-30"
        onMouseDown={(e) => {
          e.stopPropagation() // Prevent dnd-kit drag start?
          onResizeStart(e)
        }}
        onPointerDown={(e) => e.stopPropagation()} // Important for dnd-kit
      />
    </div>
  )
})

export default function CalendarView({
  isSidebarIntegrated = true,
  events: externalEvents,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  selectedDate,
  onSelectDate
}: CalendarViewProps) {
  // View Type State
  const [viewType, setViewType] = useState<'week' | 'month'>('week')

  // Navigation State
  // Initialize from props if available
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate || new Date())
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  // Sync currentDate if selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate)
    }
  }, [selectedDate])

  // Data State
  const [internalEvents, setInternalEvents] = useState<CalendarEvent[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const isControlled = Array.isArray(externalEvents)

  // Selection state (Event selection)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // Resize State
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null)
  const [resizeStartY, setResizeStartY] = useState<number>(0)
  const [resizeOriginalDuration, setResizeOriginalDuration] = useState<number>(0)

  // Utilities
  const { showToast } = useToast()
  const history = useHistory()
  const {
    calendarEvents: vaultEvents,
    saveCalendar,
    updateCalendarEvent,
    addCalendarEvent,
    currentVaultPath,
    isLoading: vaultLoading
  } = useVault()

  // Load events from VaultContext (Uncontrolled only)
  useEffect(() => {
    if (isControlled) {
      setIsLoaded(true)
      return
    }
    // Use vault events when vault is loaded
    if (!vaultLoading && currentVaultPath) {
      setInternalEvents(vaultEvents)
      setIsLoaded(true)
    }
  }, [isControlled, vaultEvents, vaultLoading, currentVaultPath])

  // Save events to vault when they change (Uncontrolled only)
  useEffect(() => {
    if (isControlled || !isLoaded || !currentVaultPath) return
    // Debounce save to avoid excessive writes
    const timeout = setTimeout(() => {
      saveCalendar(internalEvents)
    }, 500)
    return () => clearTimeout(timeout)
  }, [internalEvents, isControlled, isLoaded, saveCalendar, currentVaultPath])
  // Derived Events
  const displayEvents = useMemo(() => {
    const baseEvents = isControlled ? externalEvents! : internalEvents

    if (resizingEvent) {
      return baseEvents.map((e) => (e.id === resizingEvent.id ? resizingEvent : e))
    }
    return baseEvents
  }, [isControlled, externalEvents, internalEvents, resizingEvent])

  // Drag and Drop Monitor
  useDndMonitor({
    onDragEnd: (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const activeType = active.data.current?.type
      const overId = over.id as string

      const dropDate = new Date(overId)
      if (isNaN(dropDate.getTime())) return

      const overRect = over.rect
      const activeRect = active.rect.current.translated

      if (!overRect || !activeRect) return

      const relativeY = activeRect.top - overRect.top
      const clampedY = Math.max(0, relativeY)

      const hours = clampedY / HOUR_HEIGHT
      const minutes = hours * 60
      const snappedMinutes = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES

      const finalStartDate = new Date(dropDate)
      finalStartDate.setHours(0, snappedMinutes, 0, 0)

      let duration = 60
      if (activeType === 'event') {
        const event = active.data.current?.event as CalendarEvent
        duration =
          (new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / (1000 * 60)
      }

      const finalEndDate = new Date(finalStartDate.getTime() + duration * 60000)

      if (activeType === 'task') {
        const task = active.data.current?.task
        addCalendarEvent({
          id: crypto.randomUUID(),
          title: task.content,
          startDate: finalStartDate,
          endDate: finalEndDate,
          color: 'bg-(--color-accent)',
          description: `From task: ${task.fileTitle}`,
          values: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        showToast('Event created from task', 'success')
      } else if (activeType === 'event') {
        const event = active.data.current?.event as CalendarEvent
        updateCalendarEvent(event.id, {
          startDate: finalStartDate,
          endDate: finalEndDate
        })
      }
    }
  })

  // Position events logic (Reuse existing helper or keep inside Render?)
  // The existing render loop called getPositionedEventsForDay(day)
  // We need to keep that logic.

  // --- Helpers ---
  const generateWeekDays = useCallback((): Date[] => {
    const days: Date[] = []
    const weekStart = startOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON }) // Monday Start
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }
    return days
  }, [currentDate])

  const weekDays = generateWeekDays()
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Navigation handlers
  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentDate(today)
    onSelectDate?.(toDateOnly(today))
  }, [onSelectDate])

  const goToPreviousWeek = useCallback(() => {
    setCurrentDate((prev) => subWeeks(prev, 1))
  }, [])

  const goToNextWeek = useCallback(() => {
    setCurrentDate((prev) => addWeeks(prev, 1))
  }, [])

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => subMonths(prev, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => addMonths(prev, 1))
  }, [])

  const jumpToDate = useCallback((year: number, month: number) => {
    const newDate = new Date(year, month, 1)
    setCurrentDate(newDate)
    setShowMonthPicker(false)
  }, [])

  const formatHour = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour} ${ampm}`
  }

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const getCurrentTimePosition = (): number => {
    const h = currentTime.getHours()
    const m = currentTime.getMinutes()
    return h * HOUR_HEIGHT + (m * HOUR_HEIGHT) / MINUTES_IN_HOUR
  }

  // Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    eventId: string | null
  }>({
    isOpen: false,
    eventId: null
  })

  // --- Actions ---

  // Wraps delete with confirmation check
  const handleDeleteRequest = (eventId: string) => {
    const shouldConfirm = localStorage.getItem('graphon-confirm-delete-event') !== 'false'
    if (shouldConfirm) {
      setDeleteConfirmation({ isOpen: true, eventId })
    } else {
      handleDeleteEvent(eventId)
    }
  }

  const handleCreateEvent = (day: Date, hour: number) => {
    const startDate = new Date(day)
    startDate.setHours(hour, 0, 0, 0)
    const endDate = new Date(startDate)
    endDate.setHours(hour, 30, 0, 0)

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: '(No Title)',
      startDate,
      endDate,
      day: startDate.getDay(),
      hour: startDate.getHours(),
      duration: 30,
      color: 'bg-(--color-accent)',
      values: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (isControlled) {
      onEventCreate?.(newEvent)
    } else {
      setInternalEvents((prev) => [...prev, newEvent])
      history.pushAction({
        type: 'CREATE',
        entityType: 'event',
        entityId: newEvent.id,
        previousState: null,
        newState: newEvent
      })
    }
    setSelectedEventId(newEvent.id)
  }

  const handleUpdateEvent = (updatedEvent: CalendarEvent) => {
    if (isControlled) {
      onEventUpdate?.(updatedEvent)
    } else {
      const previousEvent = internalEvents.find((e) => e.id === updatedEvent.id)
      setInternalEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)))

      if (previousEvent) {
        history.pushAction({
          type: 'UPDATE',
          entityType: 'event',
          entityId: updatedEvent.id,
          previousState: previousEvent,
          newState: updatedEvent
        })
      }
    }
  }

  const handleDeleteEvent = (eventId: string) => {
    if (isControlled) {
      onEventDelete?.(eventId)
    } else {
      const eventToDelete = internalEvents.find((e) => e.id === eventId)
      setInternalEvents((prev) => prev.filter((e) => e.id !== eventId))
      if (eventToDelete) {
        history.pushAction({
          type: 'DELETE',
          entityType: 'event',
          entityId: eventId,
          previousState: eventToDelete,
          newState: null
        })
      }
    }
    setSelectedEventId(null)
    showToast('Event deleted', 'success')
  }

  // --- Undo/Redo Handlers ---
  const { checkMatch } = useKeybindings()

  const handleUndo = useCallback(() => {
    if (isControlled) return // History not fully supported in controlled mode yet
    const action = history.undo()
    if (!action) return

    if (action.entityType === 'event') {
      switch (action.type) {
        case 'DELETE':
          if (action.previousState) {
            setInternalEvents((prev) => [...prev, action.previousState as CalendarEvent])
            showToast('Event restored', 'success')
          }
          break
        case 'CREATE':
          setInternalEvents((prev) => prev.filter((e) => e.id !== action.entityId))
          showToast('Event creation undone', 'success')
          break
        case 'UPDATE':
          if (action.previousState) {
            setInternalEvents((prev) =>
              prev.map((e) =>
                e.id === action.entityId ? (action.previousState as CalendarEvent) : e
              )
            )
            showToast('Changes undone', 'success')
          }
          break
      }
    }
  }, [history, showToast, isControlled])

  const handleRedo = useCallback(() => {
    if (isControlled) return
    const action = history.redo()
    if (!action) return

    if (action.entityType === 'event') {
      switch (action.type) {
        case 'DELETE':
          setInternalEvents((prev) => prev.filter((e) => e.id !== action.entityId))
          showToast('Event deleted again', 'success')
          break
        case 'CREATE':
          if (action.newState) {
            setInternalEvents((prev) => [...prev, action.newState as CalendarEvent])
            showToast('Event recreated', 'success')
          }
          break
        case 'UPDATE':
          if (action.newState) {
            setInternalEvents((prev) =>
              prev.map((e) => (e.id === action.entityId ? (action.newState as CalendarEvent) : e))
            )
            showToast('Changes reapplied', 'success')
          }
          break
      }
    }
  }, [history, showToast, isControlled])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (checkMatch(e, 'undo') && !isControlled) {
        e.preventDefault()
        handleUndo()
      }
      if (checkMatch(e, 'redo') && !isControlled) {
        e.preventDefault()
        handleRedo()
      }
      if (checkMatch(e, 'deleteItem') && selectedEventId) {
        e.preventDefault()
        handleDeleteRequest(selectedEventId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    history.canUndo,
    history.canRedo,
    handleUndo,
    handleRedo,
    isControlled,
    checkMatch,
    selectedEventId
  ])

  // --- Resizing ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingEvent) return

      const deltaY = e.clientY - resizeStartY
      const deltaMinutes = (deltaY / HOUR_HEIGHT) * MINUTES_IN_HOUR
      const rawNewDuration = resizeOriginalDuration + deltaMinutes
      const snappedDuration = Math.round(rawNewDuration / SNAP_MINUTES) * SNAP_MINUTES
      const newDuration = Math.max(SNAP_MINUTES, snappedDuration)

      // Update purely local resizing state for preview
      const newEndDate = new Date(resizingEvent.startDate)
      newEndDate.setMinutes(newEndDate.getMinutes() + newDuration)

      setResizingEvent({
        ...resizingEvent,
        duration: newDuration,
        endDate: newEndDate
      })
    }

    const handleMouseUp = () => {
      if (resizingEvent) {
        // Determine the "final" event based on the current resizing state
        // We need to commit this change via handleUpdateEvent
        handleUpdateEvent(resizingEvent)
        setResizingEvent(null)
      }
    }

    if (resizingEvent) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingEvent, resizeStartY, resizeOriginalDuration, isControlled]) // Dependencies updated

  // --- Layout Logic ---
  const getPositionedEventsForDay = useCallback(
    (day: Date): PositionedEvent[] => {
      const dayEvents = displayEvents.filter((event) => {
        const eventDate = new Date(event.startDate)
        return isSameDay(eventDate, day)
      })

      if (dayEvents.length === 0) return []

      const sorted = [...dayEvents].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      )

      const positioned: PositionedEvent[] = []
      const groups: CalendarEvent[][] = []

      for (const event of sorted) {
        let placed = false
        for (const group of groups) {
          const overlapsInGroup = group.some((ge) => {
            const eventStart = new Date(event.startDate).getTime()
            const eventEnd = new Date(event.endDate).getTime()
            const geStart = new Date(ge.startDate).getTime()
            const geEnd = new Date(ge.endDate).getTime()
            return eventStart < geEnd && eventEnd > geStart
          })
          if (overlapsInGroup) {
            group.push(event)
            placed = true
            break
          }
        }
        if (!placed) groups.push([event])
      }

      for (const group of groups) {
        const columns: CalendarEvent[][] = []
        for (const event of group) {
          let columnIdx = 0
          let placedInColumn = false
          while (!placedInColumn) {
            if (!columns[columnIdx]) columns[columnIdx] = []
            const canPlace = columns[columnIdx].every((ce) => {
              const eventStart = new Date(event.startDate).getTime()
              const eventEnd = new Date(event.endDate).getTime()
              const ceStart = new Date(ce.startDate).getTime()
              const ceEnd = new Date(ce.endDate).getTime()
              return eventStart >= ceEnd || eventEnd <= ceStart
            })
            if (canPlace) {
              columns[columnIdx].push(event)
              positioned.push({
                ...event,
                column: columnIdx,
                totalColumns: 0,
                top: 0,
                height: 0
              })
              placedInColumn = true
            } else columnIdx++
          }
        }
        const totalCols = columns.length
        for (const pe of positioned) {
          if (group.some((e) => e.id === pe.id)) pe.totalColumns = totalCols
        }
      }
      return positioned
    },
    [displayEvents]
  )

  const calculateEventStyle = (event: PositionedEvent) => {
    const startDate = new Date(event.startDate)
    const top =
      startDate.getHours() * HOUR_HEIGHT + (startDate.getMinutes() * HOUR_HEIGHT) / MINUTES_IN_HOUR
    const durationMinutes =
      event.duration || (event.endDate.getTime() - event.startDate.getTime()) / 60000

    const hasDescription = event.description && event.description.trim().length > 0
    const minHeight = hasDescription
      ? Math.max(60, (durationMinutes * HOUR_HEIGHT) / MINUTES_IN_HOUR)
      : 24
    const height = Math.max(minHeight, (durationMinutes * HOUR_HEIGHT) / MINUTES_IN_HOUR)

    const width =
      event.totalColumns > 1 ? `calc(${100 / event.totalColumns}% - 4px)` : 'calc(100% - 8px)'
    const left =
      event.totalColumns > 1 ? `calc(${(event.column / event.totalColumns) * 100}% + 4px)` : '4px'

    return { top, height, width, left }
  }

  // --- Render ---
  const years = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 10 + i)
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]
  const currentMonthYear = format(currentDate, 'MMMM yyyy')

  return (
    <div className="flex flex-1 h-full overflow-hidden text-graphon-text-main dark:text-graphon-dark-text-main font-sans">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Toolbar */}
        <div
          className={`
          h-14 border-b border-graphon-border dark:border-graphon-dark-border flex items-center justify-between px-4 shrink-0
          ${!isSidebarIntegrated ? 'pl-14' : ''}
        `}
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <button
                onClick={goToPreviousWeek}
                className="p-1.5 hover:bg-graphon-hover dark:hover:bg-graphon-dark-sidebar rounded-md text-graphon-text-secondary"
                title="Previous Week"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={goToNextWeek}
                className="p-1.5 hover:bg-graphon-hover dark:hover:bg-graphon-dark-sidebar rounded-md text-graphon-text-secondary"
                title="Next Week"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="text-xl font-bold hover:bg-graphon-hover dark:hover:bg-graphon-dark-sidebar px-3 py-1 rounded-lg flex items-center gap-2"
              >
                {currentMonthYear}{' '}
                <CalendarIcon className="w-4 h-4 text-graphon-text-secondary/50" />
              </button>
              {/* Month Picker Dropdown */}
              {showMonthPicker && (
                <div className="absolute top-full left-0 mt-2 bg-graphon-bg dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-graphon-dark-border rounded-xl shadow-xl z-50 p-4 min-w-70">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={goToPreviousMonth}
                      className="p-1 hover:bg-gray-100 rounded-md"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="font-semibold">{format(currentDate, 'yyyy')}</span>
                    <button onClick={goToNextMonth} className="p-1 hover:bg-gray-100 rounded-md">
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((month, idx) => (
                      <button
                        key={month}
                        onClick={() => jumpToDate(currentDate.getFullYear(), idx)}
                        className={`px-2 py-2 text-sm rounded-lg ${currentDate.getMonth() === idx ? 'bg-(--color-accent) text-white' : 'hover:bg-graphon-hover dark:hover:bg-graphon-dark-sidebar'}`}
                      >
                        {month.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-graphon-border dark:border-graphon-dark-border">
                    <select
                      value={currentDate.getFullYear()}
                      onChange={(e) => jumpToDate(parseInt(e.target.value), currentDate.getMonth())}
                      className="w-full px-3 py-2 text-sm bg-graphon-hover dark:bg-graphon-dark-sidebar border-none rounded-lg text-graphon-text-main dark:text-graphon-dark-text-main"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-semibold bg-graphon-hover dark:bg-graphon-dark-sidebar hover:bg-graphon-hover/80 dark:hover:bg-graphon-dark-sidebar/80 rounded-lg border border-graphon-border/30 dark:border-graphon-dark-border/20"
            >
              Today
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {!isControlled && history.isEnabled && (
              <div className="flex items-center space-x-1 mr-2">
                <button
                  onClick={handleUndo}
                  disabled={!history.canUndo}
                  className={`p-1.5 rounded-md ${history.canUndo ? 'hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover' : 'opacity-50 cursor-not-allowed'}`}
                  title="Undo (Ctrl+Z)"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!history.canRedo}
                  className={`p-1.5 rounded-md ${history.canRedo ? 'hover:bg-graphon-hover dark:hover:bg-graphon-dark-sidebar' : 'opacity-50 cursor-not-allowed'}`}
                  title="Redo (Ctrl+Y)"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                  </svg>
                </button>
              </div>
            )}
            <div className="hidden sm:flex bg-graphon-hover dark:bg-graphon-dark-sidebar rounded-lg p-1 items-center border border-graphon-border/30 dark:border-graphon-dark-border/20">
              <button
                onClick={() => setViewType('week')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-shadow ${viewType === 'week' ? 'bg-white dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-graphon-dark-border text-graphon-text-main dark:text-white' : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary'}`}
              >
                Week
              </button>
              <button
                onClick={() => setViewType('month')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-shadow ${viewType === 'month' ? 'bg-white dark:bg-[#191919] border border-graphon-border/30 dark:border-graphon-dark-border/20 text-graphon-text-main dark:text-white' : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary'}`}
              >
                Month
              </button>
            </div>
            <button
              onClick={() => handleCreateEvent(currentDate, 9)}
              className="bg-(--color-accent) hover:brightness-110 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center transition-all active:scale-95"
            >
              <PlusIcon className="w-4 h-4 mr-1.5" />
              New Event
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto relative scrollbar-thin">
          {viewType === 'month' ? (
            <MonthView
              selectedDate={selectedDate || currentDate}
              onSelectDate={onSelectDate}
              onNavigateDate={(date) => setCurrentDate(date)}
              events={displayEvents}
            />
          ) : (
            <div className="min-w-200 pb-10">
              {/* Days Header */}
              <div className="sticky top-0 z-20 bg-graphon-bg/95 dark:bg-graphon-dark-bg/95 backdrop-blur-md border-b border-graphon-border dark:border-graphon-dark-border flex">
                <div className="w-16 shrink-0 border-r border-graphon-border/30 dark:border-graphon-dark-border/10" />
                {weekDays.map((day) => {
                  const dayIsToday = isToday(day)
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

                  return (
                    <div
                      key={day.toISOString()}
                      className="flex-1 py-4 text-center border-r border-gray-100 dark:border-gray-800/50 last:border-r-0"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                        {format(day, 'EEE')}
                      </div>
                      <div
                        className={`
                        inline-flex items-center justify-center w-9 h-9 rounded-full text-xl font-bold
                        ${dayIsToday ? 'bg-(--color-accent) text-white shadow-lg' : 'text-gray-800 dark:text-gray-200'}
                        ${isSelected && !dayIsToday ? 'ring-2 ring-(--color-accent)' : ''}
                        ${isSelected && dayIsToday ? 'ring-2 ring-white dark:ring-[#191919] ring-offset-2 ring-offset-(--color-accent)' : ''} 
                      `}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Body */}
              <div className="flex">
                <div className="w-16 shrink-0 border-r border-gray-100 dark:border-gray-800/50 bg-white dark:bg-[#191919] z-10">
                  {hours.map((h) => (
                    <div key={h} className="relative h-15">
                      <div className="absolute -top-3 right-2 text-[10px] text-gray-400 font-bold uppercase">
                        {h !== 0 && formatHour(h).replace(' ', '')}
                      </div>
                    </div>
                  ))}
                </div>
                {weekDays.map((day) => {
                  const positionedEvents = getPositionedEventsForDay(day)
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                  const timePos = isToday(day) ? getCurrentTimePosition() : null

                  return (
                    <DayColumn
                      key={day.toISOString()}
                      day={day}
                      hours={hours}
                      events={positionedEvents}
                      isSelected={isSelected}
                      selectedEventId={selectedEventId}
                      currentTimePosition={timePos}
                      onEventClick={(_e, event) => setSelectedEventId(event.id)}
                      onResizeStart={(e, event) => {
                        setResizingEvent(event)
                        setResizeStartY(e.clientY)
                        const initialDuration =
                          event.duration ||
                          (new Date(event.endDate).getTime() -
                            new Date(event.startDate).getTime()) /
                            60000
                        setResizeOriginalDuration(initialDuration)
                      }}
                      calculateStyle={calculateEventStyle}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Overlay for month picker */}
        {showMonthPicker && (
          <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
        )}
      </div>

      {/* Event Details Panel */}
      {selectedEventId &&
        (() => {
          const selectedEvent = isControlled
            ? externalEvents?.find((e) => e.id === selectedEventId)
            : internalEvents.find((e) => e.id === selectedEventId)

          if (!selectedEvent) return null

          return (
            <EventDetailsPanel
              isOpen={true}
              event={selectedEvent}
              onClose={() => setSelectedEventId(null)}
              onDelete={() => handleDeleteRequest(selectedEvent.id)}
              onSave={handleUpdateEvent}
            />
          )
        })()}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone unless you use the Undo feature."
        isDanger={true}
        showDontAskAgain={true}
        confirmText="Delete"
        onConfirm={(dontAskAgain) => {
          if (deleteConfirmation.eventId) {
            handleDeleteEvent(deleteConfirmation.eventId)
            if (dontAskAgain) {
              localStorage.setItem('graphon-confirm-delete-event', 'false')
            }
          }
          setDeleteConfirmation({ isOpen: false, eventId: null })
        }}
        onCancel={() => setDeleteConfirmation({ isOpen: false, eventId: null })}
      />
    </div>
  )
}

interface DayColumnProps {
  day: Date
  hours: number[]
  events: PositionedEvent[]
  isSelected: boolean
  selectedEventId: string | null
  currentTimePosition: number | null
  onEventClick: (e: React.MouseEvent, event: CalendarEvent) => void
  onResizeStart: (e: React.MouseEvent, event: CalendarEvent) => void
  calculateStyle: (event: PositionedEvent) => {
    top: number
    height: number
    width: string
    left: string
  }
}

function DayColumn({
  day,
  hours,
  events,
  isSelected,
  selectedEventId,
  currentTimePosition,
  onEventClick,
  onResizeStart,
  calculateStyle
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString()
  })

  return (
    <div
      ref={setNodeRef}
      className={`
                flex-1 relative border-r border-gray-100 dark:border-gray-800/50 last:border-r-0 h-360
                ${isSelected ? 'bg-(--color-accent)/5 dark:bg-(--color-accent)/10' : ''}
                ${isOver ? 'bg-(--color-accent)/20 dark:bg-(--color-accent)/20' : ''}
            `}
    >
      {/* Horizontal grid lines */}
      {hours.map((h) => (
        <div
          key={h}
          className="absolute w-full border-b border-gray-50 dark:border-gray-800/30"
          style={{ top: `${h * 60}px` }}
        />
      ))}

      {/* Current Time Indicator */}
      {currentTimePosition !== null && (
        <div className="current-time-line" style={{ top: `${currentTimePosition}px` }}>
          <div className="current-time-dot" />
        </div>
      )}

      {events.map((event) => {
        const style = calculateStyle(event)
        const isSelectedEvent = selectedEventId === event.id
        return (
          <EventCard
            key={event.id}
            event={event}
            style={style}
            isSelected={isSelectedEvent}
            onClick={(e) => {
              e.stopPropagation()
              onEventClick(e, event)
            }}
            onResizeStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onResizeStart(e, event)
            }}
          />
        )
      })}
    </div>
  )
}

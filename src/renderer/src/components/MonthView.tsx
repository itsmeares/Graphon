import { isSameMonth, isToday, isSameDay } from 'date-fns'
import { useMemo, useState, useEffect } from 'react'
import { getMonthGrid, getWeekDays, toDateOnly } from '../utils/calendarUtils'
import type { CalendarEvent } from '../types'

interface MonthViewProps {
  selectedDate?: Date
  onSelectDate?: (date: Date) => void
  onNavigateDate?: (date: Date) => void
  events?: CalendarEvent[]
}

export default function MonthView({
  selectedDate,
  onSelectDate,
  onNavigateDate,
  events = []
}: MonthViewProps) {
  // Internal navigation state independent of selection,
  // but can sync if selection moves to another month.
  const [viewDate, setViewDate] = useState(selectedDate || new Date())

  // Sync internal view if selectedDate changes dramatically (optional choice,
  // but often good to keep context)
  useEffect(() => {
    if (selectedDate && !isSameMonth(selectedDate, viewDate)) {
      setViewDate(selectedDate)
    }
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const grid = useMemo(() => {
    return getMonthGrid(viewDate.getFullYear(), viewDate.getMonth())
  }, [viewDate])

  const weeks = useMemo(() => getWeekDays(), [])

  const handleDateClick = (day: Date) => {
    onSelectDate?.(toDateOnly(day))
    // Also navigate view if clicking a grayed out day from prev/next month
    if (!isSameMonth(day, viewDate)) {
      setViewDate(day)
      onNavigateDate?.(day)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden transition-colors duration-300">
      <div className="flex-1 flex flex-col p-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-graphon-border dark:border-graphon-dark-border mb-2">
          {weeks.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary uppercase tracking-widest px-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-graphon-border dark:bg-graphon-dark-border border border-graphon-border dark:border-graphon-dark-border rounded-lg overflow-hidden">
          {grid.map((week, wIdx) =>
            week.map((day, dIdx) => {
              const isCurrentMonth = isSameMonth(day, viewDate)
              const dayIsToday = isToday(day)
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

              const dayEvents = events.filter((e) => isSameDay(new Date(e.startDate), day))

              return (
                <div
                  key={`${wIdx}-${dIdx}`}
                  onClick={() => handleDateClick(day)}
                  className={`
                        min-h-25 p-2 relative cursor-pointer hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors flex flex-col gap-1
                         ${!isCurrentMonth ? 'bg-graphon-sidebar dark:bg-graphon-dark-sidebar opacity-60' : 'bg-white dark:bg-graphon-dark-bg'}
                         ${isSelected ? 'ring-1 ring-(--color-accent) z-10' : ''}
                       `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`
                                 text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                                 ${
                                   dayIsToday
                                     ? 'bg-(--color-accent) text-white font-bold'
                                     : isCurrentMonth
                                       ? 'text-graphon-text-main dark:text-graphon-dark-text-main'
                                       : 'text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50'
                                 }
                             `}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Events List */}
                  <div className="flex-1 overflow-hidden space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate text-white ${event.color || 'bg-(--color-accent)'}`}
                      >
                        {event.title || 'Untitled'}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-graphon-text-secondary dark:text-graphon-dark-text-secondary pl-1 font-medium">
                        + {dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

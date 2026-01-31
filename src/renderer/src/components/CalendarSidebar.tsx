import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { addMonths, subMonths, format, isSameMonth, isToday, isSameDay } from 'date-fns'
import { useState, useMemo, useEffect } from 'react'
import { getMonthGrid, toDateOnly } from '../utils/calendarUtils'

interface CalendarSidebarProps {
  selectedDate?: Date
  onSelectDate?: (date: Date) => void
}

export default function CalendarSidebar({ selectedDate, onSelectDate }: CalendarSidebarProps) {
  // Local view state (which month we are looking at in the sidebar)
  // Initialize to selectedDate's month or today
  const [viewDate, setViewDate] = useState(selectedDate || new Date())

  // Sync viewDate if selectedDate changes drastically?
  // Optionally, we can jump to the month of the selected date if it changes externally.
  useEffect(() => {
    if (selectedDate) {
      // Only jump if it's a different month to avoid jarring jumps if we were browsing
      if (!isSameMonth(selectedDate, viewDate)) {
        setViewDate(selectedDate)
      }
    }
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1))
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1))

  const grid = useMemo(() => {
    return getMonthGrid(viewDate.getFullYear(), viewDate.getMonth())
  }, [viewDate])

  const handleDateClick = (day: Date) => {
    onSelectDate?.(toDateOnly(day))
  }

  const currentMonthLabel = format(viewDate, 'MMMM yyyy')

  return (
    <div className="flex flex-col bg-transparent">
      {/* Mini Calendar Section */}
      <div className="p-4 px-2">
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-sm font-bold text-graphon-text-main dark:text-graphon-dark-text-main">
            {currentMonthLabel}
          </span>
          <div className="flex space-x-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-graphon-hover dark:hover:bg-graphon-dark-sidebar rounded-md transition-colors"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-graphon-hover dark:hover:bg-graphon-dark-sidebar rounded-md transition-colors"
            >
              <ChevronRightIcon className="w-3.5 h-3.5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
            </button>
          </div>
        </div>

        {/* Mini Calendar Grid */}
        <div className="grid grid-cols-7 gap-0 text-center text-[10px] mb-1">
          {/* Week starts on Monday (1) -> Mon, Tue... */}
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div
              key={i}
              className="text-graphon-text-secondary dark:text-graphon-dark-text-secondary font-bold uppercase py-1"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0 text-center text-xs">
          {grid.map((week, wIdx) =>
            week.map((day, dIdx) => {
              const dayIsToday = isToday(day)
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
              const isCurrentMonth = isSameMonth(day, viewDate)

              return (
                <div
                  key={`${wIdx}-${dIdx}`}
                  onClick={() => handleDateClick(day)}
                  className={`
                    w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 relative text-[11px] btn-squish
                    ${!isCurrentMonth ? 'text-graphon-text-secondary/30 dark:text-graphon-dark-text-secondary/30' : 'text-graphon-text-main dark:text-graphon-dark-text-main'}
                    ${
                      dayIsToday
                        ? 'bg-(--color-accent) text-white font-bold shadow-sm'
                        : 'hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover'
                    }
                    ${
                      isSelected && !dayIsToday
                        ? 'ring-2 ring-(--color-accent)/50 bg-(--color-accent)/10 dark:bg-(--color-accent)/20 font-bold text-(--color-accent)'
                        : isSelected && dayIsToday
                          ? 'ring-2 ring-(--color-accent) ring-offset-2 dark:ring-offset-[#1C1C1A] ring-offset-graphon-bg'
                          : ''
                    }
                  `}
                >
                  {day.getDate()}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="mx-4 h-px bg-graphon-border dark:bg-graphon-dark-border my-2 opacity-50" />

      {/* Tasks Section */}
      <TasksList />

      {/* Calendar Sources */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between text-[10px] font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-3 tracking-widest uppercase px-1">
          <span>My Calendars</span>
        </div>
        <ul className="space-y-1">
          <SidebarItem label="Graphon Personal" color="bg-(--color-accent)" active />
          <SidebarItem label="Work" color="bg-green-500" active />
          <SidebarItem label="Family" color="bg-purple-500" />
          <SidebarItem label="Birthdays" color="bg-amber-500" />
        </ul>
      </div>

      {/* Add Calendar Action */}
      <div className="p-4">
        <button className="flex items-center text-xs font-medium text-graphon-text-secondary hover:text-graphon-text-main dark:hover:text-gray-200 cursor-pointer transition-colors group w-full">
          <div className="w-5 h-5 rounded bg-graphon-hover dark:bg-graphon-dark-sidebar flex items-center justify-center mr-2 group-hover:bg-graphon-hover/80 dark:group-hover:bg-graphon-dark-sidebar/80 transition-colors">
            <PlusIcon className="w-3 h-3" />
          </div>
          <span>Add Calendar</span>
        </button>
      </div>
    </div>
  )
}

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

function TasksList() {
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    // Poll tasks or listen to updates (for now just fetch once)
    // In a real app we'd want a subscription or context for tasks
    window.api.getAllTasks().then(setTasks)
  }, [])

  if (tasks.length === 0) return null

  return (
    <>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between text-[10px] font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-3 tracking-widest uppercase px-1">
          <span>Tasks</span>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
          {tasks
            .filter((t) => !t.completed)
            .map((task) => (
              <DraggableTask key={task.id} task={task} />
            ))}
        </div>
      </div>
      <div className="mx-4 h-px bg-graphon-border dark:bg-graphon-dark-border my-2 opacity-50" />
    </>
  )
}

function DraggableTask({ task }: { task: any }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: 'task',
      task
    }
  })

  const style = {
    transform: CSS.Translate.toString(transform)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-2 bg-white dark:bg-graphon-dark-sidebar rounded-md shadow-sm border border-graphon-border dark:border-graphon-dark-border text-xs cursor-move hover:border-(--color-accent) transition-colors select-none"
    >
      <div className="font-medium text-graphon-text-main dark:text-graphon-dark-text-main truncate">
        {task.content}
      </div>
      <div className="text-[10px] text-graphon-text-secondary dark:text-graphon-dark-text-secondary truncate mt-0.5">
        {task.fileTitle}
      </div>
    </div>
  )
}

function SidebarItem({
  label,
  color,
  active = false
}: {
  label: string
  color: string
  active?: boolean
}) {
  return (
    <li className="flex items-center group cursor-pointer px-1 py-1 rounded-md hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors">
      <div
        className={`w-3 h-3 rounded-xs mr-3 ${color} ${active ? 'opacity-100' : 'opacity-40'} group-hover:opacity-100 transition-opacity`}
      />
      <span
        className={`text-[13px] font-medium ${active ? 'text-graphon-text-main dark:text-graphon-dark-text-main' : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary'} group-hover:text-graphon-text-main dark:group-hover:text-graphon-dark-text-main transition-colors`}
      >
        {label}
      </span>
    </li>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

import { useState, useEffect, useRef } from 'react'
import { XMarkIcon, TrashIcon, ClockIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { CalendarEvent } from '../types'
import ConfirmDialog from './ConfirmDialog'

interface EventDetailsPanelProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedEvent: CalendarEvent) => void
  onDelete: (eventId: string) => void
  onShowToast?: (message: string, type: 'success' | 'error') => void
  hasOverlap?: boolean
  onOverlapConfirm?: () => void
}

export default function EventDetailsPanel({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onShowToast,
  hasOverlap,
  onOverlapConfirm
}: EventDetailsPanelProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [color, setColor] = useState('bg-(--color-accent)')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showOverlapWarning, setShowOverlapWarning] = useState(false)

  // Reset state when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      setStartDate(new Date(event.startDate))
      setEndDate(new Date(event.endDate))
      setColor(event.color || 'bg-(--color-accent)')
      setHasUnsavedChanges(false)
    }
  }, [event])

  // Track changes
  useEffect(() => {
    if (event) {
      const hasChanges =
        title !== event.title ||
        description !== (event.description || '') ||
        startDate.getTime() !== new Date(event.startDate).getTime() ||
        endDate.getTime() !== new Date(event.endDate).getTime() ||
        color !== (event.color || 'bg-(--color-accent)')
      setHasUnsavedChanges(hasChanges)
    }
  }, [title, description, startDate, endDate, color, event])

  const handleSave = () => {
    if (!event) return

    // Check for overlap
    if (hasOverlap) {
      setShowOverlapWarning(true)
      return
    }

    doSave()
  }

  const doSave = () => {
    if (!event) return

    onSave({
      ...event,
      title: title || '(No Title)',
      description,
      startDate,
      endDate,
      color,
      duration: (endDate.getTime() - startDate.getTime()) / 60000
    })

    setHasUnsavedChanges(false)
    onShowToast?.('Saved!', 'success')
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (!event) return
    onDelete(event.id)
    setShowDeleteConfirm(false)
  }

  const handleOverlapConfirm = () => {
    setShowOverlapWarning(false)
    onOverlapConfirm?.()
    doSave()
  }

  if (!isOpen || !event) return null

  return (
    <>
      <div className="w-80 h-full bg-white dark:bg-graphon-dark-bg border-l border-graphon-border dark:border-graphon-dark-border flex flex-col shadow-2xl z-30 transition-colors duration-300">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-graphon-border dark:border-graphon-dark-border">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary uppercase tracking-widest">
              Event Details
            </span>
            {hasUnsavedChanges && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--color-accent)/10 text-(--color-accent) font-bold">
                Modified
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-graphon-text-secondary hover:text-graphon-text-main dark:hover:text-white hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover rounded-md transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Title Input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add Title"
              className="w-full text-xl font-bold bg-transparent border-none p-0 focus:ring-0 text-graphon-text-main dark:text-graphon-dark-text-main placeholder-graphon-text-secondary/30"
            />
          </div>

          {/* Time Section */}
          <div className="space-y-3">
            <div className="flex items-center text-graphon-text-secondary dark:text-graphon-dark-text-secondary text-xs font-bold uppercase tracking-widest px-1">
              <ClockIcon className="w-4 h-4 mr-2" />
              <span>Time</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Start Time Picker */}
              <TimePicker
                date={startDate}
                onChange={(newDate) => {
                  setStartDate(newDate)
                  // Auto adjust end date if needed to keep duration
                  if (newDate > endDate) {
                    const newEnd = new Date(newDate.getTime() + 30 * 60000)
                    setEndDate(newEnd)
                  }
                }}
              />
              {/* End Time Picker */}
              <TimePicker
                date={endDate}
                minTime={startDate}
                onChange={(newDate) => setEndDate(newDate)}
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary uppercase tracking-widest mb-3 px-1">
              Color
            </label>
            <div className="flex space-x-2.5">
              {[
                'bg-(--color-accent)',
                'bg-red-500',
                'bg-green-500',
                'bg-yellow-500',
                'bg-purple-500',
                'bg-gray-500'
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-2 ring-(--color-accent) dark:ring-offset-graphon-dark-bg' : ''} transition-all`}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description..."
              className="w-full h-32 bg-graphon-hover dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-graphon-dark-border rounded-lg p-3 text-sm text-graphon-text-main dark:text-graphon-dark-text-main placeholder-graphon-text-secondary/50 resize-none focus:ring-1 focus:ring-(--color-accent)/30 outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-graphon-border dark:border-graphon-dark-border space-y-3 bg-graphon-sidebar dark:bg-graphon-dark-sidebar/40">
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={`
                            w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all
                            ${
                              hasUnsavedChanges
                                ? 'bg-(--color-accent) hover:brightness-110 text-white border border-(--color-accent)/50 shadow-sm active:scale-[0.98]'
                                : 'bg-graphon-hover dark:bg-graphon-dark-hover text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50 cursor-not-allowed border border-graphon-border dark:border-graphon-dark-border'
                            }
                        `}
          >
            <CheckIcon className="w-4 h-4" />
            Save Changes
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border border-transparent hover:border-red-500/20"
          >
            <TrashIcon className="w-4 h-4" />
            Delete Event
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Overlap Warning Dialog */}
      <ConfirmDialog
        isOpen={showOverlapWarning}
        title="Schedule Conflict"
        message="This event overlaps with another event on your calendar. Both events will be displayed side-by-side. Do you want to continue?"
        confirmLabel="Save Anyway"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleOverlapConfirm}
        onCancel={() => setShowOverlapWarning(false)}
      />
    </>
  )
}

// Custom Time Picker Component
function TimePicker({
  date,
  onChange,
  minTime
}: {
  date: Date
  onChange: (date: Date) => void
  minTime?: Date
}) {
  // Generate time slots every 15 mins
  const generateTimeSlots = () => {
    const slots: string[] = []
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 60; j += 15) {
        const hour = i === 0 ? 12 : i > 12 ? i - 12 : i
        const ampm = i < 12 ? 'AM' : 'PM'
        const minute = j.toString().padStart(2, '0')
        slots.push(`${hour}:${minute} ${ampm}`)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  const formatTime = (d: Date) => {
    let hour = d.getHours()
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12
    hour = hour ? hour : 12
    const minute = d.getMinutes().toString().padStart(2, '0')
    return `${hour}:${minute} ${ampm}`
  }

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [containerRef])

  const handleSelectTime = (timeStr: string) => {
    // Parse timeStr "10:30 AM" back to Date
    const [time, modifier] = timeStr.split(' ')
    let [hours, minutes] = time.split(':').map(Number)

    if (hours === 12) hours = 0
    if (modifier === 'PM') hours += 12

    const newDate = new Date(date)
    newDate.setHours(hours)
    newDate.setMinutes(minutes)

    // Validation if minTime provided (for End Date)
    if (minTime && newDate < minTime) {
      return // Do nothing or shake?
    }

    onChange(newDate)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-3 py-2 bg-graphon-hover dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-graphon-dark-border rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main hover:bg-graphon-hover/80 dark:hover:bg-graphon-dark-hover transition-colors focus:outline-none focus:ring-1 focus:ring-(--color-accent)/50"
      >
        {formatTime(date)}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-graphon-dark-border rounded-lg shadow-xl z-50">
          {timeSlots.map((slot, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectTime(slot)}
              className={`
                                px-3 py-1.5 text-sm cursor-pointer
                                hover:bg-(--color-accent)/10 text-graphon-text-main dark:text-graphon-dark-text-main transition-colors
                                ${slot === formatTime(date) ? 'bg-(--color-accent)/20 text-(--color-accent) font-bold' : ''}
                            `}
            >
              {slot}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

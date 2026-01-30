import { startOfWeek, startOfMonth, addDays, format, isSameDay } from 'date-fns'

// WEEK STARTS ON MONDAY (1)
export const WEEK_STARTS_ON = 1

/**
 * Normalizes a date to midnight local time to avoid time component mismatches.
 */
export function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Checks if two dates are the same day.
 */
export function isSameDate(d1: Date | null, d2: Date | null): boolean {
  if (!d1 || !d2) return false
  return isSameDay(d1, d2)
}

/**
 * Generates a 6x7 grid of dates for a given month view, including overflow from prev/next months.
 * Ensures rows start on Monday.
 */
export function getMonthGrid(year: number, month: number): Date[][] {
  const viewDate = new Date(year, month, 1)
  const monthStart = startOfMonth(viewDate)

  const startDate = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON })
  // We want to ensure we cover at least the full month and often a full 6 weeks for consistent height
  // or just enough to cover the month. Standard calendars often use 6 rows.
  // Let's generate 42 days (6 weeks * 7 days).

  const grid: Date[][] = []
  let current = startDate

  for (let week = 0; week < 6; week++) {
    const row: Date[] = []
    for (let day = 0; day < 7; day++) {
      row.push(new Date(current))
      current = addDays(current, 1)
    }
    grid.push(row)
  }

  return grid
}

/**
 * Returns an array of formatted weekday names (e.g., 'Mon', 'Tue'...) starting from Monday.
 */
export function getWeekDays(): string[] {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })
  const days: string[] = []

  for (let i = 0; i < 7; i++) {
    days.push(format(addDays(start, i), 'EEE')) // 'Mon', 'Tue', etc.
  }
  return days
}

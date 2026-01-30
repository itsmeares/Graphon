import { describe, it, expect } from 'vitest'
import { toDateOnly, getMonthGrid, getWeekDays, WEEK_STARTS_ON } from './calendarUtils'
import { getDay } from 'date-fns'

describe('calendarUtils', () => {
  describe('WEEK_STARTS_ON', () => {
    it('should be 1 (Monday)', () => {
      expect(WEEK_STARTS_ON).toBe(1)
    })
  })

  describe('toDateOnly', () => {
    it('should normalize a date to midnight', () => {
      const date = new Date(2026, 0, 20, 14, 30, 0) // Jan 20 2026 2:30 PM
      const normalized = toDateOnly(date)

      expect(normalized.getHours()).toBe(0)
      expect(normalized.getMinutes()).toBe(0)
      expect(normalized.getSeconds()).toBe(0)
      expect(normalized.getDate()).toBe(20)
      expect(normalized.getMonth()).toBe(0)
      expect(normalized.getFullYear()).toBe(2026)
    })
  })

  describe('getWeekDays', () => {
    it('should return 7 days starting with Mon', () => {
      const days = getWeekDays()
      expect(days).toHaveLength(7)
      expect(days[0]).toBe('Mon')
      expect(days[1]).toBe('Tue')
      expect(days[6]).toBe('Sun')
    })
  })

  describe('getMonthGrid', () => {
    it('should return a 6x7 grid', () => {
      const grid = getMonthGrid(2026, 0) // Jan 2026
      expect(grid).toHaveLength(6)
      grid.forEach((row) => {
        expect(row).toHaveLength(7)
      })
    })

    it('should start weeks on Monday', () => {
      const grid = getMonthGrid(2026, 0) // Jan 2026
      // Jan 1 2026 is a Thursday.
      // If week starts on Monday, the first day of the grid should be prev Monday: Dec 29 2025.

      const firstCell = grid[0][0]
      expect(getDay(firstCell)).toBe(1) // Monday
      expect(firstCell.getMonth()).toBe(11) // Dec
      expect(firstCell.getDate()).toBe(29)
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CalendarSidebar from './CalendarSidebar'

describe('CalendarSidebar', () => {
  const mockOnSelectDate = vi.fn()
  const testDate = new Date(2026, 0, 15) // Jan 15 2026

  it('renders correctly', () => {
    render(<CalendarSidebar selectedDate={testDate} onSelectDate={mockOnSelectDate} />)
    expect(screen.getByText('January 2026')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('highlights the selected date with a circle', () => {
    render(<CalendarSidebar selectedDate={testDate} onSelectDate={mockOnSelectDate} />)
    // Find the element for '15'
    const day15 = screen.getByText('15')
    const parentDiv = day15.closest('div')

    // This is a bit fragile without specific test IDs or better role usage,
    // but we can check for the ring class which indicates the circle/ring styling
    expect(parentDiv?.className).toContain('ring-1')
    expect(parentDiv?.className).toContain('ring-graphon-border')
  })

  it('calls onSelectDate when clicked', () => {
    render(<CalendarSidebar selectedDate={testDate} onSelectDate={mockOnSelectDate} />)
    const day20 = screen.getByText('20')
    fireEvent.click(day20)

    const calledDate = mockOnSelectDate.mock.calls[0][0]
    expect(calledDate.getDate()).toBe(20)
  })
})

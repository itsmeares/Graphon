import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import MonthView from './MonthView'

describe('MonthView', () => {
  const mockOnSelectDate = vi.fn()
  const mockOnNavigateDate = vi.fn()
  const testDate = new Date(2026, 0, 15) // Jan 15 2026

  it('renders correctly', () => {
    render(
      <MonthView
        selectedDate={testDate}
        onSelectDate={mockOnSelectDate}
        onNavigateDate={mockOnNavigateDate}
      />
    )
    // Should show days (Monday start) - Note: text is "Mon", displayed uppercase by CSS matching /Mon/i
    expect(screen.getByText(/Mon/i)).toBeInTheDocument()
    // Should show the date
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('calls onSelectDate when a day is clicked', () => {
    render(
      <MonthView
        selectedDate={testDate}
        onSelectDate={mockOnSelectDate}
        onNavigateDate={mockOnNavigateDate}
      />
    )
    const day10 = screen.getByText('10')
    fireEvent.click(day10)

    // Expect the handler to be called with Jan 10 2026
    const callArgs = mockOnSelectDate.mock.calls[0][0]
    expect(callArgs.getDate()).toBe(10)
  })

  it('navigates when clicking a day from previous month', () => {
    render(
      <MonthView
        selectedDate={testDate}
        onSelectDate={mockOnSelectDate}
        onNavigateDate={mockOnNavigateDate}
      />
    )
    // Jan 1 2026 is Thursday.
    // So Dec 29, 30, 31 2025 are visible as gray days, appearing first in list.
    const days29 = screen.getAllByText('29')
    const first29 = days29[0] // Should be Dec 29

    fireEvent.click(first29)

    expect(mockOnNavigateDate).toHaveBeenCalled()
    const calledDate = mockOnNavigateDate.mock.calls[0][0]
    expect(calledDate.getMonth()).toBe(11) // Dec
    expect(calledDate.getFullYear()).toBe(2025)
  })
})

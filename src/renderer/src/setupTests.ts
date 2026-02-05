import { vi } from 'vitest'
import '@testing-library/jest-dom'


// Mock window.api
Object.defineProperty(window, 'api', {
  value: {
    getAllTasks: vi.fn().mockResolvedValue([]),
  },
  writable: true
})


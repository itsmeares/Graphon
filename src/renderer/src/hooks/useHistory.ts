import { useState, useCallback, useEffect } from 'react'
import type { HistoryAction } from '../types'

const MAX_HISTORY_SIZE = 50
const STORAGE_KEY = 'graphon-history-enabled'

export function useHistory() {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([])
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([])
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved !== null ? JSON.parse(saved) : true
  })

  // Persist enabled state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isEnabled))
  }, [isEnabled])

  const pushAction = useCallback(
    (action: Omit<HistoryAction, 'timestamp'>) => {
      if (!isEnabled) return

      const fullAction: HistoryAction = {
        ...action,
        timestamp: Date.now()
      }

      setUndoStack((prev) => {
        const newStack = [...prev, fullAction]
        if (newStack.length > MAX_HISTORY_SIZE) {
          return newStack.slice(-MAX_HISTORY_SIZE)
        }
        return newStack
      })

      // Clear redo stack when new action is performed
      setRedoStack([])
    },
    [isEnabled]
  )

  const undo = useCallback((): HistoryAction | null => {
    if (undoStack.length === 0) return null

    const action = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))
    setRedoStack((prev) => [...prev, action])

    return action
  }, [undoStack])

  const redo = useCallback((): HistoryAction | null => {
    if (redoStack.length === 0) return null

    const action = redoStack[redoStack.length - 1]
    setRedoStack((prev) => prev.slice(0, -1))
    setUndoStack((prev) => [...prev, action])

    return action
  }, [redoStack])

  const clear = useCallback(() => {
    setUndoStack([])
    setRedoStack([])
  }, [])

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => !prev)
  }, [])

  return {
    pushAction,
    undo,
    redo,
    clear,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    isEnabled,
    toggleEnabled,
    undoCount: undoStack.length,
    redoCount: redoStack.length
  }
}

export type UseHistoryReturn = ReturnType<typeof useHistory>

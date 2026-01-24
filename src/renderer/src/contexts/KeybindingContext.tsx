import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { KeybindingConfig, DEFAULT_KEYBINDINGS, KeybindingAction } from '../types'

interface KeybindingContextType {
  keybindings: KeybindingConfig
  updateKeybinding: (action: KeybindingAction, keys: string[]) => void
  resetKeybindings: () => void
  checkMatch: (e: KeyboardEvent, action: KeybindingAction) => boolean
}

const KeybindingContext = createContext<KeybindingContextType | null>(null)

export function useKeybindings() {
  const context = useContext(KeybindingContext)
  if (!context) {
    throw new Error('useKeybindings must be used within a KeybindingProvider')
  }
  return context
}

export function KeybindingProvider({ children }: { children: React.ReactNode }) {
  const [keybindings, setKeybindings] = useState<KeybindingConfig>(DEFAULT_KEYBINDINGS)

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('graphon-keybindings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setKeybindings({ ...DEFAULT_KEYBINDINGS, ...parsed })
      } catch (e) {
        console.error('Failed to parse keybindings', e)
      }
    }
  }, [])

  const saveKeybindings = (newBindings: KeybindingConfig) => {
    setKeybindings(newBindings)
    localStorage.setItem('graphon-keybindings', JSON.stringify(newBindings))
  }

  const updateKeybinding = useCallback(
    (action: KeybindingAction, keys: string[]) => {
      const newBindings = { ...keybindings, [action]: keys }
      saveKeybindings(newBindings)
    },
    [keybindings]
  )

  const resetKeybindings = useCallback(() => {
    saveKeybindings(DEFAULT_KEYBINDINGS)
  }, [])

  // Check if a keyboard event matches an action
  const checkMatch = useCallback(
    (e: KeyboardEvent, action: KeybindingAction): boolean => {
      const triggers = keybindings[action]
      if (!triggers) return false

      return triggers.some((trigger) => {
        const parts = trigger.toLowerCase().split('+')
        const mainKey = parts[parts.length - 1]

        // Check modifiers
        const needsCtrl = parts.includes('control') || parts.includes('ctrl')
        const needsMeta =
          parts.includes('meta') || parts.includes('cmd') || parts.includes('command')
        const needsShift = parts.includes('shift')
        const needsAlt = parts.includes('alt') || parts.includes('option')

        if (needsCtrl && !e.ctrlKey) return false
        if (needsMeta && !e.metaKey) return false
        if (needsShift && !e.shiftKey) return false
        if (needsAlt && !e.altKey) return false

        // Should strictly check if modifiers NOT requested are present?
        // Usually yes to avoid collisions, but let's be lenient for now or match exact modifier count.
        // For now, simple check: if I pressed Ctrl+Z, and the binding is Ctrl+Z, it matches.
        // If I pressed Ctrl+Shift+Z, and binding is Ctrl+Z, it should probably NOT match.

        // Strict modifier check
        const pressedCtrl = e.ctrlKey
        const pressedMeta = e.metaKey
        const pressedShift = e.shiftKey
        const pressedAlt = e.altKey

        if (pressedCtrl !== needsCtrl) return false
        if (pressedMeta !== needsMeta) return false
        if (pressedShift !== needsShift) return false
        if (pressedAlt !== needsAlt) return false

        // Check main key
        // Handle special cases
        if (mainKey === 'delete' && e.key === 'Delete') return true
        if (mainKey === 'backspace' && e.key === 'Backspace') return true
        if (mainKey === 'escape' && e.key === 'Escape') return true
        if (mainKey === 'enter' && e.key === 'Enter') return true
        if (mainKey === 'tab' && e.key === 'Tab') return true
        if (mainKey === 'space' && e.key === ' ') return true

        return e.key.toLowerCase() === mainKey
      })
    },
    [keybindings]
  )

  return (
    <KeybindingContext.Provider
      value={{ keybindings, updateKeybinding, resetKeybindings, checkMatch }}
    >
      {children}
    </KeybindingContext.Provider>
  )
}

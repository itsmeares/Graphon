import React from 'react'
import { useVault } from '../contexts/VaultContext'

const NewPageView: React.FC = () => {
  const { createNote, closeTab, activeTabIndex } = useVault()

  const handleCreateNote = () => {
    // Determine a name or just let 'createNote' handle the default 'Untitled Note'
    // The user requirement says "blank page that has options".
    // Clicking "Create new note" calls createNote.
    createNote()
  }

  const handleGoToFile = () => {
    // Placeholder for now as we don't have a "Open File Picker" exposed easily without UI.
    // Maybe we can trigger the search bar if it exists, or just log for now?
    console.log('Go to file clicked')
    // Ideally we would trigger a command palette or focus the file list.
  }

  const handleClose = () => {
    closeTab(activeTabIndex)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center select-none">
      <div className="flex flex-col space-y-6">
        <button
          onClick={handleCreateNote}
          className="text-xl font-medium text-(--color-accent) hover:brightness-110 hover:underline transition-colors focus:outline-none"
        >
          Create new note (Ctrl + N)
        </button>

        <button
          onClick={handleGoToFile}
          className="text-xl font-medium text-(--color-accent) hover:brightness-110 hover:underline transition-colors focus:outline-none"
        >
          Go to file (Ctrl + O)
        </button>

        <button
          onClick={handleClose}
          className="text-xl font-medium text-(--color-accent) hover:brightness-110 hover:underline transition-colors focus:outline-none"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default NewPageView

import { Command } from 'cmdk'
import { useEffect } from 'react'
import { File, Search, Calendar, Plus, Sun, Moon } from 'lucide-react'
import { useVault } from '../contexts/VaultContext'
import { ViewType } from '../types'

interface CommandPaletteProps {
  onViewChange: (view: ViewType) => void
  darkMode: boolean
  onToggleDarkMode: () => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function CommandPalette({
  onViewChange,
  darkMode,
  onToggleDarkMode,
  isOpen,
  setIsOpen
}: CommandPaletteProps) {
  const { files, createNote, setActiveFile } = useVault()

  // Toggle with Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen(!isOpen) // Toggle instead of just open
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [isOpen, setIsOpen])

  const runCommand = (command: () => void) => {
    setIsOpen(false)
    command()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-160 shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        <Command
          className="w-full bg-white/80 dark:bg-[#1C1C1A]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-xl overflow-hidden text-graphon-text-main dark:text-graphon-dark-text-main"
          loop
        >
          <div className="flex items-center border-b border-black/5 dark:border-white/5 px-3">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search..."
              className="w-full h-12 bg-transparent outline-none placeholder:text-gray-400 text-lg"
            />
          </div>

          <Command.List className="max-h-75 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Suggestions"
              className="text-xs text-gray-400 font-medium mb-1 px-2"
            >
              <Command.Item
                onSelect={() =>
                  runCommand(() => {
                    const name = `Untitled-${Date.now()}`
                    createNote(name)
                    onViewChange('notes')
                  })
                }
                className="flex items-center px-2 py-2 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/50 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Create New Note</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => onViewChange('calendar'))}
                className="flex items-center px-2 py-2 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/50 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
              >
                <Calendar className="w-4 h-4 mr-2" />
                <span>Open Calendar</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(onToggleDarkMode)}
                className="flex items-center px-2 py-2 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/50 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
              >
                {darkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </Command.Item>
            </Command.Group>

            <Command.Separator className="h-px bg-black/5 dark:bg-white/5 my-1 mx-2" />

            <Command.Group
              heading="Files"
              className="text-xs text-gray-400 font-medium mb-1 px-2 mt-2"
            >
              {files.map((file) => (
                <Command.Item
                  key={file.path}
                  value={file.name}
                  onSelect={() =>
                    runCommand(() => {
                      setActiveFile(file.name)
                      onViewChange('notes')
                    })
                  }
                  className="flex items-center px-2 py-2 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/50 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
                >
                  <File className="w-4 h-4 mr-2 opacity-50" />
                  <span>{file.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

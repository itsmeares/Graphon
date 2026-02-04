import { Command } from 'cmdk'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  File,
  Search,
  Plus,
  Sun,
  Moon,
  Home,
  Share2,
  PanelLeft,
  Copy,
  Sparkles,
  ArrowLeft,
  Settings,
  Calendar,
  Clock,
  RefreshCw,
  Upload
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVault } from '../contexts/VaultContext'
import { ViewType } from '../types'

interface SearchResult {
  id: string
  title: string
  path: string
  highlight: string
}

interface SemanticResult {
  id: string
  title: string
  path: string
  score: number
}

type OmnibarPage = 'root' | 'ask-ai'

interface SystemCommand {
  id: string
  name: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  onViewChange: (view: ViewType) => void
  darkMode: boolean
  onToggleDarkMode: () => void
  onToggleSidebar?: () => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  /** Team mode specific props */
  isTeamMode?: boolean
  onImportFromLocal?: () => void
}

export function CommandPalette({
  onViewChange,
  darkMode,
  onToggleDarkMode,
  onToggleSidebar,
  isOpen,
  setIsOpen,
  isTeamMode = false,
  onImportFromLocal
}: CommandPaletteProps) {
  const { createNote, setActiveFile, activeFile } = useVault()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activePage, setActivePage] = useState<OmnibarPage>('root')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Helper to insert text into editor
  const insertText = (text: string) => {
    window.dispatchEvent(new CustomEvent('insert-text', { detail: text }))
  }

  // System commands - static list of power user functions
  const systemCommands: SystemCommand[] = [
    // Team mode only: Import from Local Vault
    ...(isTeamMode && onImportFromLocal
      ? [
          {
            id: 'import-from-local',
            name: 'Import from Local Vault...',
            icon: <Upload className="w-4 h-4" />,
            action: () => {
              onImportFromLocal()
            }
          }
        ]
      : []),
    {
      id: 'create-note',
      name: 'Create New Note',
      icon: <Plus className="w-4 h-4" />,
      shortcut: '⌘N',
      action: () => {
        const name = `Untitled-${Date.now()}`
        createNote(name)
        onViewChange('notes')
      }
    },
    {
      id: 'toggle-theme',
      name: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      action: onToggleDarkMode
    },
    {
      id: 'toggle-sidebar',
      name: 'Toggle Sidebar',
      icon: <PanelLeft className="w-4 h-4" />,
      shortcut: '⌘\\',
      action: () => onToggleSidebar?.()
    },
    {
      id: 'copy-path',
      name: 'Copy Current Path',
      icon: <Copy className="w-4 h-4" />,
      action: () => {
        if (activeFile) {
          navigator.clipboard.writeText(activeFile)
        }
      }
    },
    {
      id: 'go-home',
      name: 'Go to Home',
      icon: <Home className="w-4 h-4" />,
      action: () => onViewChange('home')
    },
    {
      id: 'go-graph',
      name: 'Go to Graph View',
      icon: <Share2 className="w-4 h-4" />,
      action: () => onViewChange('graph')
    },
    {
      id: 'open-settings',
      name: 'Open Settings',
      icon: <Settings className="w-4 h-4" />,
      shortcut: '⌘,',
      action: () => onViewChange('settings')
    },
    {
      id: 'insert-date',
      name: 'Insert Current Date',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        insertText(date)
      }
    },
    {
      id: 'insert-time',
      name: 'Insert Current Time',
      icon: <Clock className="w-4 h-4" />,
      action: () => {
        const time = new Date().toTimeString().slice(0, 5) // HH:mm
        insertText(time)
      }
    },
    {
      id: 'reload-window',
      name: 'Reload Window',
      icon: <RefreshCw className="w-4 h-4" />,
      action: () => window.location.reload()
    },
    {
      id: 'ask-ai',
      name: '✨ Ask AI',
      icon: <Sparkles className="w-4 h-4 text-(--color-accent)" />,
      action: () => setActivePage('ask-ai')
    }
  ]

  // Toggle with Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen(!isOpen)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [isOpen, setIsOpen])

  // Reset state when palette closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
      setSemanticResults([])
      setActivePage('root')
    }
  }, [isOpen])

  // Debounced search via IPC - 200ms debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setSemanticResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    debounceRef.current = setTimeout(async () => {
      try {
        // Parallel execution of FTS and Semantic Search
        const [ftsResults, vectorResults] = await Promise.all([
          window.api.searchNotes(searchQuery),
          window.api.semanticSearch(searchQuery)
        ])
        setSearchResults(ftsResults)
        setSemanticResults(vectorResults)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
        setSemanticResults([])
      } finally {
        setIsSearching(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const runCommand = useCallback(
    (command: () => void) => {
      setIsOpen(false)
      command()
    },
    [setIsOpen]
  )

  // Extract filename from path (remove .md extension)
  const getFileNameFromPath = (path: string): string => {
    const parts = path.split(/[/\\]/)
    const fileName = parts[parts.length - 1]
    return fileName.replace(/\.md$/, '')
  }

  // Filter system commands based on search query
  const filteredCommands = searchQuery.trim()
    ? systemCommands.filter((cmd) => cmd.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : systemCommands

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-160 glass-modal specular-border overflow-hidden"
      >
        <Command className="w-full bg-transparent" loop shouldFilter={false}>
          <AnimatePresence mode="wait">
            {activePage === 'root' ? (
              <motion.div
                key="root"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                {/* Search Input */}
                <div className="flex items-center border-b border-black/5 dark:border-white/5 px-4">
                  <Search className="w-5 h-5 text-neutral-400 mr-3 shrink-0" />
                  <Command.Input
                    ref={inputRef}
                    autoFocus
                    placeholder="Search files and commands..."
                    className="w-full h-14 bg-transparent outline-none placeholder:text-neutral-400 text-base"
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  {isSearching && (
                    <div className="w-4 h-4 border-2 border-neutral-300 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>

                {/* Results List */}
                <Command.List className="max-h-80 overflow-y-auto overflow-x-hidden p-2">
                  <Command.Empty className="py-8 text-center text-sm text-neutral-500">
                    {isSearching ? 'Searching...' : 'No results found.'}
                  </Command.Empty>

                  {/* System Commands */}
                  {filteredCommands.length > 0 && (
                    <Command.Group
                      heading="Commands"
                      className="text-[11px] text-neutral-400 font-medium mb-2 px-2"
                    >
                      {filteredCommands.map((cmd) => (
                        <Command.Item
                          key={cmd.id}
                          value={cmd.id}
                          onSelect={() =>
                            cmd.id === 'ask-ai' ? cmd.action() : runCommand(cmd.action)
                          }
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/60 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="opacity-60">{cmd.icon}</span>
                            <span>{cmd.name}</span>
                          </div>
                          {cmd.shortcut && (
                            <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-white/10 rounded text-neutral-500">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Semantic Search Results */}
                  {searchQuery.trim() && semanticResults.length > 0 && (
                    <>
                      <Command.Separator className="h-px bg-black/5 dark:bg-white/5 my-2" />
                      <Command.Group
                        heading="Semantic Matches"
                        className="text-[11px] text-neutral-400 font-medium mb-2 px-2"
                      >
                        {semanticResults.map((result) => {
                          const fileName = getFileNameFromPath(result.path)
                          return (
                            <Command.Item
                              key={`semantic-${result.id}`}
                              value={`semantic-${result.id}`}
                              onSelect={() =>
                                runCommand(() => {
                                  setActiveFile(fileName)
                                  onViewChange('notes')
                                })
                              }
                              className="flex items-center px-3 py-2.5 rounded-lg text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/60 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
                            >
                              <Sparkles className="w-4 h-4 mr-3 text-(--color-accent) opacity-80 shrink-0" />
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-medium truncate">{result.title}</span>
                                <span className="text-[10px] opacity-50">
                                  {(result.score * 100).toFixed(0)}% relevant
                                </span>
                              </div>
                            </Command.Item>
                          )
                        })}
                      </Command.Group>
                    </>
                  )}

                  {/* File Search Results (Text Matches) */}
                  {searchQuery.trim() && searchResults.length > 0 && (
                    <>
                      <Command.Separator className="h-px bg-black/5 dark:bg-white/5 my-2" />
                      <Command.Group
                        heading="Text Matches"
                        className="text-[11px] text-neutral-400 font-medium mb-2 px-2"
                      >
                        {searchResults.map((result) => {
                          const fileName = getFileNameFromPath(result.path)
                          return (
                            <Command.Item
                              key={result.path}
                              value={result.path}
                              onSelect={() =>
                                runCommand(() => {
                                  setActiveFile(fileName)
                                  onViewChange('notes')
                                })
                              }
                              className="flex flex-col items-start px-3 py-2.5 rounded-lg text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/60 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center w-full">
                                <File className="w-4 h-4 mr-3 opacity-50 shrink-0" />
                                <span className="font-medium truncate">{result.title}</span>
                              </div>
                              {result.highlight && (
                                <span
                                  className="text-xs text-neutral-500 dark:text-neutral-400 ml-7 mt-1 line-clamp-1"
                                  dangerouslySetInnerHTML={{ __html: result.highlight }}
                                />
                              )}
                            </Command.Item>
                          )
                        })}
                      </Command.Group>
                    </>
                  )}
                </Command.List>
              </motion.div>
            ) : (
              /* Ask AI Sub-page */
              <motion.div
                key="ask-ai"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
              >
                {/* Header with back button */}
                <div className="flex items-center border-b border-black/5 dark:border-white/5 px-4 h-14">
                  <button
                    onClick={() => setActivePage('root')}
                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors mr-3"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Sparkles className="w-5 h-5 text-(--color-accent) mr-3" />
                  <Command.Input
                    autoFocus
                    placeholder="Ask AI anything..."
                    className="w-full bg-transparent outline-none placeholder:text-neutral-400 text-base"
                  />
                </div>

                {/* Placeholder content */}
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-(--color-accent)/20 to-(--color-accent)/5 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-(--color-accent)" />
                  </div>
                  <h3 className="text-lg font-semibold text-graphon-text-main dark:text-graphon-dark-text-main mb-2">
                    AI Assistant
                  </h3>
                  <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                    Coming in Phase 7. Your intelligent knowledge companion will help you explore
                    and connect ideas.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer hint */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-black/5 dark:border-white/5 text-[11px] text-neutral-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-white/10 rounded">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-white/10 rounded">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-white/10 rounded">esc</kbd>
                close
              </span>
            </div>
          </div>
        </Command>
      </motion.div>
    </div>
  )
}

import { Command } from 'cmdk'
import { useEffect, useState, useRef } from 'react'
import { File, Search, Calendar, Plus, Sun, Moon, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVault } from '../contexts/VaultContext'
import { ViewType } from '../types'
import { processTemplate } from '../utils/templateUtils'

interface SearchResult {
  id: string
  title: string
  path: string
  highlight: string
}

interface TemplateFile {
  name: string
  content: string
}

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
  const { createNote, setActiveFile } = useVault()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [templates, setTemplates] = useState<TemplateFile[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Reset state when palette closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
      setShowTemplates(false)
    }
  }, [isOpen])

  // Fetch templates when user types "/" or opens template mode
  useEffect(() => {
    if (searchQuery === '/' || showTemplates) {
      window.api.getTemplates().then(setTemplates).catch(console.error)
    }
  }, [searchQuery, showTemplates])

  // Insert template content into editor via Custom Event
  const insertTemplateContent = async (template: TemplateFile) => {
    try {
      const processed = await processTemplate(template.content)
      window.dispatchEvent(new CustomEvent('insert-template-content', { detail: processed }))
    } catch (error) {
      console.error('Failed to process template:', error)
    }
  }

  // Debounced search via IPC
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await window.api.searchNotes(searchQuery)
        setSearchResults(results)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const runCommand = (command: () => void) => {
    setIsOpen(false)
    command()
  }

  // Extract filename from path (remove .md extension)
  const getFileNameFromPath = (path: string): string => {
    const parts = path.split(/[/\\]/)
    const fileName = parts[parts.length - 1]
    return fileName.replace(/\.md$/, '')
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
          shouldFilter={false}
        >
          <div className="flex items-center border-b border-black/5 dark:border-white/5 px-3">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search..."
              className="w-full h-12 bg-transparent outline-none placeholder:text-gray-400 text-lg"
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            {isSearching && (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <Command.List className="max-h-75 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              {isSearching ? 'Searching...' : 'No results found.'}
            </Command.Empty>

            {/* Show suggestions only when not searching */}
            {!searchQuery.trim() && (
              <>
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
                    {darkMode ? (
                      <Sun className="w-4 h-4 mr-2" />
                    ) : (
                      <Moon className="w-4 h-4 mr-2" />
                    )}
                    <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => setShowTemplates(true)}
                    className="flex items-center px-2 py-2 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/50 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    <span>Insert Template</span>
                  </Command.Item>
                </Command.Group>
              </>
            )}

            {/* Templates list */}
            {(showTemplates || searchQuery === '/') && templates.length > 0 && (
              <Command.Group
                heading="Templates"
                className="text-xs text-gray-400 font-medium mb-1 px-2"
              >
                {templates.map((template) => (
                  <Command.Item
                    key={template.name}
                    value={template.name}
                    onSelect={() => runCommand(() => insertTemplateContent(template))}
                    className="flex items-center px-2 py-2 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/50 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2 opacity-50" />
                    <span>{template.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Search results */}
            <AnimatePresence mode="popLayout">
              {searchQuery.trim() && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <Command.Separator className="h-px bg-black/5 dark:bg-white/5 my-1 mx-2" />

                  <Command.Group
                    heading="Search Results"
                    className="text-xs text-gray-400 font-medium mb-1 px-2 mt-2"
                  >
                    <AnimatePresence mode="popLayout">
                      {searchResults.map((result, index) => {
                        const fileName = getFileNameFromPath(result.path)
                        return (
                          <motion.div
                            key={result.path}
                            layout
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{
                              duration: 0.2,
                              delay: index * 0.03,
                              ease: [0.25, 0.46, 0.45, 0.94]
                            }}
                          >
                            <Command.Item
                              value={result.path}
                              onSelect={() =>
                                runCommand(() => {
                                  setActiveFile(fileName)
                                  onViewChange('notes')
                                })
                              }
                              className="flex flex-col items-start px-2 py-2 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main aria-selected:bg-neutral-200/50 dark:aria-selected:bg-white/10 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center w-full">
                                <File className="w-4 h-4 mr-2 opacity-50 shrink-0" />
                                <span className="font-medium truncate">{result.title}</span>
                              </div>
                              {result.highlight && (
                                <span
                                  className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-0.5 line-clamp-1"
                                  dangerouslySetInnerHTML={{ __html: result.highlight }}
                                />
                              )}
                            </Command.Item>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </Command.Group>
                </motion.div>
              )}
            </AnimatePresence>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

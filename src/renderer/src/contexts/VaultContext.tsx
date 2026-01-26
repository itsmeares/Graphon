import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef
} from 'react'
import type { CalendarEvent, FileNode, Tab } from '../types'

// Database types (simplified for storage)
interface DatabaseIndex {
  databases: DatabaseMeta[]
}

interface DatabaseMeta {
  id: string
  name: string
  icon: string
  createdAt: number
}

interface VaultContextType {
  // Vault state
  currentVaultPath: string | null
  files: FileNode[]
  isLoading: boolean

  // Tab State
  tabs: Tab[]
  activeTabIndex: number
  openTab: (tab: Tab) => void
  closeTab: (index: number) => void
  setActiveTab: (index: number) => void

  // Legacy/Helper for files
  openFile: (path: string) => Promise<void>

  // Active file (for notes)
  activeFile: string | null
  setActiveFile: (filename: string | null) => void

  // Calendar data
  calendarEvents: CalendarEvent[]
  saveCalendar: (events: CalendarEvent[]) => Promise<void>

  // Database data
  databaseIndex: DatabaseMeta[]
  saveDatabaseIndex: (databases: DatabaseMeta[]) => Promise<void>
  readDatabase: (id: string) => Promise<any | null>
  writeDatabase: (id: string, data: any) => Promise<void>

  // Vault actions
  selectVault: () => Promise<void>
  refreshFiles: () => Promise<void>
  setVaultPath: (path: string | null) => void

  // File I/O for notes
  readNoteContent: (filename: string) => Promise<string | null>
  writeNoteContent: (filename: string, content: string) => Promise<void>
  createNote: (filename?: string) => Promise<void>
  deleteNote: (filename: string) => Promise<void>
  renameNote: (oldName: string, newName: string) => Promise<void>

  // Pending save flush (for data integrity)
  flushPendingWrites: () => Promise<void>
  registerPendingWrite: (key: string, flushFn: () => Promise<void>) => void
  unregisterPendingWrite: (key: string) => void
}

const VaultContext = createContext<VaultContextType | undefined>(undefined)

export function VaultProvider({ children }: { children: ReactNode }) {
  const [currentVaultPath, setCurrentVaultPath] = useState<string | null>(null)
  const [files, setFiles] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Tab State
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabIndex, setActiveTabIndex] = useState<number>(-1)

  // Computed active file (for backward compat / specific checks)
  const activeTab = activeTabIndex >= 0 ? tabs[activeTabIndex] : null
  const activeFile = activeTab?.type === 'file' ? activeTab.path || null : null

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [databaseIndex, setDatabaseIndex] = useState<DatabaseMeta[]>([])

  // Track pending writes for data integrity (keyed by identifier)
  const pendingWritesRef = useRef<Map<string, () => Promise<void>>>(new Map())

  // Register a pending write that needs to be flushed before switching context
  const registerPendingWrite = useCallback((key: string, flushFn: () => Promise<void>) => {
    pendingWritesRef.current.set(key, flushFn)
  }, [])

  const unregisterPendingWrite = useCallback((key: string) => {
    pendingWritesRef.current.delete(key)
  }, [])

  // Flush all pending writes (called before switching files/vaults)
  const flushPendingWrites = useCallback(async () => {
    const writes = Array.from(pendingWritesRef.current.values())
    if (writes.length > 0) {
      await Promise.all(writes.map((fn) => fn().catch(console.error)))
      pendingWritesRef.current.clear()
    }
  }, [])

  // Load files from vault (no path param - uses main process cached path)
  const loadFiles = useCallback(async () => {
    try {
      const fileList = await window.api.listFiles()
      setFiles(fileList)
    } catch (error) {
      console.error('Failed to load files:', error)
      setFiles([])
    }
  }, [])

  // Load calendar events from .graphon/calendar.json
  const loadCalendar = useCallback(async () => {
    try {
      const data = await window.api.readData<{ events: CalendarEvent[] }>('calendar')
      if (data && Array.isArray(data.events)) {
        // Parse dates
        const parsed = data.events.map((e) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate)
        }))
        setCalendarEvents(parsed)
      } else {
        setCalendarEvents([])
      }
    } catch (error) {
      console.error('Failed to load calendar:', error)
      setCalendarEvents([])
    }
  }, [])

  // Save calendar events
  const saveCalendar = useCallback(async (events: CalendarEvent[]) => {
    try {
      await window.api.writeData('calendar', { events })
      setCalendarEvents(events)
    } catch (error) {
      console.error('Failed to save calendar:', error)
    }
  }, [])

  // Load database index from .graphon/database-index.json
  const loadDatabaseIndex = useCallback(async () => {
    try {
      const data = await window.api.readData<DatabaseIndex>('database-index')
      if (data && Array.isArray(data.databases)) {
        setDatabaseIndex(data.databases)
      } else {
        setDatabaseIndex([])
      }
    } catch (error) {
      console.error('Failed to load database index:', error)
      setDatabaseIndex([])
    }
  }, [])

  // Save database index
  const saveDatabaseIndex = useCallback(async (databases: DatabaseMeta[]) => {
    try {
      await window.api.writeData('database-index', { databases })
      setDatabaseIndex(databases)
    } catch (error) {
      console.error('Failed to save database index:', error)
    }
  }, [])

  // Read a specific database
  const readDatabase = useCallback(async (id: string): Promise<any | null> => {
    try {
      return await window.api.readData(`db-${id}`)
    } catch (error) {
      console.error(`Failed to read database ${id}:`, error)
      return null
    }
  }, [])

  // Write a specific database
  const writeDatabase = useCallback(async (id: string, data: any): Promise<void> => {
    try {
      await window.api.writeData(`db-${id}`, data)
    } catch (error) {
      console.error(`Failed to write database ${id}:`, error)
    }
  }, [])

  // Load all vault data
  const loadVaultData = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([loadFiles(), loadCalendar(), loadDatabaseIndex()])
    } finally {
      setIsLoading(false)
    }
  }, [loadFiles, loadCalendar, loadDatabaseIndex])

  // Load saved vault on mount - DISABLED to always show Main Menu
  useEffect(() => {
    // We intentionally do NOT load the saved vault path on startup
    // so that the user always lands on the main menu (WelcomeView).
    setIsLoading(false)
  }, [])

  // Select a new vault
  const selectVault = useCallback(async () => {
    try {
      // Flush any pending writes before switching
      await flushPendingWrites()

      const selectedPath = await window.api.selectVault()
      if (selectedPath) {
        // Clear all state for new vault
        setTabs([])
        setActiveTabIndex(-1)
        setCalendarEvents([])
        setDatabaseIndex([])
        setFiles([])

        setCurrentVaultPath(selectedPath)
        await loadVaultData()
      }
    } catch (error) {
      console.error('Failed to select vault:', error)
    }
  }, [flushPendingWrites, loadVaultData])

  // Refresh files
  const refreshFiles = useCallback(async () => {
    if (currentVaultPath) {
      await loadFiles()
    }
  }, [currentVaultPath, loadFiles])

  // Set vault path (for programmatic changes)
  const setVaultPath = useCallback(
    (path: string | null) => {
      setCurrentVaultPath(path)
      if (path) {
        loadVaultData()
      } else {
        setFiles([])
        setCalendarEvents([])
        setCalendarEvents([])
        setDatabaseIndex([])
        setTabs([])
        setActiveTabIndex(-1)
      }
    },
    [loadVaultData]
  )

  // Open a Tab
  const openTab = useCallback((tab: Tab) => {
    setTabs((prev) => {
      // Check if tab already exists (by ID or path)
      const idx = prev.findIndex(
        (t) => t.id === tab.id || (t.type === 'file' && t.path === tab.path && tab.type === 'file')
      )
      if (idx !== -1) {
        setActiveTabIndex(idx)
        return prev
      }
      setTimeout(() => setActiveTabIndex(prev.length), 0)
      return [...prev, tab]
    })
  }, [])

  // Open a file (Legacy Compat wrapper)
  const openFile = useCallback(
    async (path: string) => {
      await flushPendingWrites()
      const filename = path.split(/[/\\]/).pop() || path
      openTab({
        id: path,
        type: 'file',
        title: filename,
        path: path
      })
    },
    [flushPendingWrites, openTab]
  )

  // Close a tab
  const closeTab = useCallback((index: number) => {
    setTabs((prev) => {
      const newTabs = prev.filter((_, i) => i !== index)

      // Adjust active index
      setActiveTabIndex((current) => {
        if (current >= newTabs.length) return Math.max(0, newTabs.length - 1)
        if (current === index) return Math.max(0, index - 1)
        if (current > index) return current - 1
        return current
      })

      return newTabs
    })
  }, [])

  // Set active tab
  const setActiveTab = useCallback((index: number) => {
    setActiveTabIndex(index)
  }, [])

  // Legacy setActiveFile compatibility
  const setActiveFile = useCallback(
    async (filename: string | null) => {
      if (filename) {
        await openFile(filename)
      } else {
        setActiveTabIndex(-1)
      }
    },
    [openFile]
  )

  // Read note content
  const readNoteContent = useCallback(async (filename: string): Promise<string | null> => {
    try {
      return await window.api.readFile(filename)
    } catch (error) {
      console.error(`Failed to read note ${filename}:`, error)
      return null
    }
  }, [])

  // Write note content
  const writeNoteContent = useCallback(async (filename: string, content: string): Promise<void> => {
    try {
      await window.api.writeFile(filename, content)
    } catch (error) {
      console.error(`Failed to write note ${filename}:`, error)
    }
  }, [])

  // Create a new note with smart naming
  const createNote = useCallback(
    async (filename?: string): Promise<void> => {
      try {
        let finalName = filename

        // If no filename provided, generate "Untitled Note" active naming
        if (!finalName) {
          const base = 'Untitled Note'
          let candidate = base
          let counter = 1

          // Helper to check if file exists in root (simplified check against flat list or re-fetch)
          // For accuracy, let's just use a loop with readFile or better, check against current 'files' state if it matches root.
          // Since 'files' is a tree, we check top-level items.
          const rootFiles = files.map((f) => f.name.toLowerCase())

          while (rootFiles.includes(`${candidate.toLowerCase()}.md`)) {
            candidate = `${base} (${counter})`
            counter++
          }
          finalName = candidate
        }

        // Ensure .md extension
        const fn = finalName.endsWith('.md') ? finalName : `${finalName}.md`

        await window.api.writeFile(fn, '')
        await loadFiles()
        await openFile(fn)
      } catch (error) {
        console.error(`Failed to create note ${filename}:`, error)
      }
    },
    [loadFiles, files, openFile]
  )

  // Delete a note
  const deleteNote = useCallback(
    async (filename: string): Promise<void> => {
      try {
        await window.api.deleteFile(filename)
        await loadFiles()
        if (activeFile === filename) {
          // If the deleted file was active, close it?
          // The check below handles closing the tab.
        }

        // Close tab if deleted
        const tabIndex = tabs.findIndex((t) => t.path === filename)
        if (tabIndex !== -1) {
          closeTab(tabIndex)
        }
      } catch (error) {
        console.error(`Failed to delete note ${filename}:`, error)
      }
    },
    [loadFiles, activeFile]
  )

  // Rename a note
  const renameNote = useCallback(
    async (oldName: string, newName: string): Promise<void> => {
      try {
        await window.api.renameFile(oldName, newName)
        await loadFiles()
        // If active, update active file? activeFile is derived from tabs.
        // We need to update tabs that point to this file.
        setTabs((prev) =>
          prev.map((t) => {
            if (t.type === 'file' && t.path === oldName) {
              return { ...t, path: newName, title: newName, id: newName }
            }
            return t
          })
        )
        // If active tab was this file, activeFile naturally updates because it reads from tabs[activeTabIndex]
      } catch (error) {
        console.error(`Failed to rename note ${oldName} to ${newName}:`, error)
        throw error
      }
    },
    [loadFiles]
  )

  return (
    <VaultContext.Provider
      value={{
        currentVaultPath,
        files,
        isLoading,

        // Tab State Exposure
        tabs,
        activeTabIndex,
        openTab,
        closeTab,
        setActiveTab,

        // Legacy
        openFile,

        // Legacy/Computed Active File
        activeFile,
        setActiveFile,

        calendarEvents,
        saveCalendar,
        databaseIndex,
        saveDatabaseIndex,
        readDatabase,
        writeDatabase,
        selectVault,
        refreshFiles,
        setVaultPath,
        readNoteContent,
        writeNoteContent,
        createNote,
        deleteNote,
        renameNote,
        flushPendingWrites,
        registerPendingWrite,
        unregisterPendingWrite
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const context = useContext(VaultContext)
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return context
}

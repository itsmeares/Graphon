import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef
} from 'react'
import type { CalendarEvent } from '../types'

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
  files: string[]
  isLoading: boolean

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
  createNote: (filename: string) => Promise<void>
  deleteNote: (filename: string) => Promise<void>

  // Pending save flush (for data integrity)
  flushPendingWrites: () => Promise<void>
  registerPendingWrite: (key: string, flushFn: () => Promise<void>) => void
  unregisterPendingWrite: (key: string) => void
}

const VaultContext = createContext<VaultContextType | undefined>(undefined)

export function VaultProvider({ children }: { children: ReactNode }) {
  const [currentVaultPath, setCurrentVaultPath] = useState<string | null>(null)
  const [files, setFiles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFile, setActiveFileState] = useState<string | null>(null)
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

  // Load saved vault on mount
  useEffect(() => {
    const loadVault = async () => {
      try {
        const savedPath = await window.api.getVaultPath()
        if (savedPath) {
          setCurrentVaultPath(savedPath)
          await loadVaultData()
        }
      } catch (error) {
        console.error('Failed to load vault:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadVault()
  }, [loadVaultData])

  // Select a new vault
  const selectVault = useCallback(async () => {
    try {
      // Flush any pending writes before switching
      await flushPendingWrites()

      const selectedPath = await window.api.selectVault()
      if (selectedPath) {
        // Clear all state for new vault
        setActiveFileState(null)
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
        setDatabaseIndex([])
        setActiveFileState(null)
      }
    },
    [loadVaultData]
  )

  // Set active file with pending write flush
  const setActiveFile = useCallback(
    async (filename: string | null) => {
      // DATA INTEGRITY: Flush pending writes before switching files
      await flushPendingWrites()
      setActiveFileState(filename)
    },
    [flushPendingWrites]
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

  // Create a new note
  const createNote = useCallback(
    async (filename: string): Promise<void> => {
      try {
        // Ensure .md extension
        const fn = filename.endsWith('.md') ? filename : `${filename}.md`
        await window.api.writeFile(fn, '')
        await loadFiles()
        setActiveFileState(fn)
      } catch (error) {
        console.error(`Failed to create note ${filename}:`, error)
      }
    },
    [loadFiles]
  )

  // Delete a note
  const deleteNote = useCallback(
    async (filename: string): Promise<void> => {
      try {
        await window.api.deleteFile(filename)
        await loadFiles()
        if (activeFile === filename) {
          setActiveFileState(null)
        }
      } catch (error) {
        console.error(`Failed to delete note ${filename}:`, error)
      }
    },
    [loadFiles, activeFile]
  )

  return (
    <VaultContext.Provider
      value={{
        currentVaultPath,
        files,
        isLoading,
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

import { useState, useRef } from 'react'
import {
  MoonIcon,
  SunIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon,
  ClockIcon,
  TrashIcon,
  PlusIcon,
  FolderIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline'
import type { ExportData, Theme } from '../types'
import Toast, { useToast } from './Toast'
import { useKeybindings } from '../contexts/KeybindingContext'
import { ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { useVault } from '../contexts/VaultContext'

interface SettingsViewProps {
  theme: Theme
  onSetTheme: (theme: Theme) => void
  isSidebarVisible?: boolean
  moduleVisibility?: { notes: boolean; calendar: boolean; database: boolean }
  onToggleModule?: (module: 'notes' | 'calendar' | 'database') => void
  titlebarStyle?: 'macos' | 'windows'
  onSetTitlebarStyle?: (style: 'macos' | 'windows') => void
  accentColor: string
  onSetAccentColor: (color: string) => void
  accentColors: { id: string; label: string; value: string }[]
}

export default function SettingsView({
  theme,
  onSetTheme,
  isSidebarVisible = true,
  moduleVisibility,
  onToggleModule,
  titlebarStyle = 'macos',
  onSetTitlebarStyle,
  accentColor,
  onSetAccentColor,
  accentColors
}: SettingsViewProps) {
  // History enabled state
  const [historyEnabled, setHistoryEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('graphon-history-enabled')
    return saved !== null ? JSON.parse(saved) : true
  })

  // Toast state
  const { toast, isVisible, showToast, hideToast } = useToast()

  const { keybindings, updateKeybinding, resetKeybindings } = useKeybindings()

  // Vault context
  const { currentVaultPath, selectVault } = useVault()

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Row height presets state
  const [rowHeightPresets, setRowHeightPresets] = useState<{ label: string; value: number }[]>(
    () => {
      const saved = localStorage.getItem('graphon-row-height-presets')
      return saved
        ? JSON.parse(saved)
        : [
            { label: 'S', value: 32 },
            { label: 'M', value: 44 },
            { label: 'L', value: 64 }
          ]
    }
  )

  const savePresets = (newPresets: { label: string; value: number }[]) => {
    setRowHeightPresets(newPresets)
    localStorage.setItem('graphon-row-height-presets', JSON.stringify(newPresets))
  }

  const [newPresetLabel, setNewPresetLabel] = useState('')
  const [newPresetValue, setNewPresetValue] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddPreset = () => {
    const value = parseInt(newPresetValue, 10)
    if (newPresetLabel && value > 0) {
      savePresets([...rowHeightPresets, { label: newPresetLabel, value }])
      setNewPresetLabel('')
      setNewPresetValue('')
      setIsAdding(false)
      showToast('Preset added successfully!', 'success')
    }
  }

  const handleDeletePreset = (index: number) => {
    if (confirm('Are you sure you want to delete this preset?')) {
      const newPresets = rowHeightPresets.filter((_, i) => i !== index)
      savePresets(newPresets)
      showToast('Preset deleted', 'success')
    }
  }

  const handleToggleHistory = () => {
    const newValue = !historyEnabled
    setHistoryEnabled(newValue)
    localStorage.setItem('graphon-history-enabled', JSON.stringify(newValue))
  }

  const handleExportData = () => {
    try {
      // Collect data from localStorage
      const notesData = localStorage.getItem('graphon-notes')
      const eventsData = localStorage.getItem('graphon-calendar-events')
      const currentNote = localStorage.getItem('graphon-current-note')

      const exportData: ExportData = {
        notes: notesData ? JSON.parse(notesData) : [],
        events: eventsData ? JSON.parse(eventsData) : [],
        exportDate: new Date().toISOString(),
        version: '0.1.8'
      }

      // Also include current note if present
      if (currentNote) {
        ;(exportData as ExportData & { currentNote?: string }).currentNote = currentNote
      }

      // Create JSON blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `graphon-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast('Data exported successfully!', 'success')
    } catch (error) {
      console.error('Export failed:', error)
      showToast('Export failed', 'error')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const validateImportData = (data: unknown): data is ExportData => {
    if (!data || typeof data !== 'object') return false
    const obj = data as Record<string, unknown>

    // Check required fields
    if (!Array.isArray(obj.notes)) return false
    if (!Array.isArray(obj.events)) return false
    if (typeof obj.version !== 'string') return false

    // Validate notes structure
    for (const note of obj.notes) {
      if (!note || typeof note !== 'object') return false
      const n = note as Record<string, unknown>
      if (typeof n.id !== 'string') return false
      if (typeof n.title !== 'string') return false
      if (typeof n.content !== 'string') return false
    }

    // Validate events structure
    for (const event of obj.events) {
      if (!event || typeof event !== 'object') return false
      const e = event as Record<string, unknown>
      if (typeof e.id !== 'string') return false
      if (typeof e.title !== 'string') return false
      // startDate and endDate can be strings (serialized) or Date objects
      if (!e.startDate || !e.endDate) return false
    }

    return true
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate structure
      if (!validateImportData(data)) {
        showToast('Invalid file format', 'error')
        return
      }

      // Import data to localStorage
      if (data.notes.length > 0) {
        localStorage.setItem('graphon-notes', JSON.stringify(data.notes))
      }

      if (data.events.length > 0) {
        localStorage.setItem('graphon-calendar-events', JSON.stringify(data.events))
      }

      // Import current note if present
      const extendedData = data as ExportData & { currentNote?: string }
      if (extendedData.currentNote) {
        localStorage.setItem('graphon-current-note', extendedData.currentNote)
      }

      showToast(`Imported ${data.notes.length} notes and ${data.events.length} events`, 'success')

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Optionally trigger a page reload to refresh state
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Import failed:', error)
      showToast('Import failed - invalid JSON', 'error')
    }
  }

  return (
    <div className="flex-1 h-screen overflow-auto text-graphon-text-main dark:text-graphon-dark-text-main transition-colors duration-300">
      {/* Header */}
      <div
        className={`h-14 border-b border-graphon-border dark:border-graphon-dark-border flex items-center px-6 ${!isSidebarVisible ? 'pl-14' : ''}`}
      >
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Appearance Section */}
        <section>
          <h2 className="text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-3 tracking-widest uppercase px-1">
            Appearance
          </h2>
          <div className="border border-graphon-border dark:border-graphon-dark-border rounded-xl p-5 bg-white dark:bg-graphon-dark-sidebar/50">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-lg bg-graphon-hover dark:bg-graphon-dark-hover 
                                              flex items-center justify-center border border-graphon-border dark:border-graphon-dark-border"
                >
                  {theme === 'dark' ? (
                    <MoonIcon className="w-5 h-5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
                  ) : theme === 'light' ? (
                    <SunIcon className="w-5 h-5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
                  ) : (
                    <ComputerDesktopIcon className="w-5 h-5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main">
                    Theme
                  </p>
                  <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary capitalize">
                    {theme} mode enabled
                  </p>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="flex p-1 bg-graphon-hover dark:bg-graphon-dark-hover rounded-xl border border-graphon-border dark:border-graphon-dark-border">
                {[
                  { id: 'light', label: 'Light', icon: SunIcon },
                  { id: 'dark', label: 'Dark', icon: MoonIcon },
                  { id: 'system', label: 'System', icon: ComputerDesktopIcon }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSetTheme(item.id as Theme)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all duration-200
                              ${
                                theme === item.id
                                  ? 'bg-white dark:bg-graphon-dark-bg text-(--color-accent) shadow-sm border border-graphon-border/50 dark:border-graphon-dark-border/50'
                                  : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white'
                              }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Titlebar Style Selector */}
              <div className="mt-4 pt-4 border-t border-graphon-border dark:border-graphon-dark-border">
                <h3 className="text-sm font-semibold text-graphon-text-main dark:text-graphon-dark-text-main mb-3">
                  Window Controls
                </h3>
                <div className="flex p-1 bg-graphon-hover dark:bg-graphon-dark-hover rounded-xl border border-graphon-border dark:border-graphon-dark-border">
                  <button
                    onClick={() => onSetTitlebarStyle?.('macos')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 
                      ${
                        titlebarStyle === 'macos'
                          ? 'bg-white dark:bg-graphon-dark-bg text-(--color-accent) shadow-sm border border-graphon-border/50 dark:border-graphon-dark-border/50'
                          : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white'
                      }`}
                  >
                    macOS Style
                  </button>
                  <button
                    onClick={() => onSetTitlebarStyle?.('windows')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 
                      ${
                        titlebarStyle === 'windows'
                          ? 'bg-white dark:bg-graphon-dark-bg text-(--color-accent) shadow-sm border border-graphon-border/50 dark:border-graphon-dark-border/50'
                          : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white'
                      }`}
                  >
                    Windows Style
                  </button>
                </div>
              </div>

              {/* Accent Color Selector */}
              <div className="mt-4 pt-4 border-t border-graphon-border dark:border-graphon-dark-border">
                <h3 className="text-sm font-semibold text-graphon-text-main dark:text-graphon-dark-text-main mb-3">
                  Accent Color
                </h3>
                <div className="flex flex-wrap gap-2">
                  {accentColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => onSetAccentColor(color.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${accentColor === color.id ? 'border-graphon-text-main dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    >
                      {accentColor === color.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vault Section */}
        <section>
          <h2 className="text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-3 tracking-widest uppercase px-1">
            Vault
          </h2>
          <div className="border border-graphon-border dark:border-graphon-dark-border rounded-xl p-4 bg-white dark:bg-graphon-dark-sidebar/50 space-y-3">
            {/* Current Vault Display */}
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-graphon-hover dark:bg-graphon-dark-hover border border-graphon-border/50 dark:border-graphon-dark-border/50">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-(--color-accent) shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--color-accent), transparent 90%)`
                }}
              >
                <FolderIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main mb-1">
                  Current Vault
                </p>
                <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary truncate font-mono">
                  {currentVaultPath || 'No vault selected'}
                </p>
              </div>
            </div>

            {/* Vault Actions */}
            <div className="space-y-2">
              <button
                onClick={async () => {
                  await selectVault()
                  showToast('Vault changed successfully!', 'success')
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-graphon-hover dark:bg-graphon-dark-hover flex items-center justify-center border border-graphon-border dark:border-graphon-dark-border">
                    <FolderOpenIcon className="w-5 h-5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main">
                      Change Vault
                    </p>
                    <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
                      Select a different folder for your workspace
                    </p>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {currentVaultPath && (
                <button
                  onClick={async () => {
                    try {
                      await (window as any).api.openVaultFolder(currentVaultPath)
                      showToast('Opened vault folder', 'success')
                    } catch (error) {
                      showToast('Failed to open vault folder', 'error')
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-graphon-hover dark:bg-graphon-dark-hover flex items-center justify-center border border-graphon-border dark:border-graphon-dark-border">
                      <svg
                        className="w-5 h-5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main">
                        Open Vault Folder
                      </p>
                      <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
                        Open in file explorer
                      </p>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Sidebar Modules Section */}
        <section>
          <h2 className="text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-3 tracking-widest uppercase px-1">
            Sidebar Modules
          </h2>
          <div className="border border-graphon-border dark:border-graphon-dark-border rounded-xl p-4 bg-white dark:bg-graphon-dark-sidebar/50 space-y-3">
            {/* Notes Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-(--color-accent)"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-accent), transparent 90%)`
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <span className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main">
                  Notes
                </span>
              </div>
              <button
                onClick={() => onToggleModule?.('notes')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${moduleVisibility?.notes ? 'bg-(--color-accent)' : 'bg-graphon-border'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${moduleVisibility?.notes ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            {/* Calendar Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                  <ClockIcon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main">
                  Calendar
                </span>
              </div>
              <button
                onClick={() => onToggleModule?.('calendar')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${moduleVisibility?.calendar ? 'bg-(--color-accent)' : 'bg-graphon-border'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${moduleVisibility?.calendar ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            {/* Database Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M3 14h18m-9-4v8m-7-6h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main">
                  Database
                </span>
              </div>
              <button
                onClick={() => onToggleModule?.('database')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${moduleVisibility?.database ? 'bg-(--color-accent)' : 'bg-graphon-border'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${moduleVisibility?.database ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* History Section */}
        <section>
          <h2 className="text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-3 tracking-widest uppercase px-1">
            History
          </h2>
          <div className="border border-graphon-border dark:border-graphon-dark-border rounded-xl p-4 bg-white dark:bg-graphon-dark-sidebar/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-lg bg-graphon-hover dark:bg-graphon-dark-hover 
                                              flex items-center justify-center border border-graphon-border dark:border-graphon-dark-border"
                >
                  <ClockIcon className="w-5 h-5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
                </div>
                <div>
                  <p className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main">
                    Undo/Redo
                  </p>
                  <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
                    {historyEnabled ? 'Enabled (Ctrl+Z / Ctrl+Y)' : 'Disabled'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleToggleHistory}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                          ${historyEnabled ? 'bg-(--color-accent)' : 'bg-graphon-border'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                              ${historyEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Data Section */}
        <section>
          <h2 className="text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-3 tracking-widest uppercase px-1">
            Data
          </h2>
          <div className="border border-graphon-border dark:border-graphon-dark-border rounded-xl p-2 bg-white dark:bg-graphon-dark-sidebar/50 space-y-1">
            {/* Export Button */}
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-between p-3 rounded-lg
                                     hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover
                                     transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-lg bg-graphon-hover dark:bg-graphon-dark-hover 
                                              flex items-center justify-center border border-graphon-border dark:border-graphon-dark-border transition-colors"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main">
                    Export Data
                  </p>
                  <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
                    Download all notes and events as JSON
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50 
                                         group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Import Button */}
            <button
              onClick={handleImportClick}
              className="w-full flex items-center justify-between p-3 rounded-lg
                                     hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover
                                     transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-lg bg-graphon-hover dark:bg-graphon-dark-hover 
                                              flex items-center justify-center border border-graphon-border dark:border-graphon-dark-border transition-colors"
                >
                  <ArrowUpTrayIcon className="w-5 h-5 text-graphon-text-secondary dark:text-graphon-dark-text-secondary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-graphon-text-main dark:text-graphon-dark-text-main">
                    Import Data
                  </p>
                  <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
                    Restore from a Graphon backup file
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50 
                                         group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </section>

        {/* Database Settings Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary tracking-widest uppercase px-1">
              Database Settings
            </h2>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="text-xs text-(--color-accent) hover:underline dark:text-(--color-accent) font-bold flex items-center gap-1"
            >
              <PlusIcon className="w-3 h-3" />
              {isAdding ? 'Cancel' : 'Add Preset'}
            </button>
          </div>
          <div className="border border-graphon-border dark:border-graphon-dark-border rounded-xl p-4 bg-white dark:bg-graphon-dark-sidebar/50">
            <div className="space-y-4">
              {isAdding && (
                <div className="flex items-end gap-3 p-4 rounded-xl bg-(--color-accent)/10 border border-(--color-accent)/20 mb-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-(--color-accent) opacity-70 uppercase px-1">
                      Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. XL"
                      value={newPresetLabel}
                      onChange={(e) => setNewPresetLabel(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-graphon-dark-bg border border-(--color-accent)/20 rounded-lg outline-none focus:ring-2 focus:ring-(--color-accent)/20"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-(--color-accent) opacity-70 uppercase px-1">
                      Label
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 80"
                      value={newPresetValue}
                      onChange={(e) => setNewPresetValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-graphon-dark-bg border border-(--color-accent)/20 rounded-lg outline-none focus:ring-2 focus:ring-(--color-accent)/20"
                    />
                  </div>
                  <button
                    onClick={handleAddPreset}
                    disabled={!newPresetLabel || !newPresetValue}
                    className="px-4 py-2 bg-(--color-accent) hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors h-9.5"
                  >
                    Save Preset
                  </button>
                </div>
              )}
              <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-2">
                Configure the available row height options for your databases.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {rowHeightPresets.map((preset, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-graphon-border dark:border-graphon-dark-border bg-graphon-hover dark:bg-graphon-dark-hover group"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-graphon-text-main dark:text-graphon-dark-text-main">
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
                        {preset.value}px
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeletePreset(idx)}
                      className="p-1.5 text-graphon-text-secondary/30 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 className="text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-3 tracking-widest uppercase px-1">
            About
          </h2>
          <div className="border border-graphon-border dark:border-graphon-dark-border rounded-xl p-6 space-y-4 bg-white dark:bg-graphon-dark-sidebar/50">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-(--color-accent) flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-2xl">G</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">Graphon</h3>
                <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-3">
                  Version 0.1.8
                </p>
                <p className="text-sm leading-relaxed text-graphon-text-main dark:text-graphon-dark-text-main opacity-80">
                  A beautiful Productivity app combining powerful note-taking with an elegant
                  calendar system. Built with modern web technologies.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-graphon-border dark:border-graphon-dark-border opacity-50">
              <div className="flex items-center space-x-2 text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
                <InformationCircleIcon className="w-4 h-4" />
                <span>Built with Electron, React, TypeScript & Tailwind CSS</span>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-graphon-text-secondary dark:text-graphon-dark-text-secondary text-center">
                Made with ❤️ for productivity enthusiasts
              </p>
            </div>
          </div>
        </section>

        {/* Keybindings Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary tracking-widest uppercase px-1">
              Keybindings
            </h2>
            <button
              onClick={resetKeybindings}
              className="text-xs text-(--color-accent) hover:underline dark:text-(--color-accent) font-bold"
            >
              Reset to Default
            </button>
          </div>
          <div className="border border-graphon-border dark:border-graphon-dark-border rounded-xl p-4 space-y-2 bg-white dark:bg-graphon-dark-sidebar/50">
            {Object.entries(keybindings).map(([action, keys]) => (
              <div
                key={action}
                className="flex items-center justify-between py-2 border-b border-graphon-border dark:border-graphon-dark-border last:border-0"
              >
                <span className="text-sm font-semibold text-graphon-text-main dark:text-graphon-dark-text-main capitalize">
                  {action.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center gap-2">
                  {keys.map((key, idx) => (
                    <kbd
                      key={idx}
                      className="px-2 py-1 bg-graphon-hover dark:bg-graphon-dark-hover rounded text-xs font-mono text-graphon-text-main dark:text-graphon-dark-text-main border border-graphon-border dark:border-graphon-dark-border"
                    >
                      {key}
                    </kbd>
                  ))}
                  <button
                    onClick={() => {
                      const newKey = prompt(
                        `Enter new key combination for ${action} (e.g., Control+k)`,
                        keys[0]
                      )
                      if (newKey) {
                        updateKeybinding(action as any, [newKey])
                        showToast(`Updated binding for ${action}`, 'success')
                      }
                    }}
                    className="p-1 text-graphon-text-secondary/50 hover:text-(--color-accent) transition-colors"
                    title="Edit Keybinding"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={isVisible}
          onClose={hideToast}
        />
      )}
    </div>
  )
}

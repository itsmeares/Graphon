// ============================================
// DATABASE ARCHITECTURE - Type Definitions
// ============================================

// Property types supported in database columns
export type PropertyType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url' | 'email'

// Column definition - defines the schema for each property
export interface Column {
  id: string
  name: string
  type: PropertyType
  icon?: string
  options?: string[] // For 'select' type
  width?: number // Custom width in pixels
}

// Item definition - represents a database row/record
export interface Item {
  id: string
  values: Record<string, any> // Key: Column ID, Value: property value
  content?: string // Optional rich content (e.g., for Graphon-style pages)
  createdAt: string
  updatedAt: string
}

// Database definition - the main container for data
export interface Database {
  id: string
  name: string
  icon?: string
  columns: Column[]
  items: Item[]
  rowHeight?: number // Custom row height for table view
}

// ============================================
// VIEW CONFIGURATION TYPES
// ============================================

// Database view types
export type ViewType =
  | 'table'
  | 'board'
  | 'gallery'
  | 'chart'
  | 'feed'
  | 'map'
  | 'calendar'
  | 'notes'
  | 'database'
  | 'settings'
  | 'home'
  | 'graph'

export type Theme = 'light' | 'dark' | 'system'

export interface Note {
  id: string
  title: string
  content: string
  updatedAt: string
}

// History Action for Undo/Redo
export interface HistoryAction {
  type: string
  entityType: string
  entityId: string
  previousState: any
  newState: any
  timestamp: number
}

export interface ExportData {
  version: string
  timestamp?: string
  exportDate?: string // SettingsView uses exportDate
  databases?: Database[]
  notes: Note[]
  events: CalendarEvent[]
}

// View configuration
export interface SortConfig {
  columnId: string
  direction: 'asc' | 'desc'
}

export interface FilterConfig {
  columnId: string
  operator: 'contains' | 'equals' | 'isEmpty'
  value: string
}

export interface ViewConfig {
  id: string
  type: ViewType
  name: string
  sort?: SortConfig | null
  filter?: FilterConfig[]
  groupBy?: string | null
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate column IDs
let columnIdCounter = 0
export function generateColumnId(): string {
  return `col_${++columnIdCounter}`
}

// Generate item IDs
export function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Generate view IDs
export function generateViewId(): string {
  return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Create default database
export function createDefaultDatabase(name: string): Database {
  const statusColId = generateColumnId()

  return {
    id: `db_${Date.now()}`,
    name,
    icon: '📋',
    columns: [
      { id: 'title', name: 'Title', type: 'text' },
      {
        id: statusColId,
        name: 'Status',
        type: 'select',
        options: ['To Do', 'In Progress', 'Done']
      },
      { id: generateColumnId(), name: 'Due Date', type: 'date' },
      {
        id: generateColumnId(),
        name: 'Priority',
        type: 'select',
        options: ['Low', 'Medium', 'High']
      }
    ],
    items: []
  }
}

// Create default views for a database
export function createDefaultViews(groupByColumnId?: string): ViewConfig[] {
  return [
    { id: generateViewId(), type: 'table', name: 'Table', sort: null, filter: [] },
    {
      id: generateViewId(),
      type: 'board',
      name: 'Board',
      groupBy: groupByColumnId,
      sort: null,
      filter: []
    },
    { id: generateViewId(), type: 'gallery', name: 'Gallery', sort: null, filter: [] },
    { id: generateViewId(), type: 'calendar', name: 'Calendar', sort: null, filter: [] }
  ]
}

// CalendarView için temel etkinlik tipi
export interface CalendarEvent extends Item {
  title: string
  description?: string
  startDate: Date
  endDate: Date
  color?: string
  day?: number
  hour?: number
  duration?: number
}

// Takvim üzerinde konumlandırılmış etkinlik tipi
export interface PositionedEvent extends CalendarEvent {
  top: number
  height: number
  column: number
  totalColumns: number
}

// ============================================
// KEYBINDINGS
// ============================================

export type KeybindingAction =
  | 'deleteItem'
  | 'closeModal'
  | 'save'
  | 'undo'
  | 'redo'
  | 'newItem'
  | 'closeTab'
  | 'nextTab'
  | 'previousTab'
  | 'newTab'

export interface KeybindingConfig {
  [action: string]: string[] // e.g., 'deleteItem': ['Delete', 'Backspace']
}

export const DEFAULT_KEYBINDINGS: KeybindingConfig = {
  deleteItem: ['Delete'], // Removed Backspace to avoid accidental nav back
  closeModal: ['Escape'],
  save: ['Control+s', 'Meta+s'],
  undo: ['Control+z', 'Meta+z'],
  redo: ['Control+y', 'Meta+y', 'Control+Shift+z', 'Meta+Shift+z'],
  newItem: ['Control+n', 'Meta+n'],
  closeTab: ['Control+w', 'Meta+w'],
  nextTab: ['Control+Tab'],
  previousTab: ['Control+Shift+Tab'],
  newTab: ['Control+t', 'Meta+t']
}

// ============================================
// FILE SYSTEM TYPES
// ============================================

export interface FileNode {
  name: string
  path: string // Relative path from vault root
  type: 'file' | 'folder'
  children?: FileNode[]
}

// ============================================
// TAB SYSTEM TYPES
// ============================================

export type TabType = 'file' | 'settings' | 'calendar' | 'database' | 'new-page' | 'graph' | 'tasks'

export interface Tab {
  id: string
  type: TabType
  title: string
  path?: string // for files
  icon?: any // Component or string
  isDirty?: boolean
}

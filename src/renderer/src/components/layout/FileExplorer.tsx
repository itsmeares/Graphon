import { useState } from 'react'
import { ChevronRight, File as FileIcon, Folder, Plus, RefreshCw } from 'lucide-react'
import { FileNode } from '../../types'
import { useVault } from '../../contexts/VaultContext'
import { FileContextMenu } from '../FileContextMenu'
import RelatedNotes from '../RelatedNotes'

interface FileExplorerProps {
  nodes: FileNode[]
}

export default function FileExplorer({ nodes }: FileExplorerProps) {
  const { createNote, refreshFiles, renameNote, deleteNote, activeFile, openFile } = useVault()

  const handleCreateNote = async () => {
    await createNote()
  }

  const handleRename = async (filename: string) => {
    const newName = window.prompt('Enter new name:', filename)
    if (newName && newName !== filename) {
      let safeNewName = newName
      if (filename.endsWith('.md') && !safeNewName.endsWith('.md')) {
        safeNewName += '.md'
      }
      await renameNote(filename, safeNewName)
    }
  }

  const handleDelete = async (filename: string) => {
    if (confirm(`Are you sure you want to delete "${filename}"?`)) {
      await deleteNote(filename)
    }
  }

  const handleRevealInExplorer = (filename: string) => {
    // @ts-ignore
    window.api?.showItemInFolder?.(filename)
  }

  const handleAddToFavorites = (filename: string) => {
    // Dispatch custom event or use context if we had a global favorites handler here,
    // but MainLayout might not expose it easily to this component without drilling.
    // For now, we'll log or skip if not critical, OR we accept that FileExplorer
    // is simpler than Sidebar. However, ContextMenu expects this prop.
    // Let's implement a safe no-op or dispatch event.
    console.log('Add to favorites:', filename)
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar select-none flex flex-col">
      {/* Actions Header */}
      <div className="flex items-center justify-between px-3 pb-2 mb-2 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex space-x-1">
          <button
            onClick={handleCreateNote}
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            title="New Note"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => refreshFiles()}
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-2 flex-1">
        {nodes.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            level={0}
            onRename={handleRename}
            onDelete={handleDelete}
            onReveal={handleRevealInExplorer}
            onAddToFavorites={handleAddToFavorites}
          />
        ))}
        {nodes.length === 0 && (
          <div className="text-xs text-neutral-500 px-4 py-2">No files found</div>
        )}
      </div>

      {activeFile && <RelatedNotes currentFilePath={activeFile} onNoteClick={openFile} />}
    </div>
  )
}

interface FileTreeNodeProps {
  node: FileNode
  level: number
  onRename: (name: string) => void
  onDelete: (name: string) => void
  onReveal: (name: string) => void
  onAddToFavorites: (name: string) => void
}

function FileTreeNode({
  node,
  level,
  onRename,
  onDelete,
  onReveal,
  onAddToFavorites
}: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { openFile, activeFile } = useVault()

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handleClick = async () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen)
    } else {
      await openFile(node.path)
    }
  }

  const isActive = activeFile === node.path

  const content = (
    <div
      className={`flex items-center py-1 px-2 rounded-md cursor-pointer transition-colors duration-200
          ${
            isActive
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200'
          }
        `}
      style={{ paddingLeft: `${level * 12 + 8}px` }}
      onClick={handleClick}
    >
      <span className="shrink-0 mr-1.5 opacity-70">
        {node.type === 'folder' ? (
          <div className="flex items-center">
            <ChevronRight
              className={`w-3 h-3 mr-1 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              onClick={handleToggle}
            />
            <Folder className="w-4 h-4" />
          </div>
        ) : (
          <FileIcon className="w-4 h-4 ml-4" />
        )}
      </span>
      <span className="truncate text-sm">{node.name}</span>
    </div>
  )

  return (
    <div className="flex flex-col">
      {node.type === 'file' ? (
        <FileContextMenu
          filename={node.name}
          onRename={onRename}
          onDelete={onDelete}
          onAddToFavorites={onAddToFavorites}
          onRevealInExplorer={onReveal}
        >
          {content}
        </FileContextMenu>
      ) : (
        content
      )}

      {/* Children (Recursive) */}
      {node.type === 'folder' && isOpen && node.children && (
        <div className="flex flex-col border-l border-neutral-200 dark:border-neutral-800 ml-4">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onRename={onRename}
              onDelete={onDelete}
              onReveal={onReveal}
              onAddToFavorites={onAddToFavorites}
            />
          ))}
        </div>
      )}
    </div>
  )
}

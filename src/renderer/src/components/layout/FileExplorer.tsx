import { useState } from 'react'
import {
  ChevronRightIcon,
  DocumentIcon,
  FolderIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { FileNode } from '../../types' // Adjust path if needed
import { useVault } from '../../contexts/VaultContext'

interface FileExplorerProps {
  nodes: FileNode[]
}

export default function FileExplorer({ nodes }: FileExplorerProps) {
  const { createNote, refreshFiles } = useVault()

  const handleCreateNote = async () => {
    await createNote()
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
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            title="New Note"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => refreshFiles()}
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-2 flex-1">
        {nodes.map((node) => (
          <FileTreeNode key={node.path} node={node} level={0} />
        ))}
        {nodes.length === 0 && (
          <div className="text-xs text-neutral-500 px-4 py-2">No files found</div>
        )}
      </div>
    </div>
  )
}

interface FileTreeNodeProps {
  node: FileNode
  level: number
}

function FileTreeNode({ node, level }: FileTreeNodeProps) {
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

  return (
    <div className="flex flex-col">
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
              <ChevronRightIcon
                className={`w-3 h-3 mr-1 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                onClick={handleToggle}
              />
              <FolderIcon className="w-4 h-4" />
            </div>
          ) : (
            <DocumentIcon className="w-4 h-4 ml-4" /> // Indent for non-folder files to align with folder labels
          )}
        </span>
        <span className="truncate text-sm">{node.name}</span>
      </div>

      {/* Children (Recursive) */}
      {node.type === 'folder' && isOpen && node.children && (
        <div className="flex flex-col border-l border-neutral-200 dark:border-neutral-800 ml-4">
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

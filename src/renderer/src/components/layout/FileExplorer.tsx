import { useState, useMemo, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronRight, File as FileIcon, Folder, Plus, RefreshCw } from 'lucide-react'
import { FileNode } from '../../types'
import { useVault } from '../../contexts/VaultContext'
import { FileContextMenu } from '../FileContextMenu'
import RelatedNotes from '../RelatedNotes'
import { flattenTree, FlatNode } from '../../utils/treeUtils'

interface FileExplorerProps {
  nodes: FileNode[]
}

// Row height for virtualization (pixels)
const ROW_HEIGHT = 28

export default function FileExplorer({ nodes }: FileExplorerProps) {
  const { createNote, refreshFiles, renameNote, deleteNote, activeFile, openFile } = useVault()

  // Centralized expansion state: Set of expanded folder paths
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  // Ref for the virtualized scroll container
  const parentRef = useRef<HTMLDivElement>(null)

  // Flatten tree based on current expansion state
  const flatItems = useMemo(() => flattenTree(nodes, expandedPaths), [nodes, expandedPaths])

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10 // Render extra items above/below viewport for smooth scrolling
  })

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
    console.log('Add to favorites:', filename)
  }

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // Handle node click (file or folder)
  const handleNodeClick = useCallback(
    async (flatNode: FlatNode) => {
      if (flatNode.node.type === 'folder') {
        toggleFolder(flatNode.node.path)
      } else {
        await openFile(flatNode.node.path)
      }
    },
    [toggleFolder, openFile]
  )

  return (
    <div className="flex-1 overflow-hidden py-2 custom-scrollbar select-none flex flex-col">
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

      {/* Virtualized File Tree */}
      <div ref={parentRef} className="flex-1 overflow-y-auto overflow-x-hidden px-2">
        {flatItems.length > 0 ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const flatNode = flatItems[virtualItem.index]
              const { node, level, isExpanded } = flatNode
              const isActive = activeFile === node.path

              const rowContent = (
                <div
                  className={`flex items-center py-1 px-2 rounded-md cursor-pointer transition-colors duration-200
                    ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }
                  `}
                  style={{ paddingLeft: `${level * 12 + 8}px` }}
                  onClick={() => handleNodeClick(flatNode)}
                >
                  <span className="shrink-0 mr-1.5 opacity-70">
                    {node.type === 'folder' ? (
                      <div className="flex items-center">
                        <ChevronRight
                          className={`w-3 h-3 mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFolder(node.path)
                          }}
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
                <div
                  key={flatNode.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                >
                  {node.type === 'file' ? (
                    <FileContextMenu
                      filename={node.name}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onAddToFavorites={handleAddToFavorites}
                      onRevealInExplorer={handleRevealInExplorer}
                    >
                      {rowContent}
                    </FileContextMenu>
                  ) : (
                    rowContent
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-xs text-neutral-500 px-4 py-2">No files found</div>
        )}
      </div>

      {activeFile && <RelatedNotes currentFilePath={activeFile} onNoteClick={openFile} />}
    </div>
  )
}

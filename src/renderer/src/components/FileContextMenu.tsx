import * as ContextMenu from '@radix-ui/react-context-menu'
import { ReactNode } from 'react'
import { Pencil, Trash, Star, FolderOpen } from 'lucide-react'

interface FileContextMenuProps {
  children: ReactNode
  filename: string
  onRename: (filename: string) => void
  onDelete: (filename: string) => void
  onAddToFavorites: (filename: string) => void
  onRevealInExplorer: (filename: string) => void
}

export function FileContextMenu({
  children,
  filename,
  onRename,
  onDelete,
  onAddToFavorites,
  onRevealInExplorer
}: FileContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-55 bg-white/90 dark:bg-[#1C1C1A]/90 backdrop-blur-xl rounded-lg shadow-xl border border-black/5 dark:border-white/10 p-1.5 animate-in fade-in zoom-in-95 duration-200 z-50 overflow-hidden">
          <ContextMenu.Item
            className="group flex items-center px-2 py-1.5 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main hover:bg-neutral-200/50 dark:hover:bg-white/10 outline-none cursor-pointer transition-colors"
            onSelect={() => onRename(filename)}
          >
            <Pencil className="w-4 h-4 mr-2 text-neutral-500" />
            Rename
          </ContextMenu.Item>

          <ContextMenu.Item
            className="group flex items-center px-2 py-1.5 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main hover:bg-neutral-200/50 dark:hover:bg-white/10 outline-none cursor-pointer transition-colors"
            onSelect={() => onAddToFavorites(filename)}
          >
            <Star className="w-4 h-4 mr-2 text-neutral-500" />
            Add to Favorites
          </ContextMenu.Item>

          <ContextMenu.Item
            className="group flex items-center px-2 py-1.5 rounded-md text-sm text-graphon-text-main dark:text-graphon-dark-text-main hover:bg-neutral-200/50 dark:hover:bg-white/10 outline-none cursor-pointer transition-colors"
            onSelect={() => onRevealInExplorer(filename)}
          >
            <FolderOpen className="w-4 h-4 mr-2 text-neutral-500" />
            Reveal in Explorer
          </ContextMenu.Item>

          <ContextMenu.Separator className="h-px bg-black/5 dark:bg-white/5 my-1" />

          <ContextMenu.Item
            className="group flex items-center px-2 py-1.5 rounded-md text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 outline-none cursor-pointer transition-colors"
            onSelect={() => onDelete(filename)}
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

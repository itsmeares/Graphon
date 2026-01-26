import { memo, useState } from 'react'
import { PlusIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import type { Database, Item, ViewConfig } from '../../types'

interface GalleryViewProps {
  database: Database
  viewConfig: ViewConfig
  items: Item[]
  onUpdateItem: (item: Item) => void
  onDeleteItem: (itemId: string) => void
  onAddItem: (initialValues?: Record<string, any>) => void
  onItemClick: (item: Item) => void
}

// Memoized Gallery Card
const GalleryCard = memo(function GalleryCard({
  item,
  onDelete,
  onClick
}: {
  item: Item
  onDelete: () => void
  onClick: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  const title = item.values['title'] || 'Untitled'

  return (
    <div
      className="group relative bg-white dark:bg-graphon-dark-sidebar rounded-xl border border-graphon-border dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-300 dark:hover:border-white/10 cursor-pointer flex flex-col h-56 shadow-sm"
      onClick={onClick}
    >
      {/* Visual Area / Cover Placeholder */}
      <div className="flex-1 bg-[#f9f9f8] dark:bg-[#1a1a1a] relative overflow-hidden">
        {/* Subtle grid pattern or placeholder visual could go here */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)',
            backgroundSize: '10px 10px'
          }}
        />

        {/* Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 bg-white/80 dark:bg-black/40 backdrop-blur-md text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:text-graphon-text-main dark:hover:text-white rounded-md transition-all duration-200"
        >
          <EllipsisHorizontalIcon className="w-4 h-4" />
        </button>

        {showMenu && (
          <div className="absolute top-10 right-2 w-32 bg-white dark:bg-graphon-dark-sidebar border border-graphon-border dark:border-[#333333] rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
                setShowMenu(false)
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-white/5 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Title & Info Strip */}
      <div className="p-4 bg-white dark:bg-graphon-dark-sidebar border-t border-graphon-border dark:border-white/5">
        <h3 className="text-[14px] text-graphon-text-main dark:text-[#dfdfdf] line-clamp-2 font-semibold leading-tight mb-1">
          {String(title)}
        </h3>
        <div className="text-[11px] text-graphon-text-secondary dark:text-graphon-dark-text-secondary/60 flex items-center gap-2 mt-2 font-medium">
          <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
})

export default function GalleryView({
  items,
  onDeleteItem,
  onAddItem,
  onItemClick
}: GalleryViewProps) {
  return (
    <div className="h-full overflow-y-auto p-8 bg-graphon-bg dark:bg-[#191919] transition-colors duration-300 custom-scrollbar">
      <div className="max-w-350 mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {items.map((item) => (
          <GalleryCard
            key={item.id}
            item={item}
            onDelete={() => onDeleteItem(item.id)}
            onClick={() => onItemClick(item)}
          />
        ))}

        {/* Add New Card (Matched style) */}
        <button
          onClick={() => onAddItem()}
          className="h-56 group relative flex flex-col bg-transparent rounded-xl border-2 border-dashed border-graphon-border dark:border-white/5 overflow-hidden transition-all duration-300 hover:border-(--color-accent)/50 hover:bg-(--color-accent)/5 dark:hover:bg-white/5"
        >
          <div className="flex-1 flex items-center justify-center text-graphon-text-secondary/30 group-hover:text-(--color-accent)/50 transition-colors">
            <PlusIcon className="w-8 h-8 stroke-1" />
          </div>
          <div className="w-full p-4 text-left">
            <span className="text-[14px] font-medium text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 group-hover:text-(--color-accent)/80 transition-colors">
              + New page
            </span>
          </div>
        </button>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-graphon-text-secondary/40">
          <div className="text-7xl mb-6 opacity-20">🖼️</div>
          <p className="text-xl font-bold text-graphon-text-main dark:text-graphon-dark-text-main mb-2">
            No items yet
          </p>
          <p className="text-sm">Click the "+ New page" card to begin your collection</p>
        </div>
      )}
    </div>
  )
}

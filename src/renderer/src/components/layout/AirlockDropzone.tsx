/**
 * AirlockDropzone - Drag-drop target for pushing local notes to team
 *
 * Location: Bottom of Local Mode sidebar
 * Interaction: Drop a local note here → Mock toast "Sent to Team Inbox"
 */

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { CloudUpload, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AirlockDropzoneProps {
  onDrop?: (itemPath: string) => void
}

export default function AirlockDropzone({ onDrop }: AirlockDropzoneProps) {
  const [showSuccess, setShowSuccess] = useState(false)

  const { setNodeRef, isOver, active } = useDroppable({
    id: 'airlock-dropzone'
  })

  // Check if we have an active drag item
  const isDragging = !!active

  const handleDrop = () => {
    if (active?.data.current?.path) {
      onDrop?.(active.data.current.path)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    }
  }

  // Show only when dragging
  if (!isDragging && !showSuccess) {
    return null
  }

  return (
    <div className="px-3 py-3 border-t border-black/5 dark:border-white/5">
      <motion.div
        ref={setNodeRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        onAnimationComplete={() => {
          if (isOver && active) {
            handleDrop()
          }
        }}
        className={`
          relative flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed transition-all duration-200
          ${
            isOver
              ? 'border-(--color-accent) bg-(--color-accent)/10 scale-[1.02]'
              : 'border-graphon-border/50 dark:border-graphon-dark-border/50 bg-graphon-hover/50 dark:bg-graphon-dark-hover/50'
          }
        `}
      >
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 text-green-500"
            >
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">Sent to Team Inbox</span>
            </motion.div>
          ) : (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-2 ${isOver ? 'text-(--color-accent)' : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary'}`}
            >
              <CloudUpload className={`w-5 h-5 ${isOver ? 'animate-bounce' : ''}`} />
              <span className="text-sm font-medium">{isOver ? 'Drop to send' : 'Team Portal'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

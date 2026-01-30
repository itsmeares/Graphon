import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, FileText } from 'lucide-react'

interface RelatedNote {
  id: string
  title: string
  path: string
  score: number
}

interface RelatedNotesProps {
  currentFilePath: string | null
  onNoteClick: (filePath: string) => void
}

export default function RelatedNotes({ currentFilePath, onNoteClick }: RelatedNotesProps) {
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchRelatedNotes = async () => {
      if (!currentFilePath) {
        setRelatedNotes([])
        return
      }

      setLoading(true)
      try {
        const notes = await window.api.getRelatedNotes(currentFilePath)
        if (isMounted) {
          setRelatedNotes(notes)
        }
      } catch (error) {
        console.error('Failed to fetch related notes:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Debounce slightly to avoid rapid updates while typing if we were listening to content changes
    // But here we listen to file path, so instant is fine.
    // However, if we wanted to update while typing, we'd need to re-generate embedding on the fly (expensive).
    // The requirement is "Kullanıcı bir notu görüntülerken", implying when file changes.
    // Indexer updates embedding on save. So we might need to listen to 'vault:index-updated' too.
    fetchRelatedNotes()

    // Listen for index updates to refresh related notes if current file or others changed
    const unsubscribe = window.api.onVaultIndexUpdated(() => {
      fetchRelatedNotes()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [currentFilePath])

  if (!currentFilePath) return null

  // If no related notes found (or very low score), you might want to hide it.
  // But let's show "No related notes found" or simply nothing.
  // Requirement says "list top 5".
  // if (!loading && relatedNotes.length === 0) return null

  return (
    <div className="mt-6 px-3">
      <div className="flex items-center space-x-2 px-3 mb-2 text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50">
        <Sparkles className="w-3 h-3" />
        <h3 className="text-[11px] font-bold uppercase tracking-widest">Related Notes</h3>
      </div>

      <div className="flex flex-col space-y-1">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 text-xs text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 italic"
            >
              Analyzing...
            </motion.div>
          ) : relatedNotes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 text-xs text-graphon-text-secondary/40 dark:text-graphon-dark-text-secondary/40 italic"
            >
              No related notes found.
            </motion.div>
          ) : (
            relatedNotes.map((note) => (
              <motion.button
                key={note.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => onNoteClick(note.path)}
                className="w-full text-left group flex items-start space-x-3 px-3 py-2 rounded-lg transition-all hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover"
              >
                <FileText className="w-4 h-4 mt-0.5 shrink-0 text-graphon-text-secondary/70 dark:text-graphon-dark-text-secondary/70 group-hover:text-(--color-accent) transition-colors" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary group-hover:text-graphon-text-main dark:group-hover:text-white truncate font-medium transition-colors">
                    {note.title}
                  </span>
                  <span className="text-[10px] text-graphon-text-secondary/50 dark:text-graphon-dark-text-secondary/50 group-hover:text-(--color-accent) transition-colors">
                    {Math.round(note.score * 100)}% Match
                  </span>
                </div>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

import { useRef, useEffect } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDanger?: boolean
  showDontAskAgain?: boolean
  onConfirm: (dontAskAgain: boolean) => void
  onCancel: () => void
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  showDontAskAgain = false,
  onConfirm,
  onCancel
}: ConfirmationModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const dontAskAgainRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-100 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onCancel}
        />

        {/* Modal Panel */}
        <div
          ref={dialogRef}
          className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-graphon-dark-bg p-6 text-left align-middle transition-all border border-graphon-border dark:border-graphon-dark-border shadow-2xl"
        >
          <div className="flex items-start space-x-4">
            <div
              className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isDanger ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 'bg-(--color-accent)/10 text-(--color-accent) border border-(--color-accent)/20'}`}
            >
              <ExclamationTriangleIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-graphon-text-main dark:text-graphon-dark-text-main">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary leading-relaxed">
                  {message}
                </p>
              </div>

              {showDontAskAgain && (
                <div className="mt-4 flex items-center">
                  <input
                    ref={dontAskAgainRef}
                    id="dont-ask-again"
                    type="checkbox"
                    className="h-4 w-4 rounded border-graphon-border dark:border-graphon-dark-border text-(--color-accent) focus:ring-(--color-accent) bg-white dark:bg-graphon-dark-sidebar"
                  />
                  <label
                    htmlFor="dont-ask-again"
                    className="ml-2 block text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary font-medium select-none cursor-pointer"
                  >
                    Don't ask me again
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-bold text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover rounded-lg transition-colors border border-graphon-border dark:border-graphon-dark-border"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-700 border border-red-600/50 shadow-sm'
                  : 'bg-(--color-accent) hover:brightness-110 border border-(--color-accent)/50 shadow-sm'
              }`}
              onClick={() => {
                const dontAsk = dontAskAgainRef.current?.checked || false
                onConfirm(dontAsk)
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

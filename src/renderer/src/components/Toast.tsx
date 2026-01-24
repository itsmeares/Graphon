import { useEffect, useState } from 'react'
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  isVisible: boolean
  onClose: () => void
}

export default function Toast({ message, type, isVisible, onClose }: ToastProps) {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
      const timer = setTimeout(() => {
        onClose()
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!shouldRender) return null

  return (
    <div
      className={`
                fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl
                backdrop-blur-xl border transition-all duration-300 ease-out
                ${
                  type === 'success'
                    ? 'bg-green-500/90 dark:bg-green-600/90 border-green-400/30 text-white'
                    : 'bg-red-500/90 dark:bg-red-600/90 border-red-400/30 text-white'
                }
                ${
                  isVisible
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-4 scale-95'
                }
            `}
    >
      {type === 'success' ? (
        <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
      ) : (
        <XCircleIcon className="w-5 h-5 flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="p-1 rounded-md hover:bg-white/20 transition-colors ml-2">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

// Hook for easy toast management
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setIsVisible(true)
  }

  const hideToast = () => {
    setIsVisible(false)
  }

  return { toast, isVisible, showToast, hideToast }
}

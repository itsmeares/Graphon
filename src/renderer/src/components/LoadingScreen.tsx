import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingScreenProps {
  onFinished: () => void
}

const LoadingScreen = ({ onFinished }: LoadingScreenProps) => {
  const [status, setStatus] = useState('Initializing Graphon...')
  const [progress, setProgress] = useState<number | null>(null)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // @ts-ignore
    window.api.onUpdateMessage((message: any) => {
      switch (message.type) {
        case 'checking':
          setStatus('Checking for updates...')
          break
        case 'available':
          setStatus('Update found! Downloading...')
          break
        case 'not-available':
          setStatus('App is up to date')
          setTimeout(() => onFinished(), 1000)
          break
        case 'downloading':
          setStatus('Downloading updates...')
          setProgress(Math.round(message.progress.percent))
          break
        case 'downloaded':
          setStatus('Update downloaded. Installing and restarting...')
          setProgress(100)
          break
        case 'error':
          setStatus(`Update error: ${message.error}`)
          setIsError(true)
          // On error, let the user proceed after a short delay
          setTimeout(() => onFinished(), 3000)
          break
      }
    })

    // Start the check after a short delay to show the beautiful loading screen
    const timer = setTimeout(() => {
      // @ts-ignore
      window.api.checkForUpdates()
    }, 1500)

    // Safety timeout: if nothing happens for 15 seconds, proceed to the app
    const safetyTimer = setTimeout(() => {
      onFinished()
    }, 15000)

    return () => {
      clearTimeout(timer)
      clearTimeout(safetyTimer)
    }
  }, [onFinished])

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-graphon-bg dark:bg-graphon-dark-bg animate-in fade-in duration-700">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-8 bg-blue-500/10 dark:bg-blue-400/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 mb-8 relative">
            <Loader2 className="w-full h-full text-blue-500 animate-[spin_2s_linear_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-500/10 rounded-full animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-graphon-text-main dark:text-white mb-2 tracking-tight">
            Graphon
          </h1>

          <div className="flex flex-col items-center gap-4">
            <p
              className={`text-sm font-medium transition-all duration-300 ${isError ? 'text-red-500' : 'text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60'}`}
            >
              {status}
            </p>

            {progress !== null && (
              <div className="w-48 h-1 overflow-hidden bg-gray-200 dark:bg-gray-800 rounded-full">
                <div
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 text-[10px] font-bold text-graphon-text-secondary/20 dark:text-graphon-dark-text-secondary/20 uppercase tracking-[0.5em]">
        Preparing your creative space
      </div>
    </div>
  )
}

export default LoadingScreen

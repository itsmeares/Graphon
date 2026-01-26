import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Command } from 'lucide-react'

interface LoadingScreenProps {
  onFinished: () => void
}

const LoadingScreen = ({ onFinished }: LoadingScreenProps) => {
  const [status, setStatus] = useState('Initializing Graphon')
  const [progress, setProgress] = useState<number | null>(null)
  const [isError, setIsError] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // @ts-ignore
    const unsubscribe = window.api?.onUpdateMessage?.((message: any) => {
      switch (message.type) {
        case 'checking':
          setStatus('Checking for updates')
          break
        case 'available':
          setStatus('Update found')
          break
        case 'not-available':
          setStatus('Ready to launch')
          setTimeout(() => handleFinish(), 500)
          break
        case 'downloading':
          setStatus('Downloading updates')
          setProgress(Math.round(message.progress.percent))
          break
        case 'downloaded':
          setStatus('Installing update')
          setProgress(100)
          break
        case 'error':
          setStatus(`System note: ${message.error}`)
          setIsError(true)
          setTimeout(() => handleFinish(), 2000)
          break
      }
    })

    const timer = setTimeout(() => {
      // @ts-ignore
      if (window.api?.checkForUpdates) {
        window.api.checkForUpdates()
      } else {
        handleFinish()
      }
    }, 1500)

    const safetyTimer = setTimeout(() => {
      handleFinish()
    }, 10000)

    return () => {
      clearTimeout(timer)
      clearTimeout(safetyTimer)
    }
  }, [onFinished])

  const handleFinish = () => {
    setIsExiting(true)
    setTimeout(onFinished, 800)
  }

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#FFFCF8] dark:bg-[#1C1C1A] overflow-hidden"
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.15, 0.1],
                x: [0, 50, 0],
                y: [0, -50, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-(--color-accent) blur-[120px]"
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.05, 0.1, 0.05],
                x: [0, -30, 0],
                y: [0, 60, 0]
              }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] rounded-full bg-purple-500 blur-[120px]"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center"
          >
            {/* Logo area */}
            <div className="relative mb-12">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-24 h-24 rounded-4xl bg-white dark:bg-[#2C2C2A] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center ring-1 ring-black/5 dark:ring-white/5 relative z-10"
              >
                <Command className="w-10 h-10 text-(--color-accent) drop-shadow-sm" />
              </motion.div>

              {/* Spinning ring */}
              <div className="absolute -inset-3 border-2 border-dashed border-(--color-accent)/20 dark:border-(--color-accent)/10 rounded-[42px] animate-[spin_10s_linear_infinite]" />
            </div>

            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-graphon-text-main dark:text-white mb-3 tracking-tight"
              >
                Graphon
              </motion.h1>

              <div className="flex flex-col items-center min-h-15">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={status}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`text-sm font-medium tracking-wide flex items-center gap-2 ${
                      isError ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {!isError && (
                      <span className="w-1 h-1 rounded-full bg-(--color-accent) animate-pulse" />
                    )}
                    {status}
                    {progress === null && !isError && (
                      <span className="flex gap-1 ml-1">
                        <span className="w-0.5 h-0.5 rounded-full bg-current animate-[bounce_1s_infinite_100ms]" />
                        <span className="w-0.5 h-0.5 rounded-full bg-current animate-[bounce_1s_infinite_200ms]" />
                        <span className="w-0.5 h-0.5 rounded-full bg-current animate-[bounce_1s_infinite_300ms]" />
                      </span>
                    )}
                  </motion.p>
                </AnimatePresence>

                {progress !== null && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    className="mt-6 w-48 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden"
                  >
                    <motion.div
                      className="h-full bg-(--color-accent)"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          <footer className="absolute bottom-12 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 1 }}
              className="text-[10px] font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-[0.4em] text-center"
            >
              Crafting your workflow
            </motion.div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default LoadingScreen

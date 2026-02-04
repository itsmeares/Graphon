import { useState } from 'react'
import { FolderOpenIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useVault } from '../contexts/VaultContext'

export default function WelcomeView() {
  const { selectVault } = useVault()
  const [rememberVault, setRememberVault] = useState(false)

  const handleOpenVault = async () => {
    await selectVault()
    // If remember is checked, store the preference
    // The actual vault path is stored by VaultContext/main process
    if (rememberVault) {
      localStorage.setItem('graphon-auto-open-vault', 'true')
    } else {
      localStorage.removeItem('graphon-auto-open-vault')
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-8 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-30 dark:opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-(--color-accent)/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-2xl w-full text-center animate-in fade-in zoom-in duration-700">
        {/* Logo/Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-(--color-accent) to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl animate-in zoom-in duration-500">
              G
            </div>
            <div className="absolute -top-2 -right-2 animate-bounce delay-500">
              <SparklesIcon className="w-8 h-8 text-yellow-500 drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-(--color-accent) to-purple-600 bg-clip-text text-transparent dark:from-(--color-accent) dark:to-purple-400 animate-in slide-in-from-bottom-4 duration-700 delay-100">
          Welcome to Graphon
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-12 animate-in slide-in-from-bottom-4 duration-700 delay-200">
          Your premium workspace for notes, calendar, and organization.
          <br />
          Get started by opening or creating a vault.
        </p>

        {/* Vault Info Card */}
        <div className="mb-8 p-6 rounded-2xl glass-modal border border-graphon-border dark:border-graphon-dark-border animate-in slide-in-from-bottom-4 duration-700 delay-300">
          <h2 className="text-xl font-semibold mb-3 text-graphon-text-main dark:text-graphon-dark-text-main">
            What is a Vault?
          </h2>
          <p className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary leading-relaxed">
            A vault is a folder on your computer where Graphon stores all your notes and data as
            files. You have full control over your data, and you can sync it using your preferred
            method (Dropbox, Git, etc.).
          </p>
        </div>

        {/* Remember Vault Checkbox */}
        <div className="mb-6 flex items-center justify-center gap-2 animate-in slide-in-from-bottom-4 duration-700 delay-350">
          <input
            type="checkbox"
            id="remember-vault"
            checked={rememberVault}
            onChange={(e) => setRememberVault(e.target.checked)}
            className="w-4 h-4 rounded border-graphon-border dark:border-graphon-dark-border text-(--color-accent) focus:ring-(--color-accent)/50"
          />
          <label
            htmlFor="remember-vault"
            className="text-sm text-graphon-text-secondary dark:text-graphon-dark-text-secondary cursor-pointer"
          >
            Remember this vault
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in slide-in-from-bottom-4 duration-700 delay-400">
          <button
            onClick={handleOpenVault}
            className="group relative px-8 py-4 bg-linear-to-r from-(--color-accent) to-purple-600 text-white rounded-xl font-semibold text-lg shadow-2xl hover:shadow-(--color-accent)/50 transition-all duration-300 hover:scale-105 btn-squish overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-r from-(--color-accent)/80 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center space-x-3">
              <FolderOpenIcon className="w-6 h-6" />
              <span>Open Vault</span>
            </div>
          </button>

          <button
            onClick={handleOpenVault}
            className="px-8 py-4 bg-graphon-bg dark:bg-graphon-dark-bg border-2 border-graphon-border dark:border-graphon-dark-border text-graphon-text-main dark:text-graphon-dark-text-main rounded-xl font-semibold text-lg hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover transition-all duration-300 hover:scale-105 btn-squish"
          >
            Create New Vault
          </button>
        </div>

        {/* Helper Text */}
        <p className="mt-8 text-xs text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 animate-in fade-in duration-700 delay-500">
          💡 Tip: You can create a new empty folder or select an existing one with your notes
        </p>
      </div>
    </div>
  )
}

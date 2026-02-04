/**
 * Gateway - Launchpad entry point for mode selection
 *
 * Two interactive cards:
 * - "Open Local Vault" → Local file-centric mode
 * - "Enter Teamspace" → Cloud collaborative mode (requires auth)
 */

import { motion } from 'framer-motion'
import { FolderOpen, Cloud, ArrowRight, Lock } from 'lucide-react'
import { Hooks, FEATURES } from '../../config/edition'

export type AppMode = 'gateway' | 'local' | 'team'

interface GatewayProps {
  onSelectMode: (mode: AppMode) => void
  onOpenAuthModal: () => void
}

export default function Gateway({ onSelectMode, onOpenAuthModal }: GatewayProps) {
  const { user } = Hooks.useSupabase()

  // Teamspaces feature availability
  const teamspacesEnabled = FEATURES.teamspaces

  const handleLocalClick = () => {
    onSelectMode('local')
  }

  const handleTeamClick = () => {
    if (!teamspacesEnabled) {
      // Disabled - feature not available in this edition
      return
    }
    if (user) {
      onSelectMode('team')
    } else {
      onOpenAuthModal()
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-graphon-text-main dark:text-graphon-dark-text-main mb-3">
            Welcome to Graphon
          </h1>
          <p className="text-graphon-text-secondary dark:text-graphon-dark-text-secondary text-lg">
            Choose your workspace
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Local Vault Card */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLocalClick}
            className="group relative p-8 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-graphon-border/50 dark:border-graphon-dark-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 text-left overflow-hidden"
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Icon */}
            <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
              <FolderOpen className="w-8 h-8 text-white" />
            </div>

            {/* Content */}
            <div className="relative">
              <h2 className="text-2xl font-bold text-graphon-text-main dark:text-graphon-dark-text-main mb-2 flex items-center gap-2">
                Local Vault
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h2>
              <p className="text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-4">
                Your private, file-based workspace. Notes stay on your device with full offline
                access.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium">
                  Offline First
                </span>
                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium">
                  File System
                </span>
                <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">
                  Private
                </span>
              </div>
            </div>
          </motion.button>

          {/* Teamspace Card */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={teamspacesEnabled ? { scale: 1.02, y: -4 } : {}}
            whileTap={teamspacesEnabled ? { scale: 0.98 } : {}}
            onClick={handleTeamClick}
            disabled={!teamspacesEnabled}
            className={`group relative p-8 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-graphon-border/50 dark:border-graphon-dark-border/50 shadow-xl transition-all duration-300 text-left overflow-hidden ${
              teamspacesEnabled
                ? 'hover:shadow-2xl cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Icon */}
            <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/25">
              <Cloud className="w-8 h-8 text-white" />
            </div>

            {/* Content */}
            <div className="relative">
              <h2 className="text-2xl font-bold text-graphon-text-main dark:text-graphon-dark-text-main mb-2 flex items-center gap-2">
                Teamspace
                {(!user || !teamspacesEnabled) && (
                  <Lock className="w-4 h-4 text-graphon-text-secondary" />
                )}
                {teamspacesEnabled && (
                  <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                )}
              </h2>
              <p className="text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-4">
                {teamspacesEnabled
                  ? 'Collaborative cloud workspace. Share notes, chat with your team, and stay synced.'
                  : 'Available in Graphon Business. Upgrade to unlock cloud collaboration features.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-medium">
                  Real-time Sync
                </span>
                <span className="px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-medium">
                  Collaboration
                </span>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-medium">
                  Teams
                </span>
              </div>
            </div>

            {/* Auth Badge / Business Badge */}
            {!teamspacesEnabled ? (
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-medium">
                Business Only
              </div>
            ) : !user ? (
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-graphon-text-secondary/10 text-graphon-text-secondary text-xs font-medium">
                Sign in required
              </div>
            ) : null}
          </motion.button>
        </div>

        {/* Footer Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-graphon-text-secondary/60 dark:text-graphon-dark-text-secondary/60 text-sm mt-8"
        >
          {teamspacesEnabled
            ? 'You can switch between modes anytime from the sidebar'
            : 'Using Graphon Core - Local vault with full offline support'}
        </motion.p>
      </div>
    </div>
  )
}

/**
 * Edition Configuration - Core (OSS) Edition
 *
 * This file contains stub implementations for the OSS edition of Graphon.
 * When proprietary features/team directory is removed, rename this file
 * to edition.ts to build the open-source version.
 *
 * All Team-specific features are disabled and replaced with placeholder components.
 */

import { ReactNode, createContext, useContext } from 'react'

export const EDITION = 'core' as const
export const FEATURES = {
  teamspaces: false,
  cloudSync: false
} as const

// =============================================================================
// STUB PROVIDERS
// =============================================================================

const PassthroughProvider = ({ children }: { children: ReactNode }) => <>{children}</>

// =============================================================================
// STUB COMPONENTS
// =============================================================================

const TeamLayoutStub = () => (
  <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-8">
    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
      <svg
        className="w-8 h-8 text-orange-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    </div>
    <h2 className="text-xl font-bold mb-2 text-graphon-text-main dark:text-graphon-dark-text-main">
      Graphon Business
    </h2>
    <p className="text-center text-graphon-text-secondary dark:text-graphon-dark-text-secondary max-w-md">
      Teamspaces are available in the official Business edition. Visit{' '}
      <a href="https://graphon.app" className="text-blue-500 hover:underline">
        graphon.app
      </a>{' '}
      to upgrade.
    </p>
  </div>
)

const AuthModalStub = () => null
const LocalFilePickerStub = () => null

// =============================================================================
// STUB HOOKS
// =============================================================================

interface SupabaseContextValue {
  user: null
  isLoading: boolean
  isConfigured: boolean
  signIn: () => Promise<{ user: null; error: string }>
  signUp: () => Promise<{ user: null; error: string }>
  signOut: () => Promise<{ error: null }>
}

const SupabaseContext = createContext<SupabaseContextValue>({
  user: null,
  isLoading: false,
  isConfigured: false,
  signIn: async () => ({ user: null, error: 'Teamspaces not available in Core edition' }),
  signUp: async () => ({ user: null, error: 'Teamspaces not available in Core edition' }),
  signOut: async () => ({ error: null })
})

const useSupabaseStub = () => useContext(SupabaseContext)

interface WorkspaceContextValue {
  currentWorkspaceId: null
  currentWorkspace: null
  workspaces: []
  isOnline: boolean
  isLoading: boolean
  switchWorkspace: () => void
  refreshWorkspaces: () => Promise<void>
  createWorkspace: () => Promise<{ data: null; error: string }>
  joinWorkspace: () => Promise<{ data: null; error: string }>
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  currentWorkspaceId: null,
  currentWorkspace: null,
  workspaces: [],
  isOnline: false,
  isLoading: false,
  switchWorkspace: () => {},
  refreshWorkspaces: async () => {},
  createWorkspace: async () => ({ data: null, error: 'Teamspaces not available in Core edition' }),
  joinWorkspace: async () => ({ data: null, error: 'Teamspaces not available in Core edition' })
})

const useWorkspaceStub = () => useContext(WorkspaceContext)

// =============================================================================
// EXPORTS
// =============================================================================

export const Components = {
  AuthProvider: PassthroughProvider,
  WorkspaceProvider: PassthroughProvider,
  TeamLayout: TeamLayoutStub,
  AuthModal: AuthModalStub,
  LocalFilePicker: LocalFilePickerStub
}

export const Hooks = {
  useSupabase: useSupabaseStub,
  useWorkspace: useWorkspaceStub
}

export type Edition = typeof EDITION
export type Features = typeof FEATURES

/**
 * Supabase Database Types for Renderer
 *
 * These types mirror the SupabaseService.ts types for use in React components.
 */

// =============================================================================
// TABLE TYPES
// =============================================================================

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  updated_at: string | null
}

export interface Workspace {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface Channel {
  id: string
  workspace_id: string
  name: string
  type: 'chat' | 'board'
  description: string | null
  created_at: string
}

export interface Message {
  id: string
  channel_id: string
  user_id: string
  content: string | null
  created_at: string
}

export interface Task {
  id: string
  channel_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  created_at: string
}

// =============================================================================
// AUTH TYPES
// =============================================================================

export interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: {
    username?: string
    avatar_url?: string
  }
}

export interface AuthResult {
  user: SupabaseUser | null
  error: string | null
}

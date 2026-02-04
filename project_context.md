1. Project Goals

Graphon is a hybrid "Work OS" combining local-first privacy with real-time team collaboration.

    Core Philosophy: "Notion’s Structure meets Slack’s Communication."

    Dual-Mode Architecture:

        Local Vault (OSS): Private, offline-first knowledge base (Markdown/SQLite).

        Teamspaces (Proprietary): Cloud-based collaboration (Supabase/PostgreSQL) with Chat & Kanban.

    The Gateway: Unified launchpad routing users to Local or Team environments.

2. Architecture

    Stack: Electron, React, TypeScript, Vite, Tailwind CSS.

    Data Strategy:

        Local: better-sqlite3 (Main Process) for offline vaults.

        Cloud: SupabaseService (Main Process) accessed via IPC Bridge.

    Open Core Pattern:

        Abstraction: edition.ts dynamically swaps between "Business" and "Core" implementations.

        Sanitization: src/features/team and supabase/ folders are automatically stripped during public sync.

3. Operational Rules (Coding Standards)

    Strict Typing: No any. All props and IPC payloads must be typed. Define shared interfaces in src/renderer/src/types/.

    Component Structure:

        Logic Separation: Business logic resides in custom hooks (e.g., useSupabase), not inside UI components.

        Feature Isolation: CRITICAL. All proprietary code (Teamspaces, Auth, Cloud) MUST be placed in src/renderer/src/features/team. Never mix team logic into generic components.

    Styling: Use Tailwind CSS utility classes. Avoid inline style={{...}} and separate .css files unless absolutely necessary for global themes.

    IPC Safety: Renderer never accesses Node.js APIs directly. All Backend communication goes through window.api (exposed in preload/index.ts).

4. File Structure Map

/src
  /main                  # Electron Main Process (Backend)
    /services            # Business Logic (SupabaseService.ts, IndexerService.ts)
    /database            # Local SQLite Logic (db.ts, schema.ts)
  /renderer/src          # React Frontend
    /components          # Shared UI Atoms (Button, Input, Modal)
      /gateway           # Entry point components
      /layout            # App shells (MainLayout)
    /config              # Configuration (edition.ts - The Switch)
    /features            # Feature Slices
      /team              # [PROPRIETARY] All Teamspace code (AuthModal, TeamLayout)
    /hooks               # Shared Hooks (useHistory, useVault)
    /types               # Global Type Definitions
/supabase
  /migrations            # SQL Schemas (001_teamspaces_schema.sql)
/.github/workflows       # CI/CD (sync-to-public.yml)

5. Active Context

    Current Status: Phase 6.5 Completed.

        Infrastructure Wired: SupabaseService (Backend) and SupabaseContext (Frontend) are fully implemented and connected.

        User Flow: Users can successfully Sign Up, Login, and Create Workspaces via the UI, which is backed by the real database.

    Immediate Next Steps: Phase 7: Real-time Communication.

        Objective: Build the "Chat" experience inside the Teamspace.

        Task: Implement getChannels, getMessages, and sendMessage in SupabaseService and connect them to a new ChatView component in the frontend.
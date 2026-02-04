# System Patterns: Graphon

## Architecture Overview
Graphon is built on Electron with a clear separation between the Main (Backend) and Renderer (Frontend) processes.

### Dual-Mode Data Strategy
- **Local Vault**: Uses `better-sqlite3` in the Main process. Data is stored as Markdown files and indexed in SQLite.
- **Teamspaces**: Uses `SupabaseService` in the Main process, accessed via an IPC bridge.

### Open Core Pattern
- **Abstraction Layer**: [`src/renderer/src/config/edition.tsx`](src/renderer/src/config/edition.tsx) acts as a switch to swap between "Business" (Team) and "Core" (Local) implementations.
- **Feature Isolation**: Proprietary code is strictly isolated in [`src/renderer/src/features/team`](src/renderer/src/features/team).

## Technical Patterns
- **IPC Bridge**: All communication between Renderer and Main process goes through `window.api` defined in [`src/preload/index.ts`](src/preload/index.ts).
- **Logic Separation**: Business logic is kept in custom hooks or Main process services, keeping UI components focused on rendering.
- **Strict Typing**: TypeScript is used throughout with a "no any" policy. Shared interfaces are in [`src/renderer/src/types/`](src/renderer/src/types/).

## Component Structure
- **Gateway**: The entry point for selecting environments.
- **Layout**: Standardized shells like `MainLayout` and `TeamLayout`.
- **Features**: Sliced by functionality (e.g., `graph-view`, `database`, `team`).

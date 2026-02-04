# Tech Context: Graphon

## Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS v4
- **State/Logic**: React Hooks, Context API
- **Editor**: Tiptap v2 (Rich Text)
- **Visualization**: Pixi.js & D3-force (Graph View)
- **Animations**: Framer Motion

## Backend (Electron Main Process)
- **Runtime**: Node.js (via Electron)
- **Database**: SQLite (`better-sqlite3`) with Drizzle ORM
- **Cloud**: Supabase (PostgreSQL, Auth, Real-time)
- **Search**: SQLite FTS5
- **AI/Embeddings**: `@xenova/transformers` (Local embeddings)

## Development Tools
- **Build Tool**: Electron Vite
- **Language**: TypeScript
- **Linting/Formatting**: ESLint, Prettier
- **Testing**: Vitest, React Testing Library

## Deployment/Distribution
- **Bundler**: Electron Builder
- **Updates**: GitHub Releases (Auto-update)

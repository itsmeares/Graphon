import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const DB_PATH = join(app.getPath('userData'), 'graphon.db')

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    checksum TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS links (
    source_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER
  );
  
  CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
  CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
  CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
  CREATE INDEX IF NOT EXISTS idx_todos_file ON todos(file_id);
  CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);

  CREATE TABLE IF NOT EXISTS note_embeddings (
    file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
    vector TEXT NOT NULL,
    updated_at INTEGER
  );
  
  CREATE INDEX IF NOT EXISTS idx_note_embeddings_file ON note_embeddings(file_id);
`)

// FTS5 table migration: check if old schema (without 'id' column) exists and recreate
try {
  const ftsInfo = sqlite.prepare('PRAGMA table_info(notes_fts)').all() as Array<{ name: string }>
  const hasIdColumn = ftsInfo.some((col) => col.name === 'id')

  if (ftsInfo.length > 0 && !hasIdColumn) {
    // Old schema detected, drop and recreate
    console.log('[DB] Migrating notes_fts table to new schema with id column')
    sqlite.exec('DROP TABLE IF EXISTS notes_fts')
  }
} catch {
  // Table doesn't exist, will be created below
}

sqlite.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id UNINDEXED,
    path,
    title,
    content
  );
`)

export const db = drizzle(sqlite, { schema })
export { sqlite }

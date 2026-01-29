import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const DB_PATH = join(app.getPath('userData'), 'graphon.db')

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')

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
    source_id TEXT NOT NULL REFERENCES files(id),
    target_id TEXT NOT NULL REFERENCES files(id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
  CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
  CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
  
  CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    title,
    content,
    path,
    content='files',
    content_rowid='rowid'
  );
`)

export const db = drizzle(sqlite, { schema })
export { sqlite }

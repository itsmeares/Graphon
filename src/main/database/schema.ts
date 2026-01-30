import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  path: text('path').notNull().unique(),
  checksum: text('checksum'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

export const links = sqliteTable('links', {
  sourceId: text('source_id')
    .notNull()
    .references(() => files.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull()
})

export const todos = sqliteTable('todos', {
  id: text('id').primaryKey(),
  fileId: text('file_id')
    .notNull()
    .references(() => files.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

// FTS5 virtual table type definition (managed via raw SQL, not Drizzle)
export interface NotesFts {
  title: string
  content: string
  path: string
}

export const note_embeddings = sqliteTable('note_embeddings', {
  fileId: text('file_id')
    .primaryKey()
    .references(() => files.id, { onDelete: 'cascade' }),
  vector: text('vector', { mode: 'json' }).$type<number[]>().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

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
    .references(() => files.id),
  targetId: text('target_id')
    .notNull()
    .references(() => files.id)
})

// FTS5 virtual table type definition (managed via raw SQL, not Drizzle)
export interface NotesFts {
  title: string
  content: string
  path: string
}

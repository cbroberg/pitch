import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

const now = () => Math.floor(Date.now() / 1000);

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  hashedPassword: text('hashed_password').notNull(),
  role: text('role').notNull().default('super_admin'),
  apiKey: text('api_key'),
  createdAt: integer('created_at').notNull().$defaultFn(now),
  updatedAt: integer('updated_at').notNull().$defaultFn(now),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull().$defaultFn(now),
});

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  parentId: text('parent_id'),
  createdAt: integer('created_at').notNull().$defaultFn(now),
  updatedAt: integer('updated_at').notNull().$defaultFn(now),
});

export const pitches = sqliteTable('pitches', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  folderId: text('folder_id').references(() => folders.id, {
    onDelete: 'set null',
  }),
  fileType: text('file_type'), // 'html' | 'pdf' | 'image' | 'other'
  entryFile: text('entry_file'), // e.g. 'index.html'
  isPublished: integer('is_published', { mode: 'boolean' })
    .notNull()
    .default(false),
  totalViews: integer('total_views').notNull().default(0),
  uniqueViews: integer('unique_views').notNull().default(0),
  createdAt: integer('created_at').notNull().$defaultFn(now),
  updatedAt: integer('updated_at').notNull().$defaultFn(now),
});

export const accessTokens = sqliteTable('access_tokens', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  pitchId: text('pitch_id')
    .notNull()
    .references(() => pitches.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  type: text('type').notNull().default('anonymous'), // 'anonymous' | 'personal'
  email: text('email'),
  label: text('label'),
  expiresAt: integer('expires_at'), // null = never
  maxUses: integer('max_uses'), // null = unlimited
  useCount: integer('use_count').notNull().default(0),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull().$defaultFn(now),
});

export const viewEvents = sqliteTable('view_events', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  pitchId: text('pitch_id')
    .notNull()
    .references(() => pitches.id, { onDelete: 'cascade' }),
  tokenId: text('token_id').references(() => accessTokens.id, {
    onDelete: 'set null',
  }),
  email: text('email'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  duration: integer('duration'), // seconds
  createdAt: integer('created_at').notNull().$defaultFn(now),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type Pitch = typeof pitches.$inferSelect;
export type NewPitch = typeof pitches.$inferInsert;
export type AccessToken = typeof accessTokens.$inferSelect;
export type ViewEvent = typeof viewEvents.$inferSelect;

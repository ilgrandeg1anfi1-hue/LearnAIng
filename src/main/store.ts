// SQLite storage (main process only). The renderer reaches it exclusively through the IPC handlers in index.ts.
import { DatabaseSync } from 'node:sqlite'

export type Chat = { id: number; title: string; created_at: number; updated_at: number }
export type Role = 'user' | 'assistant'
export type Message = { id: number; chat_id: number; role: Role; content: string; created_at: number }

/** Append-only: never edit a shipped migration, add a new one. Index + 1 = PRAGMA user_version. */
export const migrations = [
  `CREATE TABLE chats (
     id INTEGER PRIMARY KEY,
     title TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE messages (
     id INTEGER PRIMARY KEY,
     chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
     content TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX messages_by_chat ON messages(chat_id, id);
   CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`
]

/** Applies pending migrations, each in its own transaction together with the version bump. */
export function migrate(db: DatabaseSync, steps: string[] = migrations): void {
  const version = Number(db.prepare('PRAGMA user_version').get()?.user_version)
  // An older app must not touch a database written by a newer one.
  if (version > steps.length) throw new Error(`Database version ${version} is newer than this app (${steps.length})`)
  for (let v = version; v < steps.length; v++) {
    db.exec('BEGIN')
    try {
      db.exec(steps[v])
      db.exec(`PRAGMA user_version = ${v + 1}`)
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
}

export function openDb(file: string): DatabaseSync {
  const db = new DatabaseSync(file) // foreign keys are on by default in node:sqlite
  try {
    migrate(db)
  } catch (e) {
    db.close()
    throw e
  }
  return db
}

export function listChats(db: DatabaseSync): Chat[] {
  return db.prepare('SELECT * FROM chats ORDER BY updated_at DESC, id DESC').all() as Chat[]
}

export function createChat(db: DatabaseSync, title: string): Chat {
  const now = Date.now()
  return db.prepare('INSERT INTO chats (title, created_at, updated_at) VALUES (?, ?, ?) RETURNING *').get(title, now, now) as Chat
}

export function renameChat(db: DatabaseSync, id: number, title: string): void {
  db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(title, id)
}

/** Messages go with the chat (ON DELETE CASCADE). */
export function deleteChat(db: DatabaseSync, id: number): void {
  db.prepare('DELETE FROM chats WHERE id = ?').run(id)
}

export function listMessages(db: DatabaseSync, chatId: number): Message[] {
  return db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id').all(chatId) as Message[]
}

/** Throws if the chat does not exist (foreign key). Bumps the chat to the top of the list. */
export function addMessage(db: DatabaseSync, chatId: number, role: Role, content: string): Message {
  const now = Date.now()
  db.exec('BEGIN')
  try {
    const message = db
      .prepare('INSERT INTO messages (chat_id, role, content, created_at) VALUES (?, ?, ?, ?) RETURNING *')
      .get(chatId, role, content, now) as Message
    db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(now, chatId)
    db.exec('COMMIT')
    return message
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function getSettings(db: DatabaseSync): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function setSetting(db: DatabaseSync, key: string, value: string): void {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

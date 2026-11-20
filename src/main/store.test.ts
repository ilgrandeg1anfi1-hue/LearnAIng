import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addMessage,
  createChat,
  deleteChat,
  getSettings,
  listChats,
  listMessages,
  migrate,
  migrations,
  openDb,
  renameChat,
  setSetting
} from './store'

const version = (db: DatabaseSync) => Number(db.prepare('PRAGMA user_version').get()?.user_version)
const tables = (db: DatabaseSync) =>
  (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]).map((r) => r.name)

describe('migrations', () => {
  it('bring a new database to the latest version', () => {
    const db = new DatabaseSync(':memory:')
    migrate(db)
    expect(version(db)).toBe(migrations.length)
    expect(tables(db)).toEqual(['chats', 'messages', 'settings'])
  })

  it('are idempotent and keep data', () => {
    const db = new DatabaseSync(':memory:')
    migrate(db)
    createChat(db, 'kept')
    migrate(db)
    expect(listChats(db).map((c) => c.title)).toEqual(['kept'])
  })

  it('roll back a failing step together with its version bump', () => {
    const db = new DatabaseSync(':memory:')
    expect(() => migrate(db, ['CREATE TABLE a (x)', 'CREATE TABLE b (x); NOT SQL'])).toThrow()
    expect(version(db)).toBe(1)
    expect(tables(db)).toEqual(['a'])
  })

  it('refuse a database written by a newer app', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(`PRAGMA user_version = ${migrations.length + 1}`)
    expect(() => migrate(db)).toThrow(/newer/)
  })
})

describe('openDb', () => {
  let dir: string
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), 'learnaing-'))))
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('persists chats and messages across reopen', () => {
    const file = join(dir, 'test.db')
    const first = openDb(file)
    const chat = createChat(first, 'persisted')
    addMessage(first, chat.id, 'user', 'hello')
    first.close()

    const second = openDb(file)
    expect(listChats(second).map((c) => c.title)).toEqual(['persisted'])
    expect(listMessages(second, chat.id).map((m) => m.content)).toEqual(['hello'])
    second.close()
  })
})

describe('repository', () => {
  let db: DatabaseSync
  beforeEach(() => {
    db = new DatabaseSync(':memory:')
    migrate(db)
  })
  afterEach(() => vi.useRealTimers())

  it('creates, renames and lists chats, most recent first', () => {
    const a = createChat(db, 'a')
    const b = createChat(db, 'b')
    expect(a).toMatchObject({ id: expect.any(Number), title: 'a' })
    renameChat(db, a.id, 'a2')
    expect(listChats(db).map((c) => c.title)).toEqual(['b', 'a2'])
    expect(b.created_at).toBe(b.updated_at)
  })

  it('adds messages in order and moves the chat to the top', () => {
    vi.useFakeTimers({ now: 1000, toFake: ['Date'] })
    const a = createChat(db, 'a')
    createChat(db, 'b')
    vi.setSystemTime(2000)
    addMessage(db, a.id, 'user', 'q')
    addMessage(db, a.id, 'assistant', 'r')
    expect(listMessages(db, a.id).map((m) => [m.role, m.content])).toEqual([
      ['user', 'q'],
      ['assistant', 'r']
    ])
    expect(listChats(db)[0]).toMatchObject({ id: a.id, updated_at: 2000 })
  })

  it('rejects messages for a missing chat or with an unknown role', () => {
    expect(() => addMessage(db, 999, 'user', 'x')).toThrow()
    const a = createChat(db, 'a')
    expect(() => addMessage(db, a.id, 'system' as 'user', 'x')).toThrow()
    expect(listMessages(db, a.id)).toEqual([])
  })

  it('deletes a chat with its messages only', () => {
    const a = createChat(db, 'a')
    const b = createChat(db, 'b')
    addMessage(db, a.id, 'user', 'gone')
    addMessage(db, b.id, 'user', 'stays')
    deleteChat(db, a.id)
    expect(listChats(db).map((c) => c.id)).toEqual([b.id])
    expect(db.prepare('SELECT count(*) AS n FROM messages').get()?.n).toBe(1)
  })

  it('stores settings as upserts', () => {
    expect(getSettings(db)).toEqual({})
    setSetting(db, 'theme', 'dark')
    setSetting(db, 'theme', 'light')
    setSetting(db, 'language', 'en')
    expect(getSettings(db)).toEqual({ theme: 'light', language: 'en' })
  })
})

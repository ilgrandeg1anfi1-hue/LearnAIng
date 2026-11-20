// Checks node:sqlite (+ FTS5) inside Electron's bundled Node, via ELECTRON_RUN_AS_NODE.
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import electron from 'electron'

const code = `
const { DatabaseSync } = require('node:sqlite')
const db = new DatabaseSync(':memory:')
db.exec("CREATE VIRTUAL TABLE t USING fts5(x); INSERT INTO t VALUES ('ciao mondo')")
const hits = db.prepare("SELECT count(*) AS n FROM t WHERE t MATCH 'mondo'").get().n
console.log(JSON.stringify({
  electron: process.versions.electron,
  node: process.versions.node,
  sqlite: db.prepare('SELECT sqlite_version() AS v').get().v,
  fts5: hits === 1
}))`

const r = spawnSync(electron, ['-e', code], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8' })
process.stdout.write(r.stdout ?? '')
process.stderr.write(r.stderr ?? '')
process.exit(r.status ?? 1)

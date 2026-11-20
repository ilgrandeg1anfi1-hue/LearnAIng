import { expect, test } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import en from '../src/shared/locales/en.json'

const electronPath = createRequire(__filename)('electron') as string

// Spawned directly: the app stops at a modal error box, which Playwright's launcher would wait on forever.
test('a portable data folder that cannot be created is reported, not a crash', async () => {
  const exeDir = test.info().outputPath('portable')
  mkdirSync(exeDir, { recursive: true })
  // A file where the folder should go fails like a read-only location (Program Files, read-only share).
  writeFileSync(join(exeDir, 'LearnAIng-data'), '')
  const child = spawn(electronPath, ['.', '--lang=en-US'], { env: { ...process.env, PORTABLE_EXECUTABLE_DIR: exeDir } })
  let output = ''
  child.stdout.on('data', (d) => (output += d))
  child.stderr.on('data', (d) => (output += d))
  try {
    await expect.poll(() => output, { timeout: 20_000 }).toContain(en['db.openError'].split('{')[0])
    expect(output).toContain('EEXIST')
    expect(output).not.toMatch(/threw an error|Uncaught Exception/)
    expect(readdirSync(exeDir)).toEqual(['LearnAIng-data'])
  } finally {
    child.kill()
  }
})

import { chromium, expect, test, type Page } from '@playwright/test'
import { execFileSync, spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import it from '../src/shared/locales/it.json'
import pkg from '../package.json'

// The real portable exe (NSIS launcher → extracts to %TEMP% → starts Electron). Run in CI only:
// locally Smart App Control blocks unsigned exes. Usage: PORTABLE_EXE=dist\x-portable.exe npx playwright test portable
const portableExe = process.env.PORTABLE_EXE
test.skip(!portableExe, 'PORTABLE_EXE not set')

const PORT = 9339
const powershell = (command: string) => execFileSync('powershell', ['-NoProfile', '-Command', command], { encoding: 'utf8' })
const real = (path: string) => realpathSync.native(path).toLowerCase() // TEMP may be an 8.3 short path

/** Executables of all running LearnAIng.exe processes (main, renderer, GPU...). */
const appProcesses = () =>
  powershell(`Get-CimInstance Win32_Process -Filter "Name='LearnAIng.exe'" | ForEach-Object ExecutablePath`)
    .split(/\r?\n/)
    .filter(Boolean)

const errors: string[] = []

// Playwright's _electron.launch needs --inspect, which the exe's fuses disable: drive the window over CDP instead.
async function launch(exe: string, logFile: string) {
  const launcher = spawn(exe, [`--remote-debugging-port=${PORT}`, '--lang=it-IT', '--enable-logging=file', `--log-file=${logFile}`])
  const exited = new Promise<number | null>((resolve) => launcher.on('exit', resolve))
  const cdpUp = () => fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.ok, () => false)
  await expect.poll(cdpUp, { timeout: 90_000 }).toBe(true)
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
  const context = browser.contexts()[0]
  const win: Page = context.pages()[0] ?? (await context.waitForEvent('page'))
  win.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  win.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  win.on('crash', () => errors.push('renderer crashed'))
  expect(launcher.exitCode, 'launcher must wait for the app').toBeNull()

  // Closing the window quits the app; the launcher returns the app's exit code and deletes its extraction dir.
  const close = async () => {
    await win.evaluate(() => void setTimeout(() => window.close()))
    const code = await exited
    await browser.close().catch(() => {})
    return code
  }
  return { win, close }
}

test('the real portable exe extracts to %TEMP%, keeps its data next to itself and survives a restart', async () => {
  test.setTimeout(300_000)
  const started = new Date()
  // Spaces and accents: typical of user folders (Downloads, Desktop...).
  const exeDir = test.info().outputPath('portable àè')
  mkdirSync(exeDir, { recursive: true })
  const exe = join(exeDir, basename(portableExe!))
  copyFileSync(portableExe!, exe)
  const dataDir = join(exeDir, 'LearnAIng-data')
  const dbFile = join(dataDir, 'learnaing.db')
  const appData = join(process.env.APPDATA!, 'LearnAIng')
  // One log per run: Chromium truncates the log file at each start.
  const logs = [test.info().outputPath('chromium-1.log'), test.info().outputPath('chromium-2.log')]
  const question = 'Che cos’è la fotosintesi?'
  expect(existsSync(appData), 'precondition: no installed-app profile').toBe(false)
  expect(appProcesses(), 'precondition: app not running').toEqual([])

  // First run: launcher, extraction, Electron, database, a new chat.
  let { win, close } = await launch(exe, logs[0])
  const processes = appProcesses()
  expect(processes.length).toBeGreaterThan(0)
  for (const p of processes) expect(real(p).startsWith(real(tmpdir()) + '\\'), p).toBe(true)
  const unpacked = dirname(processes[0])
  expect(existsSync(join(unpacked, 'resources', 'app.asar'))).toBe(true)

  await expect(win).toHaveTitle('LearnAIng')
  await expect(win.locator('.version')).toHaveText(`v${pkg.version}`)
  const box = win.getByRole('textbox', { name: it['composer.label'] })
  await box.fill(question)
  await box.press('Enter')
  await expect(win.getByRole('region', { name: it['chat.messages'] }).getByRole('article')).toHaveCount(2)
  expect(existsSync(dbFile)).toBe(true)
  expect(await close()).toBe(0)

  expect(existsSync(unpacked), 'extraction dir removed on exit').toBe(false)
  expect(readdirSync(exeDir).sort()).toEqual([basename(exe), 'LearnAIng-data'].sort())
  expect(existsSync(appData), 'nothing written to %APPDATA%').toBe(false)
  const db = new DatabaseSync(dbFile, { readOnly: true })
  expect(db.prepare('SELECT title FROM chats').all()).toEqual([{ title: question }])
  expect(db.prepare('SELECT count(*) AS n FROM messages').get()).toEqual({ n: 2 })
  db.close()

  // Second run: the chat is still there and can be opened.
  ;({ win, close } = await launch(exe, logs[1]))
  const chat = win.getByRole('navigation', { name: it['chat.history'] }).getByRole('button', { name: question })
  await expect(chat).toBeVisible()
  await chat.click()
  await expect(win.getByRole('article')).toHaveCount(2)
  expect(await close()).toBe(0)

  // No errors or crashes: page events, Chromium's log (covers load time, before CDP attached), Windows Error Reporting.
  expect(errors).toEqual([])
  for (const file of logs) {
    const log = readFileSync(file, 'utf8')
    await test.info().attach(basename(file), { body: log, contentType: 'text/plain' })
    // The renderer never logs: any CONSOLE line is an error, warning or CSP violation.
    expect(log.split('\n').filter((l) => /:CONSOLE|:FATAL:|exited unexpectedly|process crashed/.test(l))).toEqual([])
  }
  // "exit 0": Get-WinEvent reports "no events found" as an error.
  const crashes = powershell(
    `Get-WinEvent -FilterHashtable @{LogName='Application'; Id=1000,1001; StartTime=[datetime]'${started.toISOString()}'} -ErrorAction SilentlyContinue | Where-Object Message -match 'LearnAIng' | ForEach-Object Message; exit 0`
  )
  expect(crashes.trim()).toBe('')
})

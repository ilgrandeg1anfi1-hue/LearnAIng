import { chromium, expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import it from '../src/shared/locales/it.json'
import pkg from '../package.json'

// The Store package (MSIX) installed for real: Add-AppxPackage → start with package identity → uninstall.
// CI only (.github/workflows/msix.yml): the package must be signed with a certificate the machine trusts.
// Usage: STORE_PACKAGE=path\to\signed.appx npx playwright test store
const storePackage = process.env.STORE_PACKAGE
test.skip(!storePackage, 'STORE_PACKAGE not set')

// Partner Center identity, as in signing/store.yml.
const NAME = 'ginafi.LearnAIng'
const PUBLISHER = 'CN=BB687092-540B-4E7F-80F7-703E81CC06CA'
const PORT = 9339

// Encoded: the scripts below carry quotes and a here-string. No progress records: they end up in error messages.
const powershell = (command: string) =>
  execFileSync(
    'powershell',
    ['-NoProfile', '-EncodedCommand', Buffer.from(`$ProgressPreference = 'SilentlyContinue'\n${command}`, 'utf16le').toString('base64')],
    { encoding: 'utf8' }
  )

type AppxPackage = { Name: string; Publisher: string; Version: string; PackageFamilyName: string; PackageFullName: string; InstallLocation: string }
const installed = (): AppxPackage | undefined => {
  const json = powershell(
    `Get-AppxPackage -Name ${NAME} | Select-Object Name, Publisher, Version, PackageFamilyName, PackageFullName, InstallLocation | ConvertTo-Json`
  )
  return json.trim() ? JSON.parse(json) : undefined
}

/** Executables of all running LearnAIng.exe processes (main, renderer, GPU...). */
const appProcesses = () =>
  powershell(`Get-CimInstance Win32_Process -Filter "Name='LearnAIng.exe'" | ForEach-Object ExecutablePath`)
    .split(/\r?\n/)
    .filter(Boolean)

// Starts the app like the Start menu does (with package identity) and, unlike shell:AppsFolder, passes arguments.
const activate = (aumid: string, args: string) =>
  powershell(`Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
[ComImport, Guid("2e941141-7f97-4756-ba1d-9decde894a3d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IApplicationActivationManager {
  void ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string id, [MarshalAs(UnmanagedType.LPWStr)] string args, int options, out uint pid);
}
[ComImport, Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")]
public class ApplicationActivationManager {}
public static class AppActivation {
  // The C# cast does the COM QueryInterface; a PowerShell cast does not.
  public static uint Start(string id, string args) {
    uint pid;
    ((IApplicationActivationManager)new ApplicationActivationManager()).ActivateApplication(id, args, 0, out pid);
    return pid;
  }
}
'@
[AppActivation]::Start('${aumid}', '${args}')`)

const errors: string[] = []

// The fuses disable --inspect, needed by _electron.launch: drive the window over CDP instead.
async function launch(aumid: string, logFile: string) {
  activate(aumid, `--remote-debugging-port=${PORT} --lang=it-IT --enable-logging=file --log-file="${logFile}"`)
  const cdpUp = () => fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.ok, () => false)
  await expect.poll(cdpUp, { timeout: 90_000 }).toBe(true)
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
  const context = browser.contexts()[0]
  const win: Page = context.pages()[0] ?? (await context.waitForEvent('page'))
  win.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  win.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  win.on('crash', () => errors.push('renderer crashed'))

  // Closing the window quits the app.
  const close = async () => {
    await win.evaluate(() => void setTimeout(() => window.close()))
    await expect.poll(appProcesses, { timeout: 30_000 }).toEqual([])
    await browser.close().catch(() => {})
  }
  return { win, close }
}

test('the Store package installs, runs with package identity, keeps its data across restarts and uninstalls', async () => {
  test.setTimeout(300_000)
  const started = new Date()
  const appData = join(process.env.APPDATA!, 'LearnAIng')
  // One log per run: Chromium truncates the log file at each start.
  const logs = [test.info().outputPath('chromium-1.log'), test.info().outputPath('chromium-2.log')]
  const question = 'Che cos’è la fotosintesi?'
  expect(installed(), 'precondition: not installed').toBeUndefined()
  expect(existsSync(appData), 'precondition: no unpackaged profile').toBe(false)
  expect(appProcesses(), 'precondition: app not running').toEqual([])

  powershell(`Add-AppxPackage -Path '${storePackage}'`)
  const appx = installed()!
  expect(appx).toMatchObject({ Name: NAME, Publisher: PUBLISHER, Version: `${pkg.version}.0` })
  const aumid = `${appx.PackageFamilyName}!LearnAIng`
  // The packaged app's writes to %APPDATA% land in the package's private storage.
  const packageData = join(process.env.LOCALAPPDATA!, 'Packages', appx.PackageFamilyName)
  const dbFile = join(packageData, 'LocalCache', 'Roaming', 'LearnAIng', 'learnaing.db')

  // First run: activation, database, a new chat.
  let { win, close } = await launch(aumid, logs[0])
  const processes = appProcesses()
  expect(processes.length).toBeGreaterThan(0)
  for (const p of processes) expect(p.toLowerCase().startsWith(appx.InstallLocation.toLowerCase() + '\\'), p).toBe(true)
  await expect(win).toHaveTitle('LearnAIng')
  await expect(win.locator('.version')).toHaveText(`v${pkg.version}`)
  const box = win.getByRole('textbox', { name: it['composer.label'] })
  await box.fill(question)
  await box.press('Enter')
  await expect(win.getByRole('region', { name: it['chat.messages'] }).getByRole('article')).toHaveCount(2)
  await close()

  expect(existsSync(dbFile), 'database in the package storage').toBe(true)
  expect(existsSync(appData), 'nothing in the real %APPDATA%').toBe(false)
  const db = new DatabaseSync(dbFile, { readOnly: true })
  expect(db.prepare('SELECT title FROM chats').all()).toEqual([{ title: question }])
  expect(db.prepare('SELECT count(*) AS n FROM messages').get()).toEqual({ n: 2 })
  db.close()

  // Second run: the chat is still there and can be opened.
  ;({ win, close } = await launch(aumid, logs[1]))
  const chat = win.getByRole('navigation', { name: it['chat.history'] }).getByRole('button', { name: question })
  await expect(chat).toBeVisible()
  await chat.click()
  await expect(win.getByRole('article')).toHaveCount(2)
  await close()

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

  // Uninstall removes the app and its private storage, database included.
  powershell(`Remove-AppxPackage -Package '${appx.PackageFullName}'`)
  expect(installed()).toBeUndefined()
  expect(existsSync(packageData), 'package storage removed on uninstall').toBe(false)
})

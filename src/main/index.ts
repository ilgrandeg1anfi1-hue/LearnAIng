import { app, BrowserWindow, dialog, ipcMain, nativeTheme, session, shell } from 'electron'
import { mkdirSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { translate, type Key } from '../shared/i18n'
import { echo } from './echo'
import { isExternalUrl, isId, isSetting, isText, isTrustedSender, type Settings } from './security'
import {
  addMessage,
  createChat,
  deleteChat,
  getSettings,
  listChats,
  listMessages,
  openDb,
  renameChat,
  setSetting
} from './store'

const TITLE_MAX = 200
const MESSAGE_MAX = 100_000

// ELECTRON_RENDERER_URL is set by electron-vite in dev only; never trust it in a packaged build.
const devUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined
const rendererUrl = devUrl ?? pathToFileURL(join(__dirname, '../renderer/index.html')).href

// Portable exe: all data next to it. Unpackaged runs (dev, E2E) may use a scratch dir.
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
const dataDir = portableDir ? join(portableDir, 'LearnAIng-data') : !app.isPackaged ? process.env.LEARNAING_DATA_DIR : undefined
let dataDirError: unknown // e.g. portable exe in a read-only folder; reported once ready (dialog + locale)
if (dataDir) {
  try {
    mkdirSync(dataDir, { recursive: true })
    app.setPath('userData', dataDir)
  } catch (e) {
    dataDirError = e
  }
}

let db: DatabaseSync

/** Stored settings that are still valid, over defaults (UI language follows the OS until chosen). */
function settings(): Required<Settings> {
  const stored = Object.entries(getSettings(db)).filter(([key, value]) => isSetting(key, value))
  return { theme: 'system', language: app.getLocale().startsWith('it') ? 'it' : 'en', ...Object.fromEntries(stored) }
}

const t = (key: Key, vars?: Record<string, string>) => translate(settings().language, key, vars)

/** Every IPC handler goes through here: sender must be our top-level page, args must validate. */
function handle(channel: string, valid: (args: unknown[]) => boolean, fn: (...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, (event, ...args) => {
    const frame = event.senderFrame
    if (!frame || frame !== event.sender.mainFrame || !isTrustedSender(frame.url, rendererUrl)) {
      throw new Error(`IPC ${channel}: untrusted sender`)
    }
    if (!valid(args)) throw new Error(`IPC ${channel}: invalid arguments`)
    return fn(...args)
  })
}

async function confirmOpenExternal(url: string): Promise<void> {
  if (!isExternalUrl(url)) return
  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: [t('common.cancel'), t('link.open')],
    defaultId: 0,
    cancelId: 0,
    message: t('link.confirm'),
    detail: url
  })
  if (response === 1) await shell.openExternal(url)
}

// Applies to every webContents, including any created later.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (e) => e.preventDefault())
  contents.on('will-attach-webview', (e) => e.preventDefault())
  contents.setWindowOpenHandler(({ url }) => {
    void confirmOpenExternal(url)
    return { action: 'deny' }
  })
})

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })
  void win.loadURL(rendererUrl)
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  const file = join(dataDir ?? app.getPath('userData'), 'learnaing.db')
  try {
    if (dataDirError) throw dataDirError
    db = openDb(file)
  } catch (e) {
    // Never fall back to a fresh database elsewhere: the user's data must stay where they expect it.
    const lang = app.getLocale().startsWith('it') ? 'it' : 'en'
    const message = translate(lang, 'db.openError', { path: file, message: String(e) })
    console.error(message)
    dialog.showErrorBox('LearnAIng', message)
    app.exit(1)
    return
  }
  nativeTheme.themeSource = settings().theme

  handle('app:version', (a) => a.length === 0, () => app.getVersion())
  handle('chats:list', (a) => a.length === 0, () => listChats(db))
  handle('chats:create', (a) => a.length === 1 && isText(a[0], TITLE_MAX), (title) => createChat(db, title as string))
  handle(
    'chats:rename',
    (a) => a.length === 2 && isId(a[0]) && isText(a[1], TITLE_MAX),
    (id, title) => renameChat(db, id as number, title as string)
  )
  handle('chats:delete', (a) => a.length === 1 && isId(a[0]), (id) => deleteChat(db, id as number))
  handle('messages:list', (a) => a.length === 1 && isId(a[0]), (chatId) => listMessages(db, chatId as number))
  handle(
    'messages:send',
    (a) => a.length === 2 && isId(a[0]) && isText(a[1], MESSAGE_MAX),
    async (chatId, content) => {
      const user = addMessage(db, chatId as number, 'user', content as string)
      let reply = ''
      for await (const chunk of echo(listMessages(db, chatId as number))) reply += chunk
      return [user, addMessage(db, chatId as number, 'assistant', reply)]
    }
  )
  handle('settings:get', (a) => a.length === 0, settings)
  handle(
    'settings:set',
    (a) => a.length === 2 && isSetting(a[0], a[1]),
    (key, value) => {
      setSetting(db, key as string, value as string)
      nativeTheme.themeSource = settings().theme
    }
  )

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

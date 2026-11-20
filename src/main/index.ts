import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isExternalUrl, isTrustedSender } from './security'

// ELECTRON_RENDERER_URL is set by electron-vite in dev only; never trust it in a packaged build.
const devUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined
const rendererUrl = devUrl ?? pathToFileURL(join(__dirname, '../renderer/index.html')).href

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
    buttons: ['Annulla', 'Apri nel browser'],
    defaultId: 0,
    cancelId: 0,
    message: 'Aprire questo link nel browser di sistema?',
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

  handle('app:version', (args) => args.length === 0, () => app.getVersion())

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

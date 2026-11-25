import { BrowserWindow, app, dialog, ipcMain, nativeTheme, net, protocol, shell } from 'electron'
import { mkdir } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { modelFit } from '@shared/compat'
import { IPC } from '@shared/ipc'
import { modelBaseName, stripNamExtension } from '@shared/names'
import type {
  AppState,
  AuthRequest,
  ConversionRecord,
  LocalNam,
  LocalOutcome,
  Model,
  Settings,
  Tone,
  ToneListKind,
  ToneRef,
  ViewBounds,
} from '@shared/types'
import { APP_NAME, BUILD_CLIENT_ID, MOCK } from './config'
import { convertNam } from './convert'
import { sendToDevice } from './device'
import { AppError, toResult } from './errors'
import { findConversion, listConversions, removeConversion, saveConversion } from './library'
import { abandonAuth, beginAuth, cancelAuth, focusAuth, openExternally, setAuthBounds } from './oauth'
import { currentUser, isConnected, loadUser, signOut } from './session'
import { clientId, getSettings, updateSettings } from './settings'
import { backend } from './t3k'
import { tokenStore } from './tokenStore'

// In production the renderer is served from app://bundle/ rather than file://,
// so it has a real origin and a Content-Security-Policy.
const APP_SCHEME = 'app'
const APP_ORIGIN = `${APP_SCHEME}://bundle`

protocol.registerSchemesAsPrivileged([{ scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }])

const rendererDir = join(__dirname, '../renderer')

// The renderer never talks to the network itself: it only shows images from
// TONE3000 (tone pictures, avatars). Everything else goes through this process.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' https: data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function serveRenderer(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const { pathname } = new URL(request.url)
    const file = normalize(join(rendererDir, decodeURIComponent(pathname === '/' ? '/index.html' : pathname)))
    if (!file.startsWith(rendererDir + sep)) return new Response('Not found', { status: 404 })
    const res = await net.fetch(pathToFileURL(file).toString())
    if (!file.endsWith('.html')) return res
    const headers = new Headers(res.headers)
    headers.set('Content-Security-Policy', CSP)
    return new Response(res.body, { status: res.status, headers })
  })
}

// Protocol + host: Node's URL reports `origin` as "null" for custom schemes.
function sameOrigin(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.host === b.host
}

function isAppUrl(url: string): boolean {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  try {
    const u = new URL(url)
    return sameOrigin(u, new URL(APP_ORIGIN)) || (!!devUrl && sameOrigin(u, new URL(devUrl)))
  } catch {
    return false
  }
}

let mainWindow: BrowserWindow | null = null

/** The theme to open the window in, so its very first paint is already right. */
function openingTheme(): 'dark' | 'light' {
  const { theme } = getSettings()
  if (theme === 'system') return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  return theme
}

function createWindow(): BrowserWindow {
  const theme = openingTheme()
  const win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    // --t3k-canvas of the opening theme, behind the page until it paints.
    backgroundColor: theme === 'light' ? '#ffffff' : '#000000',
    title: APP_NAME,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      additionalArguments: [`--hx-theme=${theme}`],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.on('ready-to-show', () => win.show())
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
  win.webContents.setWindowOpenHandler(openExternally)
  // A reloaded page knows nothing of a TONE3000 view it had open: take it away.
  win.webContents.on('did-navigate', () => abandonAuth(win))
  // The window only ever shows the app's own pages; a dropped file or a stray
  // link must not replace them.
  win.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) return
    event.preventDefault()
    openExternally({ url })
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  void win.loadURL(devUrl || `${APP_ORIGIN}/index.html`)
  mainWindow = win
  return win
}

// ─── What the renderer asks for ─────────────────────────────────────────────

async function appState(): Promise<AppState> {
  await loadUser()
  return {
    version: app.getVersion(),
    platform: process.platform,
    locale: app.getLocale(),
    settings: getSettings(),
    clientIdFromBuild: BUILD_CLIENT_ID !== '',
    hasClientId: MOCK || clientId() !== '',
    connected: isConnected(),
    user: currentUser(),
    mock: MOCK,
  }
}

const LIST_KINDS: ToneListKind[] = ['favorited', 'downloaded', 'created', 'trending', 'latest']

function id(value: unknown): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) throw new AppError('invalid', 'Not an id.')
  return n
}

function requireConnection(): void {
  if (!isConnected()) throw new AppError('not_connected', 'Not connected to TONE3000.')
}

// A tone and its models, kept for a few minutes: opening a tone and then
// converting several of its models asks TONE3000 once, not once per click.
const KEEP_MS = 5 * 60_000
const toneCache = new Map<number, { at: number; tone?: Tone; models?: Model[] }>()

function cached(toneId: number): { at: number; tone?: Tone; models?: Model[] } {
  let entry = toneCache.get(toneId)
  if (!entry || Date.now() - entry.at > KEEP_MS) {
    entry = { at: Date.now() }
    toneCache.set(toneId, entry)
    if (toneCache.size > 40) toneCache.delete(toneCache.keys().next().value as number)
  }
  return entry
}

async function getTone(toneId: number): Promise<Tone> {
  const entry = cached(toneId)
  return (entry.tone ??= await backend().tone(toneId))
}

async function getModels(toneId: number): Promise<Model[]> {
  const entry = cached(toneId)
  return (entry.models ??= await backend().models(toneId))
}

function toneRef(tone: Tone): ToneRef {
  return {
    id: tone.id,
    title: tone.title,
    url: tone.url,
    gear: tone.gear,
    format: tone.format,
    license: tone.license,
    image: tone.images?.[0] ?? null,
    creator: {
      username: tone.user.username,
      displayName: tone.user.display_name,
      avatarUrl: tone.user.avatar_url,
      url: tone.user.url,
    },
  }
}

/** Downloads one model because the user asked for it, converts it and writes the .wav. */
async function convertModel(toneId: number, modelId: number): Promise<ConversionRecord> {
  requireConnection()
  const [tone, models] = await Promise.all([getTone(toneId), getModels(toneId)])
  const model = models.find((m) => m.id === modelId)
  if (!model) throw new AppError('not_found', 'This model is not part of the tone.')
  if (modelFit(model) === 'no') throw new AppError('not_convertible', 'Only NAM A2 models can be converted.')

  const text = await backend().modelText(model)
  const { wav, info } = convertNam(text, getSettings())
  return saveConversion({
    baseName: modelBaseName(tone.title, model.name),
    wav,
    info,
    source: 'tone3000',
    sourceName: model.name,
    tone: toneRef(tone),
    model: { id: model.id, name: model.name, size: model.size },
  })
}

const MAX_LOCAL_FILES = 200
const MAX_LOCAL_CHARS = 64 * 1024 * 1024

async function convertLocal(files: LocalNam[]): Promise<LocalOutcome[]> {
  if (!Array.isArray(files) || files.length > MAX_LOCAL_FILES) throw new AppError('invalid', 'Too many files at once.')
  const out: LocalOutcome[] = []
  for (const f of files) {
    const name = String(f?.name ?? 'capture.nam')
    try {
      if (typeof f?.text !== 'string' || f.text.length > MAX_LOCAL_CHARS) throw new AppError('not_convertible', 'The file could not be read.')
      const { wav, info } = convertNam(f.text, getSettings())
      const record = await saveConversion({ baseName: stripNamExtension(name), wav, info, source: 'local', sourceName: name })
      out.push({ name, ok: true, record })
    } catch (err) {
      out.push({ name, ok: false, message: err instanceof Error ? err.message : String(err) })
    }
  }
  return out
}

/** IPC is only honored from the app's own page, never from another frame. */
function fromApp(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): BrowserWindow | null {
  if (!isAppUrl(event.senderFrame?.url ?? '')) return null
  return BrowserWindow.fromWebContents(event.sender)
}

function handle<A extends unknown[], T>(channel: string, work: (win: BrowserWindow, ...args: A) => T | Promise<T>): void {
  ipcMain.handle(channel, (event, ...args) =>
    toResult(async () => {
      const win = fromApp(event)
      if (!win) throw new AppError('forbidden', 'Not allowed from here.')
      // The saved TONE3000 session is read from the keystore before anything asks about it.
      await tokenStore.ready()
      return work(win, ...(args as A))
    }),
  )
}

function registerIpc(): void {
  handle(IPC.state, () => appState())

  handle(IPC.settingsUpdate, async (_win, patch: Partial<Settings>) => {
    const before = clientId()
    updateSettings(patch ?? {})
    // Tokens belong to the key they were issued for.
    if (clientId() !== before && isConnected()) await signOut()
    return appState()
  })

  handle(IPC.chooseOutputDir, async (win) => {
    const picked = await dialog.showOpenDialog(win, {
      defaultPath: getSettings().outputDir,
      properties: ['openDirectory', 'createDirectory'],
    })
    if (!picked.canceled && picked.filePaths[0]) updateSettings({ outputDir: picked.filePaths[0] })
    return appState()
  })

  handle(IPC.authBegin, (win, request: AuthRequest, bounds: ViewBounds, flowId: string) => {
    if (!MOCK && clientId() === '') throw new AppError('no_client_id', 'No TONE3000 publishable key is set.')
    if (typeof flowId !== 'string' || flowId === '') throw new AppError('invalid', 'No flow id.')
    const prompt = request?.prompt === 'load_tone' ? 'load_tone' : 'select_tone'
    beginAuth(win, { prompt, toneId: prompt === 'load_tone' ? id(request.toneId) : undefined }, bounds, flowId)
    return null
  })
  ipcMain.on(IPC.authBounds, (event, bounds: ViewBounds) => {
    if (fromApp(event)) setAuthBounds(bounds)
  })
  ipcMain.on(IPC.authFocus, (event) => {
    if (fromApp(event)) focusAuth()
  })
  handle(IPC.authCancel, (_win, flowId: string) => {
    cancelAuth(String(flowId))
    return null
  })
  handle(IPC.signOut, async () => {
    await signOut()
    toneCache.clear()
    return appState()
  })

  handle(IPC.tones, (_win, kind: ToneListKind, page: number) => {
    requireConnection()
    if (!LIST_KINDS.includes(kind)) throw new AppError('invalid', 'Unknown list.')
    return backend().tones(kind, Number.isInteger(page) && page > 0 ? page : 1)
  })
  handle(IPC.tone, (_win, toneId: number) => {
    requireConnection()
    return getTone(id(toneId))
  })
  handle(IPC.models, (_win, toneId: number) => {
    requireConnection()
    return getModels(id(toneId))
  })

  handle(IPC.convertModel, (_win, toneId: number, modelId: number) => convertModel(id(toneId), id(modelId)))
  handle(IPC.convertLocal, (_win, files: LocalNam[]) => convertLocal(files))

  handle(IPC.library, () => listConversions())
  handle(IPC.libraryRemove, (_win, recordId: string) => removeConversion(String(recordId)))
  handle(IPC.deviceSend, (_win, recordId: string) => sendToDevice(String(recordId)))
  handle(IPC.reveal, (_win, recordId: string) => {
    const record = findConversion(String(recordId))
    if (!record) throw new AppError('not_found', 'This conversion is no longer listed.')
    shell.showItemInFolder(record.filePath)
    return null
  })
  handle(IPC.openOutputDir, async () => {
    const dir = getSettings().outputDir
    await mkdir(dir, { recursive: true })
    const failure = await shell.openPath(dir)
    if (failure) throw new AppError('write_failed', failure)
    return null
  })
  handle(IPC.openExternal, async (_win, url: string) => {
    let parsed: URL
    try {
      parsed = new URL(String(url))
    } catch {
      throw new AppError('invalid', 'Not a link.')
    }
    if (parsed.protocol !== 'https:') throw new AppError('invalid', 'Only https links are opened.')
    await shell.openExternal(parsed.toString())
    return null
  })
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

app.setName(APP_NAME)

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(() => {
    serveRenderer()
    registerIpc()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

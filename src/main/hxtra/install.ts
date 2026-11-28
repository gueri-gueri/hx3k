// Installing HXtra from the app, as its setup page does it: the user picks the
// features, gives Line 6's own firmware file, and the app builds HXtra from it,
// checks the result against the build HXtra tested, and hands the file to Line 6
// Updater. Like the setup page, the app never writes firmware to the unit
// itself: Line 6 Updater does, and the bootloader that brings the stock firmware
// back is never touched.
//
// Kept under userData/hxtra/: state.json (the stock file picked, the last build
// and choice), <version>/ (the release's build tools), pyodide/ (numpy), and
// builds/ (the last file built, until it is saved where the user wants it).

import { type BrowserWindow, app, dialog, net, shell } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { copyFile, mkdir, rename, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { BUILD_STEPS, buildFlags, cleanChoice, dspFits, md5Key, namSlots } from '@shared/hxtra'
import type { HxtraBuild, HxtraChoice, HxtraProgress, HxtraState, StockFirmware } from '@shared/types'
import { MOCK } from '../config'
import { AppError } from '../errors'
import { readJson, writeJson } from '../jsonFile'
import type { EngineEvent, EngineJob } from './engine'
import type { EngineRun } from './engineHost'
import { type HxtraManifest, RELEASES, builtName, findRelease, releaseInfo } from './release'
import { type Fetcher, ensureSources } from './sources'
import { checkStock } from './stock'

const root = (): string => join(app.getPath('userData'), 'hxtra')
const stateFile = (): string => join(root(), 'state.json')

interface Saved {
  stockPath?: string
  built?: HxtraBuild & { filePath: string }
  savedPath?: string
  choices?: Record<string, unknown>
}

function load(): Saved {
  const saved = readJson<Saved>(stateFile(), {})
  return saved && typeof saved === 'object' ? saved : {}
}

function store(change: (saved: Saved) => void): void {
  const saved = load()
  change(saved)
  writeJson(stateFile(), saved)
}

const isFile = (path: unknown): path is string => {
  try {
    return typeof path === 'string' && statSync(path).isFile()
  } catch {
    return false
  }
}

// ─── Line 6 Updater ─────────────────────────────────────────────────────────

/** Where Line 6 Updater installs itself; null on a system it does not run on. */
function updaterPlaces(): string[] | null {
  if (process.platform === 'darwin') return ['/Applications/Line6/Line 6 Updater.app', '/Applications/Line 6 Updater.app']
  if (process.platform === 'win32') {
    const dirs = [process.env['ProgramFiles(x86)'], process.env['ProgramFiles']].filter((d): d is string => !!d)
    return dirs.map((d) => join(d, 'Line6', 'Line 6 Updater', 'Line 6 Updater.exe'))
  }
  return null
}

function findUpdater(): string | null {
  return updaterPlaces()?.find((p) => existsSync(p)) ?? null
}

export async function openUpdater(): Promise<null> {
  if (MOCK) return null
  const path = findUpdater()
  if (!path) throw new AppError('updater_missing', 'Line 6 Updater is not on this computer.')
  const failure = await shell.openPath(path)
  if (failure) throw new AppError('updater_missing', failure)
  return null
}

// ─── State ──────────────────────────────────────────────────────────────────

let running: EngineRun | null = null
let busy = false
/** The user asked to stop the build under way. */
let stop = false

export function hxtraState(): HxtraState {
  const saved = load()
  const stock: StockFirmware | null = isFile(saved.stockPath)
    ? { path: saved.stockPath, name: basename(saved.stockPath), size: statSync(saved.stockPath).size }
    : null
  const built = saved.built && isFile(saved.built.filePath) ? saved.built : null
  const choices: Record<string, HxtraChoice> = {}
  for (const m of RELEASES) {
    const choice = cleanChoice(releaseInfo(m), saved.choices?.[m.version])
    if (choice) choices[m.version] = choice
  }
  return {
    releases: RELEASES.map(releaseInfo),
    stock,
    built: built && {
      version: built.version,
      fileName: built.fileName,
      md5: built.md5,
      verified: built.verified,
      size: built.size,
      choice: built.choice,
      builtAt: built.builtAt,
    },
    savedPath: built && isFile(saved.savedPath) ? saved.savedPath : null,
    choices,
    updater: MOCK ? 'found' : updaterPlaces() === null ? 'unsupported' : findUpdater() ? 'found' : 'missing',
    building: busy,
  }
}

/** Keeps what the user picked, so the screen shows it again. */
export function rememberChoice(version: string, raw: unknown): HxtraState {
  const m = findRelease(version)
  const choice = cleanChoice(releaseInfo(m), raw)
  if (!choice) throw new AppError('invalid', 'Not a choice of features.')
  store((s) => {
    s.choices = { ...(s.choices ?? {}), [m.version]: choice }
  })
  return hxtraState()
}

// ─── The stock firmware ─────────────────────────────────────────────────────

/** Takes the file at `path` (picked or dropped on the screen) as the stock firmware, once it is checked. */
export async function setStock(path: unknown): Promise<HxtraState> {
  if (typeof path !== 'string' || !path) throw new AppError('invalid', 'No file given.')
  const stock = await checkStock(path, RELEASES[0], MOCK)
  store((s) => {
    s.stockPath = stock.path
  })
  return hxtraState()
}

// ─── The build ──────────────────────────────────────────────────────────────

const fetchBytes: Fetcher = async (url) => {
  const res = await net.fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

/** Pyodide's folder; in the packaged app, the copy outside the archive (electron-builder.yml asarUnpack). */
function pyodideDir(): string {
  const dir = dirname(require.resolve('pyodide/package.json'))
  return `${dir.replace(/app\.asar(?=[\\/])/, 'app.asar.unpacked')}/`
}

async function engineBuild(m: HxtraManifest, stock: StockFirmware, flags: string[], slots: number, send: (p: HxtraProgress) => void): Promise<Uint8Array> {
  send({ kind: 'step', step: 1 })
  const sourcesDir = join(root(), m.version)
  await ensureSources(m, sourcesDir, fetchBytes, (n) => send({ kind: 'log', text: `downloaded ${n} files of HXtra ${m.tag} (${m.commit})\n` }))
  if (stop) throw new Error('canceled')
  const job: EngineJob = {
    indexURL: pyodideDir(),
    packageCacheDir: join(root(), 'pyodide'),
    sourcesDir,
    files: Object.keys(m.files),
    cache: m.cache.path,
    stockPath: stock.path,
    stockMd5: m.stock.md5,
    unit: m.stock.unit,
    kernel: m.kernel,
    steps: m.steps,
    e3Max: m.e3Max,
    flags,
    slots,
  }
  const { startEngine } = await import('./engineHost')
  running = startEngine(job, (e: EngineEvent) => send(e.type === 'progress' ? { kind: 'step', step: e.step } : { kind: 'log', text: e.text }))
  try {
    return await running.done
  } finally {
    running = null
  }
}

/** Sample mode: the steps go by, and a few made-up bytes stand in for the firmware. */
async function sampleBuild(flags: string[], slots: number, send: (p: HxtraProgress) => void): Promise<Uint8Array> {
  for (let step = 1; step <= BUILD_STEPS; step++) {
    if (stop) throw new Error('canceled')
    send({ kind: 'step', step })
    send({ kind: 'log', text: `sample step ${step}\n` })
    await new Promise((r) => setTimeout(r, 150))
  }
  return new TextEncoder().encode(`Sample HXtra build: ${[...flags, `HX_NAM_SLOTS=${slots}`].join(' ')}\n`)
}

export async function buildHxtra(version: unknown, raw: unknown, send: (p: HxtraProgress) => void): Promise<HxtraState> {
  if (busy) throw new AppError('invalid', 'A build is under way.')
  const m = findRelease(version)
  const choice = cleanChoice(releaseInfo(m), raw)
  if (!choice) throw new AppError('invalid', 'Not a choice of features.')
  if (!dspFits(m.dsp, choice)) throw new AppError('invalid', 'The DSP features picked do not fit beside that many NAM A2 Lite blocks.')
  const saved = load()
  if (!isFile(saved.stockPath)) throw new AppError('not_found', 'Choose Line 6’s firmware file first.')

  busy = true
  stop = false
  try {
    store((s) => {
      s.choices = { ...(s.choices ?? {}), [m.version]: choice }
    })
    // Checked again: the file may have changed since it was picked.
    const stock = await checkStock(saved.stockPath, m, MOCK)
    const flags = buildFlags(m, choice)
    const slots = namSlots(choice)
    let bytes: Uint8Array
    try {
      bytes = MOCK ? await sampleBuild(flags, slots, send) : await engineBuild(m, stock, flags, slots, send)
    } catch (err) {
      if (err instanceof AppError) throw err
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'canceled') throw new AppError('canceled', 'The build was stopped.')
      if (/not the stock firmware/.test(message)) throw new AppError('firmware_wrong', message)
      throw new AppError('hxtra_failed', message)
    }
    const md5 = createHash('md5').update(bytes).digest('hex')
    const want = MOCK ? md5 : m.tested[md5Key(flags, slots)]
    const fileName = builtName(m)
    const filePath = join(root(), 'builds', fileName)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(`${filePath}.part`, bytes)
    await rename(`${filePath}.part`, filePath)
    send({ kind: 'log', text: `\nbuilt ${fileName}, MD5 ${md5}${want === md5 ? ' (the tested build)' : ''}\n` })
    const built: HxtraBuild = {
      version: m.version,
      fileName,
      md5,
      verified: want ? want === md5 : null,
      size: bytes.byteLength,
      choice,
      builtAt: new Date().toISOString(),
    }
    store((s) => {
      s.built = { ...built, filePath }
      delete s.savedPath
    })
  } finally {
    busy = false
  }
  // After the build is over, so the state says so.
  return hxtraState()
}

export function cancelBuild(): null {
  if (!busy) return null
  stop = true
  running?.cancel()
  return null
}

// ─── The built file ─────────────────────────────────────────────────────────

const samePath = (a: string, b: string): boolean =>
  process.platform === 'linux' ? resolve(a) === resolve(b) : resolve(a).toLowerCase() === resolve(b).toLowerCase()

/** Saves a copy of the last build where the user picks. */
export async function saveBuilt(win: BrowserWindow): Promise<HxtraState> {
  const saved = load()
  const built = saved.built
  if (!built || !isFile(built.filePath)) throw new AppError('not_found', 'Build the firmware first.')
  const where = isFile(saved.savedPath) ? dirname(saved.savedPath) : app.getPath('downloads')
  const picked = await dialog.showSaveDialog(win, {
    defaultPath: join(where, built.fileName),
    filters: [{ name: 'HX Stomp firmware', extensions: ['hxf'] }],
  })
  if (picked.canceled || !picked.filePath) return hxtraState()
  // Line 6's own file is what Recovery puts back: never write over it.
  if (saved.stockPath && samePath(picked.filePath, saved.stockPath)) {
    throw new AppError('invalid', 'That is Line 6’s own firmware file: keep it, and save the build under another name.')
  }
  try {
    await copyFile(built.filePath, picked.filePath)
  } catch (err) {
    throw new AppError('write_failed', err instanceof Error ? err.message : String(err))
  }
  store((s) => {
    s.savedPath = picked.filePath
  })
  return hxtraState()
}

/** Shows the saved copy of the last build in the file manager. */
export function revealBuilt(): null {
  const saved = load()
  const path = isFile(saved.savedPath) ? saved.savedPath : null
  if (!path) throw new AppError('not_found', 'Save the firmware first.')
  shell.showItemInFolder(path)
  return null
}

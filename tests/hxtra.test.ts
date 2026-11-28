import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { AppError } from '../src/main/errors'
import { type HxtraManifest, RELEASES, builtName, defaultChoice, findRelease, releaseInfo } from '../src/main/hxtra/release'
import { ensureSources, sourceList } from '../src/main/hxtra/sources'
import { checkStock } from '../src/main/hxtra/stock'
import {
  buildFlags,
  canTurnOn,
  canTurnOnNam,
  cleanChoice,
  dspFits,
  dspUse,
  md5Key,
  namSlots,
  sameChoice,
  slotsFit,
  withFeature,
  withNam,
} from '../src/shared/hxtra'
import type { HxtraChoice } from '../src/shared/types'

// Installing HXtra: what the screen offers (as HXtra's setup page counts the
// DSP's memory), the release's files, Line 6's firmware file, and what the app
// keeps of a build.

const work = mkdtempSync(join(tmpdir(), 'hx3k-hxtra-'))
const userData = join(work, 'user-data')
const picked = vi.hoisted(() => ({ savePath: '' }))

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: (name: string) => (name === 'userData' ? userData : join(work, name)) },
  dialog: { showSaveDialog: async () => ({ canceled: false, filePath: picked.savePath }) },
  net: { fetch: () => Promise.reject(new Error('no network in tests')) },
  shell: { openPath: async () => '', showItemInFolder: () => undefined },
}))

afterAll(() => {
  rmSync(work, { recursive: true, force: true })
  delete process.env.HX3K_MOCK
})

const v121 = findRelease('1.2.1')
const info = releaseInfo(v121)
const md5 = (bytes: Uint8Array): string => createHash('md5').update(bytes).digest('hex')
const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')

/** Every choice the screen can be left on: NAM A2 Lite off or on some slots, any DSP features, any other features. */
function everyChoice(): HxtraChoice[] {
  const subsets = (list: string[]): string[][] => list.reduce<string[][]>((all, f) => [...all, ...all.map((s) => [...s, f])], [[]])
  const out: HxtraChoice[] = []
  for (const nam of [false, true])
    for (const slots of nam ? [3, 2, 1] : [2])
      for (const dsp of subsets(info.dsp.features))
        for (const options of subsets(info.options)) out.push({ nam, slots, dsp: info.dsp.features.filter((f) => dsp.includes(f)), options })
  return out
}

describe('HXtra 1.2.1', () => {
  it('is the release offered, built from the stock HX Stomp 3.80.0 file', () => {
    expect(RELEASES.map((r) => r.version)).toEqual(['1.2.1'])
    expect(v121.commit).toBe('fb234820083548961a17639240fa0f39ca636d96')
    expect(v121.stock).toEqual({ unit: 'HX_Stomp', fileName: 'HX_Stomp_v3.80.0_0x103966115.hxf', md5: 'a2cd8f4ae56f49415380270ebc484bf1' })
    expect(builtName(v121)).toBe('HXtra_v1.2.1.hxf')
    expect(info.notesUrl).toBe('https://github.com/wisemandenny/hxtra/releases/tag/v1.2.1')
  })

  it('builds with the Pyodide its setup page builds with', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies.pyodide).toBe(v121.pyodide)
    expect(v121.pyodide).toBe('0.26.4')
  })

  it('offers exactly the builds HXtra tested, no more and no fewer', () => {
    const offered = new Set(everyChoice().filter((c) => dspFits(info.dsp, c)).map((c) => md5Key(buildFlags(info, c), namSlots(c))))
    expect([...offered].sort()).toEqual(Object.keys(v121.tested).sort())
  })

  it('starts as the setup page does: two NAM blocks, every DSP feature, real block names off', () => {
    const start = defaultChoice(v121)
    expect(start).toEqual({ nam: true, slots: 2, dsp: ['HX_GR', 'HX_FX_GATE', 'HX_GATE_SC', 'HX_CLICK', 'HX_USB_MONITOR'], options: [] })
    expect(v121.tested[md5Key(buildFlags(info, start), 2)]).toMatch(/^[0-9a-f]{32}$/)
  })

  it('sets every build’s features, then the ones picked', () => {
    const flags = buildFlags(info, { nam: true, slots: 1, dsp: ['HX_CLICK'], options: ['HX_REAL_NAMES'] })
    expect(flags).toEqual([...v121.features, 'HX_REAL_NAMES', 'HX_CLICK'])
    expect(md5Key(['B', 'A'], 0)).toBe('A+B+HX_NAM_SLOTS=0')
  })
})

describe('The DSP memory', () => {
  const all: HxtraChoice = { nam: true, slots: 2, dsp: [...info.dsp.features], options: [] }

  it('counts NAM A2 Lite’s blocks as used, as the setup page’s meter does', () => {
    // 1.2.1: 14239 words with no NAM, 2528 left by two blocks; the five features take 2022.
    expect(dspUse(info.dsp, all)).toEqual({ total: 14239, nam: 14239 - 2528, used: 2022, left: 2528 - 2022 })
    expect(dspUse(info.dsp, { ...all, nam: false }).nam).toBe(0)
  })

  it('takes no feature that would not fit', () => {
    const three = { ...all, slots: 3, dsp: ['HX_CLICK'] }
    expect(dspFits(info.dsp, three)).toBe(true)
    expect(canTurnOn(info.dsp, three, 'HX_FX_GATE')).toBe(true) // 213 + 291 of 512
    expect(canTurnOn(info.dsp, { ...three, dsp: ['HX_CLICK', 'HX_FX_GATE'] }, 'HX_GR')).toBe(false)
    expect(canTurnOn(info.dsp, three, 'HX_CLICK')).toBe(true) // already on: it can always be turned off
    expect(slotsFit(info.dsp, all, 3)).toBe(false)
    expect(slotsFit(info.dsp, all, 1)).toBe(true)
  })

  it('turns NAM A2 Lite back on with the most blocks that fit beside the features', () => {
    const off: HxtraChoice = { ...all, nam: false, slots: 3 }
    expect(withNam(info.dsp, off, true)).toMatchObject({ nam: true, slots: 2 })
    expect(withNam(info.dsp, { ...off, slots: 1 }, true)).toMatchObject({ nam: true, slots: 1 })
    expect(canTurnOnNam(info.dsp, off)).toBe(true)
  })

  it('keeps the features in the release’s order', () => {
    const a = withFeature(info, { ...all, dsp: [] }, 'HX_USB_MONITOR', true)
    const b = withFeature(info, a, 'HX_GR', true)
    expect(b.dsp).toEqual(['HX_GR', 'HX_USB_MONITOR'])
    expect(withFeature(info, b, 'HX_GR', false).dsp).toEqual(['HX_USB_MONITOR'])
    expect(withFeature(info, b, 'HX_REAL_NAMES', true).options).toEqual(['HX_REAL_NAMES'])
    expect(withFeature(info, b, 'HX_NOPE', true)).toBe(b)
  })

  it('takes a choice from elsewhere only as one the release can build', () => {
    expect(cleanChoice(info, { nam: true, slots: 2, dsp: ['HX_CLICK', 'HX_GR', 'HX_NOPE', 7], options: ['HX_REAL_NAMES'] })).toEqual({
      nam: true,
      slots: 2,
      dsp: ['HX_GR', 'HX_CLICK'],
      options: ['HX_REAL_NAMES'],
    })
    expect(cleanChoice(info, { nam: true, slots: 4, dsp: [], options: [] })).toBeNull()
    expect(cleanChoice(info, { nam: true, slots: 0, dsp: [], options: [] })).toBeNull()
    expect(cleanChoice(info, 'all')).toBeNull()
    expect(sameChoice({ ...all, nam: false, slots: 1 }, { ...all, nam: false, slots: 3 })).toBe(true)
  })
})

describe('The release’s build tools', () => {
  const files = { 'build.py': 'print(1)\n', 'tools/a.py': 'A = 1\n' }
  const fake: HxtraManifest = {
    ...v121,
    files: Object.fromEntries(Object.entries(files).map(([p, text]) => [p, sha256(Buffer.from(text))])),
    cache: { ...v121.cache, sha256: sha256(Buffer.from('{}')) },
  }
  const served = (overrides: Record<string, string> = {}) => {
    const asked: string[] = []
    const fetcher = async (url: string): Promise<Uint8Array> => {
      asked.push(url)
      const path = url.endsWith('/m4cache.json') ? 'm4cache.json' : url.split(`/${v121.commit}/`)[1]
      const text = overrides[path] ?? (path === 'm4cache.json' ? '{}' : files[path as keyof typeof files])
      return Buffer.from(text)
    }
    return { asked, fetcher }
  }

  it('come from the release’s own commit, and its m4cache.json from the release', () => {
    const list = sourceList(v121)
    expect(list).toHaveLength(76)
    expect(list[0].url).toBe(`https://raw.githubusercontent.com/wisemandenny/hxtra/${v121.commit}/build.py`)
    expect(list.at(-1)).toEqual({ path: 'm4cache.json', url: 'https://github.com/wisemandenny/hxtra/releases/download/v1.2.1/m4cache.json', sha256: v121.cache.sha256 })
  })

  it('are fetched once, then kept', async () => {
    const dir = join(work, 'sources-once')
    const first = served()
    let count = 0
    await ensureSources(fake, dir, first.fetcher, (n) => (count = n))
    expect(first.asked).toHaveLength(3)
    expect(count).toBe(3)
    expect(readFileSync(join(dir, 'tools/a.py'), 'utf8')).toBe(files['tools/a.py'])
    const again = served()
    await ensureSources(fake, dir, again.fetcher)
    expect(again.asked).toEqual([])
    // A file changed on disk is fetched again.
    writeFileSync(join(dir, 'build.py'), 'print(2)\n')
    const third = served()
    await ensureSources(fake, dir, third.fetcher)
    expect(third.asked).toEqual([`https://raw.githubusercontent.com/wisemandenny/hxtra/${v121.commit}/build.py`])
  })

  it('are refused when one is not the release’s', async () => {
    const dir = join(work, 'sources-bad')
    await expect(ensureSources(fake, dir, served({ 'tools/a.py': 'A = 2\n' }).fetcher)).rejects.toMatchObject({ code: 'hxtra_tools' })
    expect(existsSync(join(dir, 'tools/a.py'))).toBe(false)
  })

  it('say which file could not be downloaded', async () => {
    const failing = async (): Promise<Uint8Array> => {
      throw new Error('HTTP 503')
    }
    await expect(ensureSources(fake, join(work, 'sources-down'), failing)).rejects.toThrow(/could not be downloaded: HTTP 503/)
  })

  it('stay inside their folder', async () => {
    const escaping = { ...fake, files: { '../outside.py': sha256(Buffer.from('x')) } }
    await expect(ensureSources(escaping, join(work, 'sources-escape'), served().fetcher)).rejects.toBeInstanceOf(AppError)
  })
})

describe('Line 6’s firmware file', () => {
  const dir = join(work, 'stock')
  mkdirSync(dir, { recursive: true })
  const bytes = Buffer.alloc(3_000_000, 7)
  const right = { stock: { ...v121.stock, md5: md5(bytes) } }
  const file = (name: string, content: Uint8Array = bytes): string => {
    const path = join(dir, name)
    writeFileSync(path, content)
    return path
  }

  it('is taken when it is the very file the release builds from', async () => {
    const path = file('HX_Stomp_v3.80.0_0x103966115.hxf')
    await expect(checkStock(path, right)).resolves.toEqual({ path, name: 'HX_Stomp_v3.80.0_0x103966115.hxf', size: 3_000_000 })
    // Renamed is fine: only its bytes count.
    await expect(checkStock(file('stock copy.hxf'), right)).resolves.toMatchObject({ name: 'stock copy.hxf' })
  })

  it('is refused when it is anything else', async () => {
    await expect(checkStock(file('capture.nam', Buffer.from('{}')), right)).rejects.toMatchObject({ code: 'firmware_not_hxf' })
    await expect(checkStock(file('HXtra_v1.2.1.hxf'), right)).rejects.toMatchObject({ code: 'firmware_built' })
    await expect(checkStock(file('HX_Stomp_v3.80.0_HXtra.hxf'), right)).rejects.toMatchObject({ code: 'firmware_built' })
    await expect(checkStock(file('small.hxf', Buffer.alloc(10)), right)).rejects.toMatchObject({ code: 'firmware_wrong' })
    await expect(checkStock(file('other.hxf', Buffer.alloc(3_000_000, 8)), right)).rejects.toMatchObject({ code: 'firmware_wrong' })
    await expect(checkStock(join(dir, 'gone.hxf'), right)).rejects.toMatchObject({ code: 'not_found' })
  })
})

describe('A build, in sample mode', async () => {
  process.env.HX3K_MOCK = '1'
  const install = await import('../src/main/hxtra/install')
  const stock = join(work, 'HX_Stomp_v3.80.0_0x103966115.hxf')
  writeFileSync(stock, 'sample stock')
  const steps: number[] = []

  it('is kept with the features it was built with, and its file stays the app’s until saved', async () => {
    await install.setStock(stock)
    const choice: HxtraChoice = { nam: true, slots: 1, dsp: ['HX_GR'], options: [] }
    const state = await install.buildHxtra('1.2.1', choice, (p) => p.kind === 'step' && steps.push(p.step))
    expect(steps).toEqual([1, 2, 3, 4, 5, 6])
    expect(state.building).toBe(false)
    expect(state.stock?.path).toBe(stock)
    expect(state.built).toMatchObject({ version: '1.2.1', fileName: 'HXtra_v1.2.1.hxf', verified: true, choice })
    expect(state.choices['1.2.1']).toEqual(choice)
    expect(state.savedPath).toBeNull()
    expect(existsSync(join(userData, 'hxtra/builds/HXtra_v1.2.1.hxf'))).toBe(true)
  })

  it('never takes features that do not fit', async () => {
    await expect(install.buildHxtra('1.2.1', { nam: true, slots: 3, dsp: ['HX_GR'], options: [] }, () => undefined)).rejects.toMatchObject({ code: 'invalid' })
    await expect(install.buildHxtra('1.1.0', info.defaults, () => undefined)).rejects.toMatchObject({ code: 'invalid' })
  })

  it('is saved where the user picks, but never over Line 6’s own file', async () => {
    picked.savePath = stock
    await expect(install.saveBuilt({} as never)).rejects.toMatchObject({ code: 'invalid' })
    expect(readFileSync(stock, 'utf8')).toBe('sample stock')
    picked.savePath = join(work, 'Downloads', 'HXtra_v1.2.1.hxf')
    mkdirSync(join(work, 'Downloads'), { recursive: true })
    const state = await install.saveBuilt({} as never)
    expect(state.savedPath).toBe(picked.savePath)
    expect(readFileSync(picked.savePath, 'utf8')).toMatch(/^Sample HXtra build: .*HX_GR HX_NAM_SLOTS=1/)
  })

  it('can be stopped', async () => {
    const run = install.buildHxtra('1.2.1', info.defaults, () => {
      install.cancelBuild()
    })
    await expect(run).rejects.toMatchObject({ code: 'canceled' })
    expect(install.hxtraState().building).toBe(false)
  })
})

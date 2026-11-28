import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { loadPyodide } from 'pyodide'
import { describe, expect, it } from 'vitest'
import { type EngineEvent, type EngineJob, runEngine } from '../src/main/hxtra/engine'
import { defaultChoice, findRelease, releaseInfo } from '../src/main/hxtra/release'
import { ensureSources } from '../src/main/hxtra/sources'
import { buildFlags, md5Key, namSlots } from '../src/shared/hxtra'
import type { HxtraChoice } from '../src/shared/types'

// The firmware build itself, with HXtra 1.2.1's own tools in Pyodide, outside
// the app. Skipped unless asked for: the first run downloads the tools (from
// GitHub) and numpy (from Pyodide's CDN), kept in the system's temporary folder.
//
//   npm run hxtra:build
// loads the tools and checks that a file that is not Line 6's is refused.
//
//   HX3K_STOCK_HXF=/path/to/HX_Stomp_v3.80.0_0x103966115.hxf npm run hxtra:build
// also builds HXtra from that file, as the screen starts (two NAM blocks, every
// DSP feature) and without NAM A2 Lite, and checks each is byte for byte the
// build HXtra tested. Nothing is written to a unit.

const m = findRelease('1.2.1')
const cache = join(tmpdir(), 'hx3k-hxtra-engine')
const sourcesDir = join(cache, m.version)
const stockFile = process.env.HX3K_STOCK_HXF

function job(stockPath: string, choice: HxtraChoice): EngineJob {
  return {
    indexURL: `${dirname(createRequire(import.meta.url).resolve('pyodide/package.json'))}/`,
    packageCacheDir: join(cache, 'pyodide'),
    sourcesDir,
    files: Object.keys(m.files),
    cache: m.cache.path,
    stockPath,
    stockMd5: m.stock.md5,
    unit: m.stock.unit,
    kernel: m.kernel,
    steps: m.steps,
    e3Max: m.e3Max,
    flags: buildFlags(m, choice),
    slots: namSlots(choice),
  }
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

describe.skipIf(!process.env.HX3K_HXTRA)('Building HXtra 1.2.1', () => {
  it('loads the release’s tools, and refuses a file that is not Line 6’s', { timeout: 300_000 }, async () => {
    await ensureSources(m, sourcesDir, fetchBytes, (n) => console.log(`downloaded ${n} files`))
    mkdirSync(cache, { recursive: true })
    const fake = join(cache, 'not-stock.hxf')
    writeFileSync(fake, Buffer.alloc(3_000_000))
    const steps: number[] = []
    const run = runEngine(job(fake, defaultChoice(m)), (e: EngineEvent) => e.type === 'progress' && steps.push(e.step), loadPyodide)
    await expect(run).rejects.toThrow(/not the stock firmware/)
    expect(steps).toEqual([1, 2])
  })

  const choices: [string, HxtraChoice][] = [
    ['as the screen starts', defaultChoice(m)],
    ['without NAM A2 Lite, with real block names', { nam: false, slots: 2, dsp: ['HX_GR', 'HX_CLICK'], options: ['HX_REAL_NAMES'] }],
  ]
  for (const [what, choice] of choices) {
    it.skipIf(!stockFile)(`builds the tested file ${what}`, { timeout: 600_000 }, async () => {
      await ensureSources(m, sourcesDir, fetchBytes)
      const started = Date.now()
      const bytes = await runEngine(job(stockFile as string, choice), () => undefined, loadPyodide)
      const md5 = createHash('md5').update(bytes).digest('hex')
      console.log(`${what}: ${bytes.byteLength} bytes, MD5 ${md5}, ${Math.round((Date.now() - started) / 1000)} s`)
      expect(md5).toBe(m.tested[md5Key(buildFlags(releaseInfo(m), choice), namSlots(choice))])
    })
  }
})

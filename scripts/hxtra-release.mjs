// Writes the manifest of one HXtra release, which src/main/hxtra/ builds that
// release from: what the setup page's web/firmware-worker.js runs (the stock
// firmware it takes, the NAM kernel, the patch steps), the SHA-256 of every file
// it loads, and what the release's m4cache.json says: its features, their DSP
// cost, and the MD5 of every build it tested.
//
//   node scripts/hxtra-release.mjs <hxtra checkout> <tag> <m4cache.json of that release> > src/main/hxtra/releases/<tag>.json
//
// The checkout is a clone of https://github.com/wisemandenny/hxtra; the tag is
// read from it with git, so the files of the working tree do not count. The
// m4cache.json is the one attached to the GitHub release of that tag.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const [checkout, tag, cachePath] = process.argv.slice(2)
if (!checkout || !tag || !cachePath) {
  console.error('usage: node scripts/hxtra-release.mjs <hxtra checkout> <tag> <m4cache.json>')
  process.exit(2)
}

const REPOSITORY = 'wisemandenny/hxtra'
const git = (...args) => execFileSync('git', ['-C', checkout, ...args], { maxBuffer: 1 << 28 })
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

const commit = git('rev-parse', `${tag}^{commit}`).toString().trim()
const worker = git('show', `${tag}:web/firmware-worker.js`).toString()

// The worker's declarations, as the page has them. Its functions are not called.
const page = vm.runInNewContext(`${worker}\n;({ PYODIDE, STOCK_MD5, KERNEL, STEPS, E3_MAX, SOURCES, CACHE })`, { self: {} })

const units = Object.entries(page.STOCK_MD5)
if (units.length !== 1 || units[0][1] !== 'HX_Stomp') throw new Error(`${tag}: expected one stock file, for the HX Stomp`)
const [stockMd5, unit] = units[0]
const stockName = /HX_Stomp_v[\d.]+_0x[0-9a-f]+\.hxf/.exec(worker)?.[0]
if (!stockName) throw new Error(`${tag}: the name of the stock file is not in the worker`)
const pyodide = /\/pyodide\/v([\d.]+)\/full\//.exec(page.PYODIDE)?.[1]
if (!pyodide) throw new Error(`${tag}: no Pyodide version in the worker`)

const cacheBytes = readFileSync(cachePath)
const cache = JSON.parse(cacheBytes.toString('utf8'))
if (cache.release !== tag) throw new Error(`${cachePath} is the m4cache.json of ${cache.release}, not of ${tag}`)
if (cache.unit !== unit) throw new Error(`${cachePath} is for ${cache.unit}, not ${unit}`)

const files = {}
for (const path of page.SOURCES) files[path] = sha256(git('show', `${tag}:${path}`))

const manifest = {
  version: tag.replace(/^v/, ''),
  tag,
  repository: REPOSITORY,
  commit,
  pyodide,
  stock: { unit, fileName: stockName, md5: stockMd5 },
  kernel: page.KERNEL[unit],
  steps: page.STEPS[unit],
  e3Max: page.E3_MAX,
  cache: {
    path: page.CACHE,
    url: `https://github.com/${REPOSITORY}/releases/download/${tag}/${page.CACHE}`,
    sha256: sha256(cacheBytes),
  },
  features: cache.features,
  options: cache.options ?? [],
  dsp: cache.dsp,
  // The MD5 of every build the release offers, by its switches (src/shared/hxtra.ts md5Key).
  tested: cache.md5[unit],
  files,
}

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`)

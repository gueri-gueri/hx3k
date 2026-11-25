// Renders the built cards the way the design system page frames them, and
// reports what a reader would see wrong: a script error, a card that did not
// mount, content wider than its frame. Screenshots go to dist/shots/.
//
//   node check.mjs <bundle> [--theme dark|light] [Name…]
//
// <bundle> is a folder holding the three files /design-sync builds from the
// app and publishes under project/components/: bundle.css, bundle.js and
// lib/react.js. Download them from the design system; they are not built here.
//
// The browser is playwright-core's (the app's own dev dependency). Set
// HX3K_CHROME to a Chrome or Chromium binary to use that one instead.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { compile, tokens } from './tokens.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, 'dist', 'project')
const SHOTS = path.join(HERE, 'dist', 'shots')

const args = process.argv.slice(2)
const at = args.indexOf('--theme')
const theme = at >= 0 ? args.splice(at, 2)[1] : 'dark'
const [bundleArg, ...names] = args
if (!bundleArg || (theme !== 'dark' && theme !== 'light')) {
  console.error('usage: node check.mjs <bundle> [--theme dark|light] [Name…]')
  process.exit(2)
}
const bundle = path.resolve(bundleArg)
for (const file of ['bundle.css', 'bundle.js', 'lib/react.js']) {
  if (!fs.existsSync(path.join(bundle, file))) {
    console.error(`${file} is not in ${bundle}`)
    process.exit(2)
  }
}
if (!fs.existsSync(OUT)) {
  console.error('nothing built yet: run "node build.mjs" first')
  process.exit(2)
}

const url = (file) => pathToFileURL(path.join(bundle, file)).href
// The page hands a frame the bundle's stylesheet, the tokens compiled from
// tokens.json, a transparent ground, then React, the bundle and the card.
const frame = (html) =>
  `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8">` +
  `<link rel="stylesheet" href="${url('bundle.css')}">` +
  `<style>${compile(tokens, { fontFaces: false })} html,body{background:transparent!important}</style>` +
  `</head><body><script src="${url('lib/react.js')}"></script><script src="${url('bundle.js')}"></script>` +
  html +
  `</body></html>`

const cards = [...JSON.parse(fs.readFileSync(path.join(HERE, 'cards.json'), 'utf8')), { name: 'Cover', width: 960, height: 288, mode: 'cover' }]
const wanted = names.length ? names : cards.map((c) => c.name)
fs.mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch(process.env.HX3K_CHROME ? { executablePath: process.env.HX3K_CHROME } : {}).catch((err) => {
  console.error(String(err.message).split('\n')[0])
  console.error('No browser to render with: run "npx playwright-core install chromium" at the root of the repository, or set HX3K_CHROME to a Chrome or Chromium binary.')
  process.exit(2)
})
let failed = 0
for (const name of wanted) {
  const card = cards.find((c) => c.name === name)
  if (!card) {
    console.log(`${name.padEnd(18)} not in cards.json`)
    failed++
    continue
  }
  const width = card.width ?? 760
  const page = await browser.newPage({ viewport: { width, height: card.height ?? 400 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const html = fs.readFileSync(path.join(OUT, 'components', name, 'preview.html'), 'utf8')
  const tmp = path.join(SHOTS, `_${name}.html`)
  fs.writeFileSync(tmp, frame(html))
  await page.goto(pathToFileURL(tmp).href)
  await page.waitForTimeout(350)
  await page.evaluate(() => document.fonts.ready)
  const seen = await page.evaluate(() => {
    const root = document.querySelector('.ds-single') || document.getElementById('g') || document.querySelector('.cover') || document.body
    const pad = parseFloat(getComputedStyle(document.body).paddingTop) || 0
    return {
      height: Math.ceil(root.getBoundingClientRect().bottom + pad),
      wide: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      text: document.body.innerText.trim().length,
      warned: document.body.innerText.includes('⚠'),
    }
  })
  await page.setViewportSize({ width, height: Math.max(60, seen.height) })
  await page.screenshot({ path: path.join(SHOTS, `${name}-${theme}.png`) })
  fs.rmSync(tmp)
  await page.close()

  const problems = [...errors.map((e) => e.slice(0, 200))]
  if (seen.warned) problems.push('a story did not mount')
  if (seen.text === 0) problems.push('nothing rendered')
  if (seen.wide) problems.push('wider than its frame')
  // A screen states its own height; any other card's is measured, for cards.json.
  const fixed = card.mode === 'single' || card.mode === 'cover'
  if (!fixed && card.height !== seen.height) problems.push(`height is ${seen.height}, cards.json says ${card.height ?? 'nothing'}`)
  if (problems.length) failed++
  console.log(`${name.padEnd(18)} ${String(width).padStart(4)} x ${String(seen.height).padEnd(5)} ${problems.length ? problems.join(' | ') : 'ok'}`)
}
await browser.close()
console.log(failed ? `${failed} of ${wanted.length} need a look` : `${wanted.length} cards render clean in the ${theme} theme; screenshots in ${path.relative(process.cwd(), SHOTS)}`)
process.exit(failed ? 1 : 0)

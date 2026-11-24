// End-to-end smoke test: drives the built app with sample data in place of
// TONE3000 (HX3K_MOCK=1), from the splash to .wav files on disk.
//
//   npm run build && npm run test:e2e
//
// Everything it writes goes to a temporary folder: its own user-data directory
// and its own output folder, never the real ones. HX3K_SHOTS=<dir> keeps
// screenshots of each screen.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright-core'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const work = mkdtempSync(join(tmpdir(), 'hx3k-e2e-'))
const userData = join(work, 'user-data')
const outputDir = join(work, 'out')
const shots = process.env.HX3K_SHOTS
mkdirSync(userData, { recursive: true })
if (shots) mkdirSync(shots, { recursive: true })

// English, and an output folder of the test's own.
writeFileSync(join(userData, 'settings.json'), JSON.stringify({ outputDir, language: 'en', theme: 'dark' }))

/** A made-up A2 Lite capture, as src/main/sampleNam.ts builds one. */
function sampleNam() {
  const kernel = [...Array(14).fill(6), 15, 15, ...Array(7).fill(6)]
  const dilations = [1, 3, 7, 17, 41, 101, 239, 1, 3, 7, 17, 41, 101, 239, 1, 13, 1, 3, 7, 17, 41, 101, 239]
  return JSON.stringify({
    version: '0.7.0',
    architecture: 'WaveNet',
    config: {
      layers: [
        {
          input_size: 1,
          condition_size: 1,
          channels: 3,
          bottleneck: 3,
          kernel_sizes: kernel,
          dilations,
          activation: kernel.map(() => ({ type: 'LeakyReLU', negative_slope: 0.01 })),
          layer1x1: { active: true, groups: 1 },
          head: { out_channels: 1, kernel_size: 16, bias: true },
        },
      ],
      head_scale: 0.02,
    },
    weights: Array.from({ length: 1871 }, (_, i) => Math.sin(i) / 2),
    sample_rate: 48000,
    metadata: { name: 'My own amp', modeled_by: 'me', input_level_dbu: 18.3, loudness: -17 },
  })
}

const WAV_BYTES = 44 + 2048 * 4
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// The built app, not a dev server that may be running beside it.
const env = { ...process.env, HX3K_MOCK: '1' }
delete env.ELECTRON_RENDERER_URL

const app = await electron.launch({ cwd: root, args: ['.', `--user-data-dir=${userData}`], env })

let step = 0
const errors = []

// ─── The embedded page that stands in for TONE3000's catalog ────────────────

/** Runs `code` in the sample catalog's page; null when that page is not open. */
const inCatalog = (code) =>
  app.evaluate(async ({ webContents }, js) => {
    const wc = webContents.getAllWebContents().find((w) => w.getTitle() === 'Sample TONE3000')
    return wc ? wc.executeJavaScript(js) : null
  }, code)

/** The catalog's page: where it sits; null when it is not open. */
const catalog = () =>
  app.evaluate(({ BrowserWindow }) => {
    const view = BrowserWindow.getAllWindows()[0].contentView.children.find((c) => c.webContents?.getTitle() === 'Sample TONE3000')
    return view ? { bounds: view.getBounds() } : null
  })

async function catalogOpen() {
  for (let i = 0; i < 100; i++) {
    if ((await inCatalog('document.readyState')) === 'complete') return
    await sleep(100)
  }
  throw new Error('the sample catalog did not open')
}

async function catalogClosed() {
  for (let i = 0; i < 100; i++) {
    if ((await catalog()) === null) return
    await sleep(100)
  }
  throw new Error('the sample catalog did not close')
}

/** Follows a link of the catalog; the page goes away with it, so no answer is waited for. */
const follow = (id) =>
  app.evaluate(({ webContents }, linkId) => {
    const wc = webContents.getAllWebContents().find((w) => w.getTitle() === 'Sample TONE3000')
    void wc?.executeJavaScript(`document.getElementById(${JSON.stringify(linkId)}).click()`).catch(() => undefined)
  }, id)

/** A key pressed while the catalog's page has the keyboard. */
const keyInCatalog = (keyCode) =>
  app.evaluate(({ webContents }, key) => {
    const wc = webContents.getAllWebContents().find((w) => w.getTitle() === 'Sample TONE3000')
    wc?.sendInputEvent({ type: 'keyDown', keyCode: key })
    wc?.sendInputEvent({ type: 'keyUp', keyCode: key })
  }, keyCode)

try {
  const page = await app.firstWindow()
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.setViewportSize({ width: 1240, height: 840 })

  const shot = async (name) => {
    step++
    if (shots) await page.screenshot({ path: join(shots, `${String(step).padStart(2, '0')}-${name}.png`) })
  }
  const focused = () => page.evaluate(() => (document.activeElement === document.body ? 'body' : `${document.activeElement.tagName.toLowerCase()}.${document.activeElement.className}`))

  // TONE3000 is an entry of the menu, selected for as long as the user is on its pages.
  const menu = (name) => page.locator('.nav-item', { has: name === 'TONE3000' ? page.locator('img[alt="TONE3000"]') : page.getByText(name, { exact: true }) })
  const selected = page.locator('.nav-item[aria-current="page"]')

  // The splash comes before any sign-in, with the full TONE3000 logo and a title of its own.
  await page.getByRole('button', { name: 'Continue' }).waitFor()
  assert.equal(await page.locator('.splash img[alt="TONE3000"]').count(), 1)
  assert.equal(await page.getByRole('heading', { level: 1, name: 'Connect to TONE3000' }).count(), 1)
  assert.equal(await menu('TONE3000').count(), 1)
  await shot('splash')

  // Continue goes to TONE3000's page, laid exactly over its place beside the menu.
  await page.getByRole('button', { name: 'Continue' }).click()
  await selected.locator('img[alt="TONE3000"]').waitFor()
  await page.locator('main.stage').waitFor()
  await catalogOpen()
  const stage = await page.locator('main.stage').boundingBox()
  const laid = (await catalog()).bounds
  assert.deepEqual([laid.x, laid.y, laid.width, laid.height], [stage.x, stage.y, stage.width, stage.height].map(Math.round))
  assert.equal(await page.title(), 'TONE3000 · HX3K')
  await page.waitForTimeout(250) // let the menu's highlight settle for the picture
  await shot('tone3000')

  // Keyboard: F6 in TONE3000's page puts the keyboard on its entry in the menu,
  // and the menu says so. Tab alone never crosses between the two pages.
  await page.getByText('moves between this menu and TONE3000').waitFor()
  await keyInCatalog('F6')
  await page.waitForFunction(() => document.activeElement?.matches('.nav-item[aria-current="page"]'))
  // F6 again, from the app, goes back in; so does Tab on reaching the page's place.
  await page.keyboard.press('F6')
  await page.locator('.stage button').focus()
  assert.equal(await focused(), 'body', 'the keyboard was handed to the page, not left on the way in')

  // Picking a tone there lands on that tone, with the keyboard on its screen.
  await follow('pick-101')
  await page.getByRole('heading', { name: 'Plexi Lead 100' }).waitFor()
  await catalogClosed()
  await page.getByText('@sample_player').waitFor()
  assert.equal((await selected.innerText()).trim(), 'Tones')
  assert.equal(await page.title(), 'Plexi Lead 100 · HX3K')
  assert.equal(await focused(), 'main.content')
  await shot('tone')

  // Both A2 Lite models convert, and the result is said, not only shown.
  await page.getByRole('button', { name: 'Convert all A2 Lite (2)' }).click()
  await page.locator('.row-ok', { hasText: 'Saved as Plexi Lead 100 - Gain 4 - SM57 NAM.wav' }).waitFor()
  await page.locator('.row-ok', { hasText: 'Saved as Plexi Lead 100 - Gain 7 - SM57 NAM.wav' }).waitFor()
  for (const name of ['Plexi Lead 100 - Gain 4 - SM57 NAM.wav', 'Plexi Lead 100 - Gain 7 - SM57 NAM.wav']) {
    assert.equal(statSync(join(outputDir, name)).size, WAV_BYTES, name)
  }
  await page.locator('.sr-only[role="status"]', { hasText: 'Saved as Plexi Lead 100 - Gain 7' }).waitFor({ state: 'attached' })

  // The 8-channel size is refused, in words; the multi-size file gives up its A2 Lite model.
  const tries = page.getByRole('button', { name: 'Try to convert' })
  assert.equal(await tries.count(), 2)
  await tries.first().click()
  await page.getByText('No A2 Lite model inside').waitFor()
  await page.getByRole('button', { name: 'Try to convert' }).last().click()
  await page.locator('.row-ok', { hasText: 'Saved as Plexi Lead 100 - All sizes NAM.wav' }).waitFor()
  await shot('tone-converted')

  // Converting again writes over the capture's own file.
  await page.getByRole('button', { name: 'Convert again' }).first().click()
  await page.getByRole('button', { name: 'Converting…' }).waitFor({ state: 'detached' })
  assert.deepEqual(
    readdirSync(outputDir).sort(),
    [
      'Plexi Lead 100 - All sizes NAM.wav',
      'Plexi Lead 100 - Gain 4 - SM57 NAM.wav',
      'Plexi Lead 100 - Gain 7 - SM57 NAM.wav',
      'TONE3000 credits.txt',
    ].sort(),
  )

  // The creator and the license travel with the files.
  const credits = readFileSync(join(outputDir, 'TONE3000 credits.txt'), 'utf8')
  assert.match(credits, /Creator: @valve_hunter/)
  assert.match(credits, /License: t3k/)
  assert.match(credits, /https:\/\/www\.tone3000\.com/)

  // The lists: each tone with picture, title, gear, format and creator.
  await menu('Tones').click()
  await page.getByRole('tab', { name: 'Favorites' }).waitFor()
  await page.locator('.tone-card .tone-title').first().waitFor()
  const first = page.locator('.tone-card').first()
  await first.getByText('Amp Head').waitFor()
  await first.getByText('NAM', { exact: true }).waitFor()
  await first.getByText('@valve_hunter').waitFor()
  // A card's control is its title, named by the title alone.
  await first.getByRole('button', { name: 'Plexi Lead 100', exact: true }).waitFor()
  // The whole catalog stays one click away: the menu entry, and a card after the list.
  await page.getByRole('button', { name: 'Discover more on TONE3000', exact: true }).waitFor()
  await shot('tones')

  // The tabs are one stop for Tab; the arrows move between them.
  assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 1)
  assert.equal(await page.locator('[role="tablist"] > :not([role="tab"])').count(), 0)
  await page.getByRole('tab', { name: 'Favorites' }).focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.getByRole('tab', { name: 'Downloaded' }).getAttribute('aria-selected'), 'true')
  assert.equal(await focused(), 'button.tab')
  await page.keyboard.press('End')
  assert.equal(await page.getByRole('tab', { name: 'Latest' }).getAttribute('aria-selected'), 'true')
  await page.keyboard.press('Home')
  await page.locator('.tone-card .tone-title').first().waitFor()

  // Opening a tone from a card and coming back returns the keyboard to that card.
  await page.getByRole('button', { name: 'Tweed Deluxe Edge of Breakup', exact: true }).click()
  await page.getByRole('heading', { name: 'Tweed Deluxe Edge of Breakup' }).waitFor()
  assert.equal(await focused(), 'main.content')
  await page.getByRole('button', { name: 'Back' }).click()
  await page.waitForFunction(() => document.activeElement?.textContent === 'Tweed Deluxe Edge of Breakup')

  await page.getByRole('tab', { name: 'Created' }).click()
  await page.getByText('You have not published a tone').waitFor()
  await page.getByRole('tab', { name: 'Trending' }).click()
  await page.getByText('Recto Modern High Gain').waitFor()
  assert.equal(await page.title(), 'Discover · HX3K')
  await shot('trending')

  // Going to TONE3000 from the menu selects it; leaving closes the visit for good.
  await menu('TONE3000').click()
  await selected.locator('img[alt="TONE3000"]').waitFor()
  await catalogOpen()
  await menu('Local files').click()
  await page.getByRole('heading', { name: 'Local files' }).waitFor()
  await catalogClosed()
  assert.equal((await selected.innerText()).trim(), 'Local files')

  // Closing the catalog without picking goes back to where the user was.
  await menu('TONE3000').click()
  await catalogOpen()
  await follow('close')
  await catalogClosed()
  await page.getByRole('heading', { name: 'Local files' }).waitFor()
  assert.equal((await selected.innerText()).trim(), 'Local files')

  // Local files need no TONE3000.
  const good = join(work, 'My own amp.nam')
  const bad = join(work, 'notes.nam')
  writeFileSync(good, sampleNam())
  writeFileSync(bad, 'just some text')
  await page.locator('input[type=file]').setInputFiles([good, bad])
  await page.getByRole('heading', { name: '1 of 2 converted' }).waitFor()
  await page.getByText('Saved as My own amp NAM.wav').waitFor()
  await page.getByText('This is not a .nam capture file.').waitFor()
  assert.equal(statSync(join(outputDir, 'My own amp NAM.wav')).size, WAV_BYTES)
  await shot('local')

  // The converted captures, each marked with where it came from.
  await menu('Converted').click()
  await page.getByText('My own amp NAM.wav').waitFor()
  assert.equal(await page.locator('.rows > .row').count(), 4)
  assert.equal(await page.locator('.thumb-mark img[alt="TONE3000"]').count(), 3)
  await shot('converted')

  // Removing asks first, with the keyboard on "Cancel"; saying no returns it to "Remove".
  const remove = page.getByRole('button', { name: 'Remove: Plexi Lead 100 - All sizes NAM.wav' })
  await remove.click()
  await page.waitForFunction(() => document.activeElement?.textContent === 'Cancel')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label')?.startsWith('Remove: Plexi Lead 100 - All sizes'))
  // Saying yes moves the .wav out of the folder and out of the credits.
  await remove.click()
  await page.getByRole('button', { name: 'Move to trash' }).click()
  await page.locator('.rows .row', { hasText: 'Plexi Lead 100 - All sizes NAM.wav' }).waitFor({ state: 'detached' })
  await page.locator('.sr-only[role="status"]', { hasText: 'Removed: Plexi Lead 100 - All sizes NAM.wav' }).waitFor({ state: 'attached' })
  assert.equal(existsSync(join(outputDir, 'Plexi Lead 100 - All sizes NAM.wav')), false)
  assert.doesNotMatch(readFileSync(join(outputDir, 'TONE3000 credits.txt'), 'utf8'), /All sizes/)
  assert.equal(await focused(), 'main.content')

  await menu('Load on the HX Stomp').click()
  await page.getByRole('heading', { name: 'Load a capture and play' }).waitFor()
  await shot('guide')

  // Settings: language and theme apply at once.
  await menu('Settings').click()
  await shot('settings')
  await page.locator('#language').selectOption('pt-BR')
  await page.getByRole('heading', { name: 'Configurações' }).waitFor()
  await page.getByRole('button', { name: 'Claro' }).click()
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light')
  await page.waitForTimeout(250)
  await shot('settings-pt-light')
  await page.getByRole('button', { name: 'Tones', exact: true }).click()
  await page.getByRole('tab', { name: 'Favoritos' }).click()
  await page.locator('.tone-card .tone-title').first().waitFor()
  await page.waitForTimeout(250)
  await shot('tones-pt-light')

  // Zoomed to 200% (the default window, then the smallest one): the menu becomes
  // a rail and nothing runs off the side.
  for (const [width, height] of [
    [620, 420],
    [480, 320],
  ]) {
    await page.setViewportSize({ width, height })
    for (const name of ['Tones', 'Convertidos', 'Configurações']) {
      await page.getByRole('button', { name, exact: true }).click()
      await page.waitForTimeout(150)
      const fit = await page.evaluate(() => {
        const content = document.querySelector('.content')
        const menuBox = document.querySelector('.sidebar')
        return {
          rail: menuBox.getBoundingClientRect().width,
          sideways: content.scrollWidth - content.clientWidth,
          // Everything in the menu can be reached: it fits, or it scrolls.
          menuReachable: menuBox.scrollHeight <= menuBox.clientHeight + 1 || getComputedStyle(menuBox).overflowY === 'auto',
        }
      })
      assert.equal(fit.rail, 60, `${name} at ${width}px: the menu is a rail`)
      assert.ok(fit.sideways <= 1, `${name} at ${width}px runs ${fit.sideways}px off the side`)
      assert.ok(fit.menuReachable, `${name} at ${width}px: the menu is cut`)
    }
    if (width === 620) await shot('zoom-200')
  }
  await page.setViewportSize({ width: 1240, height: 840 })

  // Signing out goes back to the splash, under either entry.
  await page.getByRole('button', { name: 'Configurações' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await page.getByRole('button', { name: 'Tones', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar' }).waitFor()
  await menu('TONE3000').click()
  await page.getByRole('button', { name: 'Continuar' }).waitFor()
  await selected.locator('img[alt="TONE3000"]').waitFor()
  assert.equal(await page.locator('main.stage').count(), 0)

  assert.deepEqual(errors, [], 'errors in the page')
  console.log(`ok: ${step} screens${shots ? `, screenshots in ${shots}` : ''}`)
} finally {
  await app.close()
  rmSync(work, { recursive: true, force: true })
}

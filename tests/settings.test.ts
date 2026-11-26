import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'

// What the app does with the HX Stomp before anyone has opened Settings, and
// that a choice made there is kept.

const work = mkdtempSync(join(tmpdir(), 'hx3k-settings-'))
let userData = join(work, 'fresh')

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: (name: string) => (name === 'userData' ? userData : join(work, name)) },
}))

afterAll(() => rmSync(work, { recursive: true, force: true }))

async function settingsIn(dir: string, saved?: object) {
  userData = join(work, dir)
  mkdirSync(userData, { recursive: true })
  if (saved) writeFileSync(join(userData, 'settings.json'), JSON.stringify(saved))
  vi.resetModules()
  return import('../src/main/settings')
}

describe('The settings for the HX Stomp', () => {
  it('point the NAM A2 Lite block at what is sent, and send nothing unasked', async () => {
    const { getSettings } = await settingsIn('fresh')
    expect(getSettings()).toMatchObject({ pointBlock: true, sendAfterConvert: false })
  })

  it('keep what an earlier version saved, and take the rest as new', async () => {
    const { getSettings } = await settingsIn('older', { theme: 'light', includeLevel: false })
    expect(getSettings()).toMatchObject({ theme: 'light', includeLevel: false, pointBlock: true, sendAfterConvert: false })
  })

  it('stay as they were set', async () => {
    const first = await settingsIn('chosen')
    first.updateSettings({ pointBlock: false, sendAfterConvert: true })
    const again = await settingsIn('chosen')
    expect(again.getSettings()).toMatchObject({ pointBlock: false, sendAfterConvert: true })
  })
})

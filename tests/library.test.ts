import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import type { ConversionInfo, ToneRef } from '../src/shared/types'

// Where the .wav files go and what is remembered about them, on a real
// (temporary) folder.

const work = mkdtempSync(join(tmpdir(), 'hxtra3000-library-'))
const outputDir = join(work, 'out')

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => join(work, 'user-data') },
  // The trash, for the test: the file is simply gone.
  shell: { trashItem: async (path: string) => rmSync(path) },
}))

vi.mock('../src/main/settings', () => ({ getSettings: () => ({ outputDir }) }))

const { CREDITS_FILE, listConversions, removeConversion, saveConversion } = await import('../src/main/library')

afterAll(() => rmSync(work, { recursive: true, force: true }))

const info: ConversionInfo = {
  name: 'n',
  modeledBy: '',
  gear: '',
  slimmable: false,
  exponent: 0,
  inputDbu: null,
  trimDb: null,
  loudness: null,
  loudDb: null,
}

const tone: ToneRef = {
  id: 9,
  title: 'Plexi',
  url: 'https://www.tone3000.com/tones/plexi-9',
  gear: 'amp',
  format: 'nam',
  license: 'cc-by-nc',
  image: null,
  creator: { username: 'maker', displayName: null, avatarUrl: null, url: 'https://www.tone3000.com/maker' },
}

const wav = (byte: number): Uint8Array => new Uint8Array(16).fill(byte)
const fromT3k = (modelId: number, name: string, byte = 1): Parameters<typeof saveConversion>[0] => ({
  baseName: `Plexi - ${name}`,
  wav: wav(byte),
  info,
  source: 'tone3000',
  sourceName: name,
  tone,
  model: { id: modelId, name, size: 'lite' },
})

describe('the converted captures', () => {
  it('writes the .wav, remembers where it came from and credits its creator', async () => {
    const record = await saveConversion(fromT3k(1, 'Gain 5'))
    expect(record.fileName).toBe('Plexi - Gain 5 NAM.wav')
    expect(readFileSync(record.filePath)).toEqual(Buffer.from(wav(1)))
    expect(listConversions()).toMatchObject([{ id: record.id, missing: false, tone: { id: 9 }, model: { id: 1 } }])

    const credits = readFileSync(join(outputDir, CREDITS_FILE), 'utf8')
    expect(credits).toContain('Plexi - Gain 5 NAM.wav')
    expect(credits).toContain('Creator: @maker (https://www.tone3000.com/maker)')
    expect(credits).toContain('License: cc-by-nc')
    expect(credits).toContain('Source:  https://www.tone3000.com/tones/plexi-9')
  })

  it('writes over its own file when the same model is converted again', async () => {
    const again = await saveConversion(fromT3k(1, 'Gain 5', 2))
    expect(again.fileName).toBe('Plexi - Gain 5 NAM.wav')
    expect(readFileSync(again.filePath)).toEqual(Buffer.from(wav(2)))
    expect(listConversions()).toHaveLength(1)
  })

  it("never writes over another capture's file of the same name", async () => {
    // Another model of the tone that happens to have the same name.
    const other = await saveConversion(fromT3k(2, 'Gain 5', 3))
    expect(other.fileName).toBe('Plexi - Gain 5 NAM (2).wav')
    // And a local file that would be named the same.
    const local = await saveConversion({ baseName: 'Plexi - Gain 5', wav: wav(4), info, source: 'local', sourceName: 'Plexi - Gain 5.nam' })
    expect(local.fileName).toBe('Plexi - Gain 5 NAM (3).wav')
    expect(readFileSync(join(outputDir, 'Plexi - Gain 5 NAM.wav'))).toEqual(Buffer.from(wav(2)))
    expect(listConversions().map((r) => r.fileName)).toEqual(['Plexi - Gain 5 NAM (3).wav', 'Plexi - Gain 5 NAM (2).wav', 'Plexi - Gain 5 NAM.wav'])
  })

  it('leaves local files out of the TONE3000 credits', () => {
    const credits = readFileSync(join(outputDir, CREDITS_FILE), 'utf8')
    expect(credits).toContain('Plexi - Gain 5 NAM (2).wav')
    expect(credits).not.toContain('Plexi - Gain 5 NAM (3).wav')
  })

  it('marks a capture whose .wav was deleted by hand', () => {
    rmSync(join(outputDir, 'Plexi - Gain 5 NAM (2).wav'))
    const gone = listConversions().find((r) => r.fileName === 'Plexi - Gain 5 NAM (2).wav')
    expect(gone?.missing).toBe(true)
  })

  it('removes a capture: the file to the trash, the record and the credit gone', async () => {
    const [local, missing, first] = listConversions()
    await removeConversion(missing.id)
    const left = await removeConversion(first.id)
    expect(left.map((r) => r.id)).toEqual([local.id])
    expect(existsSync(first.filePath)).toBe(false)
    // No TONE3000 capture is left in the folder, so no credits file either.
    expect(readdirSync(outputDir)).toEqual(['Plexi - Gain 5 NAM (3).wav'])
  })
})

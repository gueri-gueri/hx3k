import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { convertNam } from '../src/main/convert'
import { HxError } from '../src/main/hx/errors'
import { type ImpulseEntry, impulseHash, wavSamples } from '../src/main/hx/impulse'
import { NAM_MODEL_KNOB, presetBlocks } from '../src/main/hx/preset'
import { sampleNam } from '../src/main/sampleNam'
import type { ConversionInfo } from '../src/shared/types'
import { EDITOR, FAST, type FakeStomp, capture, presetBlob, unit } from './fakeStomp'

// Sending a converted capture to the unit: which slot it goes to, what is
// remembered about it, and what the user is told when it cannot go.

const work = mkdtempSync(join(tmpdir(), 'hx3k-device-'))
const outputDir = join(work, 'out')

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => join(work, 'user-data') },
  shell: { trashItem: async (path: string) => rmSync(path) },
}))
const settings = vi.hoisted(() => ({ pointBlock: false }))
vi.mock('../src/main/settings', () => ({ getSettings: () => ({ outputDir, ...settings }) }))

const { chooseSlot, sendToDevice, useDevicePort } = await import('../src/main/device')
const { listConversions, saveConversion } = await import('../src/main/library')

afterAll(() => rmSync(work, { recursive: true, force: true }))

const info: ConversionInfo = { name: 'n', modeledBy: '', gear: '', slimmable: false, exponent: 0, inputDbu: null, trimDb: null, loudness: null, loudDb: null }
const wav = (seed: number): Uint8Array => convertNam(sampleNam({ seed }), { includeLevel: true, includeLoudness: true }).wav
const converted = (name: string, seed: number) => saveConversion({ baseName: name, wav: wav(seed), info, source: 'local', sourceName: `${name}.nam` })
const entry = (index: number, hash: string): ImpulseEntry => ({ index, name: 'x', hash })

describe('The slot a capture goes to', () => {
  it('is where the unit already has it', () => {
    expect(chooseSlot([entry(0, 'a'), entry(7, 'b')], 'b')).toEqual({ index: 7, already: true })
  })

  it('is the first free one for a capture never sent', () => {
    expect(chooseSlot([], 'a')).toEqual({ index: 0, already: false })
    expect(chooseSlot([entry(0, 'x'), entry(1, 'y'), entry(3, 'z')], 'a')).toEqual({ index: 2, already: false })
  })

  it('is its earlier slot while that slot is empty or still holds what was sent', () => {
    const earlier = { slot: 6, hash: 'old', sentAt: '' }
    expect(chooseSlot([entry(0, 'x')], 'new', earlier)).toEqual({ index: 5, already: false })
    expect(chooseSlot([entry(0, 'x'), entry(5, 'old')], 'new', earlier)).toEqual({ index: 5, already: false })
  })

  it('is never a slot that now holds something else', () => {
    const earlier = { slot: 1, hash: 'old', sentAt: '' }
    expect(chooseSlot([entry(0, 'theirs')], 'new', earlier)).toEqual({ index: 1, already: false })
  })

  it('is none when all 128 are taken', () => {
    expect(chooseSlot(Array.from({ length: 128 }, (_, i) => entry(i, `h${i}`)), 'a')).toBeNull()
  })
})

describe('Sending a capture to the unit', () => {
  let fake: FakeStomp
  beforeEach(() => {
    fake = unit()
    useDevicePort(() => fake, FAST)
    settings.pointBlock = false
  })
  const model = (): unknown => presetBlocks(fake.preset).find((b) => b.modelId === 555)?.values[NAM_MODEL_KNOB]

  it('leaves the preset on the unit alone unless Settings asks', async () => {
    const record = await converted('Not pointed', 30)
    expect((await sendToDevice(record.id)).block).toBeUndefined()
    expect(model()).toBe(5)
  })

  it('points the NAM A2 Lite block at the slot when Settings asks, also for a capture already there', async () => {
    settings.pointBlock = true
    fake.slots.set(0, { name: 'Theirs NAM', data: capture(9) })
    const record = await converted('Pointed', 31)
    expect(await sendToDevice(record.id)).toMatchObject({ slot: 2, already: false, block: 'set' })
    expect(model()).toBe(2)
    expect(fake.did).toEqual(['lock', 'set', 'unlock', 'preset'])
    expect(await sendToDevice(record.id)).toMatchObject({ slot: 2, already: true, block: 'already' })
    fake.preset = presetBlob([7])
    expect(await sendToDevice(record.id)).toMatchObject({ slot: 2, already: true, block: 'set' })
    expect(model()).toBe(2)
  })

  it('still sends the capture when the block cannot be pointed, and says which', async () => {
    settings.pointBlock = true
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    fake.preset = presetBlob([])
    const none = await converted('No block', 32)
    expect(await sendToDevice(none.id)).toMatchObject({ slot: 1, block: 'none' })
    fake.preset = presetBlob([1, 1])
    expect(await sendToDevice(none.id)).toMatchObject({ slot: 1, already: true, block: 'several' })
    fake.preset = presetBlob([9])
    const editor = fake.handlers.get(EDITOR)
    fake.handlers.set(EDITOR, (command, params) => (command === 0x15 ? { status: 255 } : editor?.(command, params)) as never)
    expect(await sendToDevice(none.id)).toMatchObject({ slot: 1, already: true, block: 'failed' })
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('puts it in the first free slot, under its file name, and remembers the slot', async () => {
    fake.slots.set(0, { name: 'Theirs NAM', data: capture(9) })
    const record = await converted('Plexi - Crunch', 11)
    const sent = await sendToDevice(record.id)
    expect(sent).toMatchObject({ slot: 2, already: false })
    expect(sent.record.device).toMatchObject({ slot: 2, hash: impulseHash(wavSamples(wav(11))) })
    expect(fake.slots.get(1)).toEqual({ name: 'Plexi - Crunch NAM', data: wavSamples(wav(11)) })
    expect(listConversions().find((r) => r.id === record.id)?.device?.slot).toBe(2)
    expect(fake.closed).toBe(true)
    expect(fake.problems).toEqual([])
  })

  it('writes nothing when the unit already has it, wherever it is', async () => {
    const record = await converted('Already there', 12)
    fake.slots.set(40, { name: 'Renamed in HX Edit', data: wavSamples(wav(12)) })
    expect(await sendToDevice(record.id)).toMatchObject({ slot: 41, already: true })
    expect(fake.did).toEqual([])
  })

  it('sends a capture converted again back to its own slot', async () => {
    const first = await converted('Twice', 13)
    fake.slots.set(0, { name: 'Theirs NAM', data: capture(9) })
    expect((await sendToDevice(first.id)).slot).toBe(2)
    writeFileSync(first.filePath, wav(14))
    const again = await sendToDevice(first.id)
    expect(again).toMatchObject({ slot: 2, already: false })
    expect(fake.slots.get(1)?.data).toEqual(wavSamples(wav(14)))
    expect(fake.slots.size).toBe(2)
  })

  it('keeps the slot of a capture that is converted again', async () => {
    const first = await converted('Kept', 15)
    await sendToDevice(first.id)
    const second = await converted('Kept', 16)
    expect(second.id).toBe(first.id)
    expect(second.device?.slot).toBe(1)
  })

  it('says when no slot is free, and leaves the unit as it was', async () => {
    for (let i = 0; i < 128; i++) fake.slots.set(i, { name: `IR ${i}`, data: capture(1) })
    fake.slots.forEach((slot, i) => (slot.data = Uint8Array.from(slot.data, (b, at) => (at === 4 ? i : b))))
    const record = await converted('No room', 17)
    await expect(sendToDevice(record.id)).rejects.toMatchObject({ code: 'device_full' })
    expect(fake.did).toEqual([])
  })

  it('tells apart no unit, a unit someone else holds, and a unit that fails', async () => {
    const record = await converted('Errors', 18)
    useDevicePort(() => {
      throw new HxError('not_found', 'none')
    }, FAST)
    await expect(sendToDevice(record.id)).rejects.toMatchObject({ code: 'device_not_found' })
    useDevicePort(() => {
      throw new HxError('busy', 'held')
    }, FAST)
    await expect(sendToDevice(record.id)).rejects.toMatchObject({ code: process.platform === 'win32' ? 'device_unsupported' : 'device_busy' })
    const silent = unit()
    silent.ignoreSyns = 99
    useDevicePort(() => silent, { ...FAST, timeoutMs: 20 })
    await expect(sendToDevice(record.id)).rejects.toMatchObject({ code: 'device_failed' })
    expect(silent.closed).toBe(true)
  })

  it('refuses a file that is not a converted capture, and one that is gone', async () => {
    const record = await converted('Broken', 19)
    writeFileSync(record.filePath, 'not a wav')
    await expect(sendToDevice(record.id)).rejects.toMatchObject({ code: 'device_failed', message: expect.stringContaining('not a capture') })
    rmSync(record.filePath)
    await expect(sendToDevice(record.id)).rejects.toMatchObject({ code: 'device_failed' })
    await expect(sendToDevice('no-such-id')).rejects.toMatchObject({ code: 'not_found' })
    expect(fake.heard).toEqual([])
  })

  it('takes one capture at a time', async () => {
    const a = await converted('First of two', 20)
    const b = await converted('Second of two', 21)
    const [one, two] = await Promise.all([sendToDevice(a.id), sendToDevice(b.id)])
    expect([one.slot, two.slot]).toEqual([1, 2])
  })
})

// Against a real HX Stomp, with the real USB port (npm run hx:probe). It writes
// nothing: the capture it sends is one the unit already holds, read back from it.
describe.skipIf(!process.env.HX3K_STOMP)('A real HX Stomp, through the app', () => {
  it('finds a capture the unit already has, and writes nothing', { timeout: 60_000 }, async () => {
    const { Stomp } = await import('../src/main/hx/stomp')
    const { openStomp } = await import('../src/main/hx/usb')
    const look = await Stomp.connect(openStomp())
    let before: ImpulseEntry[]
    let data: Uint8Array
    try {
      before = await look.impulses()
      expect(before.length, 'the unit holds at least one IR').toBeGreaterThan(0)
      data = await look.impulseData(before[0].index)
    } finally {
      await look.close()
    }

    const file = new Uint8Array(44 + data.length)
    file.set(wav(1).subarray(0, 44))
    file.set(data, 44)
    const record = await saveConversion({ baseName: 'Read back from the unit', wav: file, info, source: 'local', sourceName: 'unit.nam' })
    useDevicePort(async () => (await import('../src/main/hx/usb')).openStomp())
    const sent = await sendToDevice(record.id)
    console.log(`"${before[0].name}" is in slot ${sent.slot}; already there: ${sent.already}`)
    expect(sent).toMatchObject({ slot: before[0].index + 1, already: true })
    expect(sent.record.device).toMatchObject({ slot: before[0].index + 1, hash: before[0].hash })

    const after = await Stomp.connect(openStomp())
    try {
      expect(await after.impulses()).toEqual(before)
    } finally {
      await after.close()
    }
  })
})

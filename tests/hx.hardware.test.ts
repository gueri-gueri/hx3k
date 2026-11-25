import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { describe, expect, it } from 'vitest'
import { IMPULSE_SLOTS, impulseHash, wavSamples } from '../src/main/hx/impulse'
import { Stomp } from '../src/main/hx/stomp'
import { listStomps, openStomp } from '../src/main/hx/usb'

// Against a real HX Stomp, plugged in by USB with HX Edit closed. Skipped unless
// asked for.
//
//   npm run hx:probe
// only reads: nothing on the unit changes.
//
//   HX3K_WAV='/path/to/capture NAM.wav' npm run hx:import
// writes that capture into the first free User IR slot, or into slot HX3K_SLOT
// (1 to 128). It refuses a slot that is taken unless HX3K_REPLACE=1.

describe.skipIf(!process.env.HX3K_STOMP)('A real HX Stomp', () => {
  it('says which preset is loaded, the names of its setlist and the blocks being edited', { timeout: 30_000 }, async () => {
    console.log('found:', listStomps())
    const stomp = await Stomp.connect(openStomp())
    try {
      const current = await stomp.current()
      console.log('current preset:', current)
      expect(Number.isInteger(current.setlist)).toBe(true)
      expect(Number.isInteger(current.preset)).toBe(true)

      const names = await stomp.presets()
      console.log(`${names.length} presets in setlist ${current.setlist}; the first:`, names.slice(0, 6))
      expect(names.length).toBeGreaterThan(0)
      expect(names.find((n) => n.index === current.preset)?.name).toBe(current.name)

      const blob = await stomp.editBuffer()
      console.log(`edit buffer: ${blob.length} bytes`)
      console.table(await stomp.blocks())
      const impulses = await stomp.impulses()
      console.log(`${impulses.length} User IRs:`)
      console.table(impulses.map((i) => ({ slot: i.index + 1, name: i.name, hash: i.hash })))
      if (impulses.length) {
        const last = impulses[impulses.length - 1]
        expect(impulseHash(await stomp.impulseData(last.index))).toBe(last.hash)
      }
      console.log('notifications so far:', stomp.notifications)
    } finally {
      await stomp.close()
    }
  })
})

const WAV = process.env.HX3K_WAV

describe.skipIf(!process.env.HX3K_STOMP || !WAV)('A real HX Stomp, written to', () => {
  it('import: takes a capture into a User IR slot and gives it back the same', { timeout: 60_000 }, async () => {
    const path = WAV as string
    const data = wavSamples(new Uint8Array(readFileSync(path)))
    const name = basename(path).replace(/\.wav$/i, '')
    const stomp = await Stomp.connect(openStomp())
    try {
      const before = await stomp.impulses()
      const taken = new Set(before.map((i) => i.index))
      const asked = process.env.HX3K_SLOT ? Number(process.env.HX3K_SLOT) - 1 : undefined
      const index = asked ?? Array.from({ length: IMPULSE_SLOTS }, (_, i) => i).find((i) => !taken.has(i))
      if (index === undefined || !Number.isInteger(index)) throw new Error('No free slot, and none was asked for.')
      if (taken.has(index) && !process.env.HX3K_REPLACE) {
        throw new Error(`Slot ${index + 1} holds "${before.find((i) => i.index === index)?.name}". Set HX3K_REPLACE=1 to write over it.`)
      }
      console.log(`writing "${name}" (${impulseHash(data)}) to slot ${index + 1}`)
      const stored = await stomp.storeImpulse(index, name, data)
      console.log('the unit lists it as', stored)
      console.log('notifications during the write:', stomp.notes)
      expect(await stomp.impulseData(index)).toEqual(data)
      const after = await stomp.impulses()
      expect(after.filter((i) => i.index !== index)).toEqual(before.filter((i) => i.index !== index))
      console.log(`Set the NAM A2 Lite block's Model to ${index + 1}.`)
    } finally {
      await stomp.close()
    }
  })
})

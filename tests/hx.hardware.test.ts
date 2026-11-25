import { describe, expect, it } from 'vitest'
import { Stomp } from '../src/main/hx/stomp'
import { listStomps, openStomp } from '../src/main/hx/usb'

// Against a real HX Stomp, plugged in by USB with HX Edit closed. It only reads:
// nothing on the unit changes. Skipped unless asked for:
//   npm run hx:probe

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
      console.log('notifications so far:', stomp.notifications)
    } finally {
      await stomp.close()
    }
  })
})

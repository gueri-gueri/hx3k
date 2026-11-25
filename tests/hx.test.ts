import { afterEach, describe, expect, it, vi } from 'vitest'
import { Channel } from '../src/main/hx/channel'
import { convertNam } from '../src/main/convert'
import { HxError } from '../src/main/hx/errors'
import { IMPULSE_BYTES, impulseChecksum, impulseHash, impulseName, storeParams, wavSamples } from '../src/main/hx/impulse'
import { Link, sleep } from '../src/main/hx/link'
import { type Packable, pack, text, unpack } from '../src/main/hx/msgpack'
import { presetBlocks } from '../src/main/hx/preset'
import { Stomp } from '../src/main/hx/stomp'
import { sampleNam } from '../src/main/sampleNam'
import { F_DATA, F_HEARTBEATS, F_SYN, F_WIN, decodeTransfer, encodePacket } from '../src/main/hx/wire'
import { EDITOR, FAST, LIBRARIAN, capture, concat, librarian, name16, presetBlob, unit } from './fakeStomp'

vi.mock('electron', () => ({}))

// The HX Stomp's USB protocol against a stand-in for the unit: what the host
// puts on the wire, and that it keeps to the unit's rules (sequence numbers,
// windows, heartbeats, one packet per transfer).

const hex = (bytes: Uint8Array): string => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ')
const bytes = (text: string): Uint8Array => Uint8Array.from(text.split(/\s+/).filter(Boolean), (b) => parseInt(b, 16))

describe('MessagePack', () => {
  it('packs a request as HX Edit does, with the parameters last', () => {
    const request = new Map<Packable, Packable>([
      [0x66, 1],
      [0x64, 0x17],
      [0x65, null],
    ])
    expect(hex(pack(request))).toBe('83 66 01 64 17 65 c0')
    expect(hex(pack(new Map<Packable, Packable>([[0x65, new Map([[0x6b, 2]])]])))).toBe('81 65 81 6b 02')
  })

  it('packs whole numbers in their shortest form', () => {
    const cases: [number, string][] = [
      [0, '00'],
      [127, '7f'],
      [128, 'cc 80'],
      [256, 'cd 01 00'],
      [65536, 'ce 00 01 00 00'],
      [-1, 'ff'],
      [-32, 'e0'],
      [-33, 'd0 df'],
      [-129, 'd1 ff 7f'],
      [-32769, 'd2 ff ff 7f ff'],
    ]
    for (const [n, expected] of cases) expect(hex(pack(n)), String(n)).toBe(expected)
    expect(() => pack(0.5)).toThrow(HxError)
  })

  it('packs bytes as a str, and never as a str 8', () => {
    expect(hex(pack(Uint8Array.of(1, 2)))).toBe('a2 01 02')
    expect(hex(pack(new Uint8Array(32)).subarray(0, 3))).toBe('da 00 20')
    expect(hex(pack('ab'))).toBe('a2 61 62')
  })

  it('reads a str as bytes, and every number type', () => {
    expect(unpack(bytes('a3 41 00 42'))).toEqual(Uint8Array.of(0x41, 0, 0x42))
    expect(unpack(bytes('d9 02 41 42'))).toEqual(Uint8Array.of(0x41, 0x42))
    expect(unpack(bytes('c4 01 ff'))).toEqual(Uint8Array.of(0xff))
    expect(unpack(bytes('ca 3f 00 00 00'))).toBe(0.5)
    expect(unpack(bytes('cb 3f e0 00 00 00 00 00 00'))).toBe(0.5)
    expect(unpack(bytes('cd 01 02'))).toBe(0x102)
    expect(unpack(bytes('d1 ff 7f'))).toBe(-129)
    expect(unpack(bytes('cf 00 00 00 01 00 00 00 00'))).toBe(2 ** 32)
    expect(unpack(bytes('cf ff ff ff ff ff ff ff ff'))).toBe(2n ** 64n - 1n)
    expect(unpack(bytes('93 c0 c2 c3'))).toEqual([null, false, true])
    expect(unpack(bytes('81 6d a1 41'))).toEqual(new Map([[0x6d, Uint8Array.of(0x41)]]))
  })

  it('refuses what ends too soon or goes on too long', () => {
    expect(() => unpack(bytes('cd 01'))).toThrow(HxError)
    expect(() => unpack(bytes('92 01'))).toThrow(HxError)
    expect(() => unpack(bytes('01 02'))).toThrow(HxError)
    expect(() => unpack(bytes('c1'))).toThrow(HxError)
  })

  it('reads a name up to its first NUL', () => {
    expect(text(name16('Clean NAM'))).toBe('Clean NAM')
    expect(text(null)).toBe('')
  })
})

describe('Packets', () => {
  it('opens a stream as HX Edit does', () => {
    const syn = encodePacket({ source: 0x1000, destination: 0x03ed, flags: F_SYN | F_HEARTBEATS, seq: 1, window: 0x1000, mtu: 512 })
    expect(hex(syn)).toBe('0c 00 00 28 00 10 ed 03 00 00 00 02 00 01 00 21 00 10 00 00')
  })

  it('pads a packet to a multiple of 4', () => {
    const select = encodePacket({ source: 0x1001, destination: 0x03ef, flags: F_DATA, seq: 2, window: 0x1000, mtu: 512, data: bytes('00 00 03 00 01 00 00 00 03') })
    expect(hex(select)).toBe('11 00 00 18 01 10 ef 03 00 02 00 04 00 10 00 00 00 00 03 00 01 00 00 00 03 00 00 00')
  })

  it('reads every packet of a transfer', () => {
    const syn = encodePacket({ source: 0x03ed, destination: 0x1000, flags: F_SYN, seq: 1, window: 0x200, mtu: 0x200 })
    const data = encodePacket({ source: 0x03ed, destination: 0x1000, flags: F_DATA, seq: 2, window: 0x209, mtu: 0, data: Uint8Array.of(1, 2, 3, 4, 5) })
    const other = bytes('04 00 00 18 00 00 00 00 aa bb cc dd')
    const [a, b, c] = decodeTransfer(concat(syn, data, other))
    expect(a).toMatchObject({ source: 0x03ed, destination: 0x1000, flags: F_SYN, seq: 1, window: 0x200, mtu: 0x200 })
    expect(b).toMatchObject({ flags: F_DATA, seq: 2, window: 0x209, data: Uint8Array.of(1, 2, 3, 4, 5) })
    expect(c.flags).toBeNull()
    expect(() => decodeTransfer(data.subarray(0, 12))).toThrow(HxError)
  })
})

describe('A session with the unit', () => {
  let stomp: Stomp | null = null
  afterEach(async () => {
    await stomp?.close().catch(() => undefined)
    stomp = null
  })

  it('opens the editor and notify streams as HX Edit does', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    const [first, second] = fake.heard
    expect(first).toMatchObject({ source: 0x1000, destination: 0x03ed, flags: F_SYN | F_HEARTBEATS, seq: 1, window: 0x1000, mtu: 512 })
    expect(second).toMatchObject({ flags: F_DATA, seq: 2 })
    expect(hex(second.data)).toBe('01 00 06 00 01 00 00 00 06')
    expect(fake.stream(0x1000)?.service).toBe(6)
    expect(fake.stream(0x1002)?.service).toBe(4)
    expect(fake.problems).toEqual([])
  })

  it('reads which preset is loaded', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    expect(await stomp.current()).toEqual({ setlist: 1, preset: 2, name: 'Clean NAM' })
    expect(fake.requests).toEqual([{ service: 6, command: 0x17, params: null }])
    expect(fake.problems).toEqual([])
  })

  it('reads the names of a setlist, in order, from the librarian', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    const names = await stomp.presets()
    expect(names).toHaveLength(126)
    expect(names[0]).toEqual({ index: 0, name: 'S1 P0' })
    expect(names[125]).toEqual({ index: 125, name: 'S1 P125' })
    expect((await stomp.presets(3))[7].name).toBe('S3 P7')
    expect(fake.stream(0x1001)?.service).toBe(2)
    expect(fake.requests.filter((r) => r.service === 2).map((r) => r.params)).toEqual([new Map([[0x6b, 1]]), new Map([[0x6b, 3]])])
    expect(fake.problems).toEqual([])
  })

  it('reads the blocks of the preset being edited', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    expect(await stomp.blocks()).toEqual([
      { path: 'A', position: 1, modelId: 147, enabled: true, values: [5, 3, true] },
      { path: 'B', position: 0, modelId: 301, enabled: false, values: [1] },
    ])
    expect(presetBlocks(presetBlob())).toHaveLength(2)
    expect(() => presetBlocks(pack('nope'))).toThrow(HxError)
  })

  it('takes an answer larger than its window, telling the unit when to go on', async () => {
    const fake = unit()
    const large = Uint8Array.from({ length: 20_000 }, (_, i) => i % 251)
    fake.handlers.set(EDITOR, () => ({ result: large }))
    stomp = await Stomp.connect(fake, FAST)
    expect(await stomp.editBuffer()).toEqual(large)
    expect(fake.heard.filter((p) => p.flags === F_WIN).length).toBeGreaterThan(15)
    expect(fake.problems).toEqual([])
  })

  it("waits for the unit's window before sending more", async () => {
    const fake = unit()
    const link = new Link(fake, { purgeMs: 0, heartbeatMs: 1000, timeoutMs: 300, lingerMs: 0, checkMs: 5 })
    await link.open()
    const channel = await Channel.open(link, { local: 0x1000, remote: 0x03ed, service: 6 })
    fake.handlers.set(EDITOR, (_command, params) => ({ result: (params as Uint8Array).length }))
    expect(await channel.request(0x7a, new Uint8Array(3000))).toBe(3000)
    for (let i = 0; i < 80; i++) expect(await channel.request(0x7a, Uint8Array.of(i))).toBe(1)
    await channel.close()
    await link.close()
    expect(fake.problems).toEqual([])
  })

  it('keeps reading notifications while a request is answered', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    fake.notifyNext.push(new Map([[0x70, 1]]), new Map([[0x70, 2]]))
    expect((await stomp.current()).preset).toBe(2)
    await sleep(5)
    expect(stomp.notifications).toBe(2)
    expect(fake.problems).toEqual([])
  })

  it('sends heartbeats on every open stream', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, { ...FAST, heartbeatMs: 30 })
    await sleep(160)
    expect(fake.stream(0x1000)?.heartbeats).toBeGreaterThanOrEqual(2)
    expect(fake.stream(0x1002)?.heartbeats).toBeGreaterThanOrEqual(2)
    expect((await stomp.current()).name).toBe('Clean NAM')
    expect(fake.problems).toEqual([])
  })

  it('opens a stream again while the unit still holds an earlier one', async () => {
    const fake = unit()
    fake.ignoreSyns = 2
    stomp = await Stomp.connect(fake, { ...FAST, timeoutMs: 40 })
    expect(fake.heard.filter((p) => p.source === 0x1000 && p.flags === (F_SYN | F_HEARTBEATS))).toHaveLength(3)
    expect((await stomp.current()).preset).toBe(2)
    expect(fake.problems).toEqual([])
  })

  it('gives up, and lets go of the unit, when no stream opens', async () => {
    const fake = unit()
    fake.ignoreSyns = 99
    await expect(Stomp.connect(fake, { ...FAST, timeoutMs: 20 })).rejects.toMatchObject({ code: 'timeout' })
    expect(fake.heard.filter((p) => p.flags === (F_SYN | F_HEARTBEATS))).toHaveLength(4)
    expect(fake.closed).toBe(true)
  })

  it('reports a command the unit refuses, and one it never answers', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, { ...FAST, timeoutMs: 40 })
    fake.handlers.set(EDITOR, () => ({ status: 255, result: new Map([[0x6f, 7]]) }))
    await expect(stomp.current()).rejects.toMatchObject({ code: 'refused', message: expect.stringContaining('error 7') })
    fake.handlers.set(EDITOR, () => null)
    await expect(stomp.current()).rejects.toMatchObject({ code: 'timeout' })
  })

  it('fails what is waiting when the unit ends the stream or is unplugged', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    fake.handlers.set(EDITOR, () => null)
    const waiting = stomp.current()
    await sleep(5)
    fake.hangUp(0x1000)
    await expect(waiting).rejects.toMatchObject({ code: 'refused' })

    const other = unit()
    const second = await Stomp.connect(other, FAST)
    other.handlers.set(EDITOR, () => null)
    const pending = second.current()
    await sleep(5)
    other.gone(new Error('unplugged'))
    await expect(pending).rejects.toMatchObject({ code: 'closed' })
    await second.close()
    expect(other.closed).toBe(true)
  })

  it('closes every stream before it lets go of the unit', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    await stomp.presets()
    await stomp.close()
    expect(fake.fins).toBe(3)
    expect(fake.closed).toBe(true)
    await expect(stomp.current()).rejects.toMatchObject({ code: 'closed' })
    expect(fake.problems).toEqual([])
    stomp = null
  })
})

describe('A capture as a User IR', () => {
  it('takes the samples of a .wav the app converted, and no other .wav', () => {
    const { wav } = convertNam(sampleNam(), { includeLevel: true, includeLoudness: true })
    const data = wavSamples(wav)
    expect(data).toHaveLength(IMPULSE_BYTES)
    expect(hex(data.subarray(0, 12))).toBe('00 00 00 3f 00 00 00 bf 00 00 40 40')
    const changed = (at: number, value: number, size: 2 | 4 = 2): Uint8Array => {
      const copy = wav.slice()
      const view = new DataView(copy.buffer)
      if (size === 2) view.setUint16(at, value, true)
      else view.setUint32(at, value, true)
      return copy
    }
    const refused: [string, Uint8Array][] = [
      ['not a wav', pack('nope')],
      ['16-bit', changed(34, 16)],
      ['whole numbers', changed(20, 1)],
      ['stereo', changed(22, 2)],
      ['44.1 kHz', changed(24, 44100, 4)],
      ['shorter', wav.slice(0, wav.length - 4)],
      ['no silence at the end', changed(wav.length - 4, 0x3f000000, 4)],
      ['too loud', changed(44 + 40, 0x41800000, 4)],
      ['not a number', changed(44 + 40, 0x7fc00000, 4)],
    ]
    for (const [why, bad] of refused) expect(() => wavSamples(bad), why).toThrow(HxError)
  })

  it('names it as HX Edit would', () => {
    expect(impulseName('Clean - Edge of Breakup NAM')).toBe('Clean - Edge of Breakup NAM')
    expect(impulseName('a;b[c]{d}|e\\f~g`h<i>')).toBe('a?b?c??d??e?f?g?h?i?')
    expect(impulseName('Ação é ótima')).toBe('A??o ? ?tima')
    expect(impulseName('x'.repeat(80))).toHaveLength(63)
  })

  it('packs the write key for key as HX Edit does', () => {
    const data = new Uint8Array(IMPULSE_BYTES)
    data.set(bytes('00 00 00 3f 00 00 00 bf'))
    expect(impulseChecksum(data)).toBe(0xfe000000)
    const sent = pack(storeParams(5, 'A;b NAM', data))
    expect(hex(sent.subarray(0, 44))).toBe(
      '89 70 05 71 d2 fe 00 00 00 6d a8 41 3f 62 20 4e 41 4d 00 72 01 73 03 7b c2 7c c2 7d 00 6e da 20 00 00 00 00 3f 00 00 00 bf 00 00 00',
    )
    expect(sent).toHaveLength(33 + IMPULSE_BYTES)
    data.set(bytes('00 00 00 3f 00 00 00 00'))
    expect(hex(pack(storeParams(127, 'x'.repeat(40), data)).subarray(0, 12))).toBe('89 70 7f 71 ce 3f 00 00 00 6d da 00')
    expect(() => storeParams(128, 'x', data)).toThrow(HxError)
    expect(() => storeParams(0, 'x', data.subarray(4))).toThrow(HxError)
  })
})

describe('The User IRs of the unit', () => {
  let stomp: Stomp | null = null
  afterEach(async () => {
    await stomp?.close().catch(() => undefined)
    stomp = null
  })

  it('lists them by slot and reads their samples', async () => {
    const fake = unit()
    fake.slots.set(29, { name: 'Recto NAM', data: capture(2) })
    fake.slots.set(0, { name: 'Ampeg NAM', data: capture(1) })
    stomp = await Stomp.connect(fake, FAST)
    expect(await stomp.impulses()).toEqual([
      { index: 0, name: 'Ampeg NAM', hash: impulseHash(capture(1)) },
      { index: 29, name: 'Recto NAM', hash: impulseHash(capture(2)) },
    ])
    expect(await stomp.impulseData(29)).toEqual(capture(2))
    expect(fake.did).toEqual([])
    expect(fake.problems).toEqual([])
  })

  it('writes a capture into a slot with the screen locked, and finds it there', async () => {
    const fake = unit()
    fake.slots.set(0, { name: 'Ampeg NAM', data: capture(1) })
    stomp = await Stomp.connect(fake, FAST)
    const data = capture(3)
    expect(await stomp.storeImpulse(11, 'Matchless; Edge NAM', data)).toEqual({ index: 11, name: 'Matchless? Edge NAM', hash: impulseHash(data) })
    expect(fake.did).toEqual(['lock', 'set', 'unlock'])
    expect(fake.locked).toBe(false)
    expect(await stomp.impulseData(11)).toEqual(data)
    expect(fake.problems).toEqual([])
  })

  it('waits for a write the unit accepts and finishes later', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    const data = capture(4)
    fake.handlers.set(LIBRARIAN, (command, params) => {
      if (command !== 0x09) return librarian(fake, command, params)
      // It was accepted with the screen locked; the unit stores it after the host has unlocked.
      setTimeout(() => {
        fake.locked = true
        librarian(fake, command, params)
        fake.locked = false
      }, 30)
      return { status: 1 }
    })
    expect((await stomp.storeImpulse(127, 'Late NAM', data)).hash).toBe(impulseHash(data))
    expect(fake.problems).toEqual([])
  })

  it('unlocks the screen when the unit refuses the write, and says so', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    fake.handlers.set(LIBRARIAN, (command, params) => (command === 0x09 ? { status: 255, result: new Map([[0x6f, 3]]) } : librarian(fake, command, params)))
    await expect(stomp.storeImpulse(3, 'No NAM', capture())).rejects.toMatchObject({ code: 'refused' })
    expect(fake.did).toEqual(['lock', 'unlock'])
    expect(fake.slots.size).toBe(0)
  })

  it('says so when the unit takes the write and does not keep it', async () => {
    const fake = unit()
    stomp = await Stomp.connect(fake, FAST)
    fake.handlers.set(LIBRARIAN, (command, params) => (command === 0x09 ? { result: null } : librarian(fake, command, params)))
    await expect(stomp.storeImpulse(3, 'Lost NAM', capture())).rejects.toMatchObject({ code: 'refused', message: expect.stringContaining('slot 4') })
    expect(fake.did).toEqual(['lock', 'unlock'])
  })

  it('does not write to a unit that describes its IRs another way', async () => {
    const fake = unit()
    fake.slots.set(0, { name: 'Ampeg NAM', data: capture(1) })
    stomp = await Stomp.connect(fake, FAST)
    fake.handlers.set(LIBRARIAN, (command, params) => {
      const answer = librarian(fake, command, params)
      if (command === 0x0c && answer?.result instanceof Map) answer.result.delete(0x7b)
      return answer
    })
    await expect(stomp.storeImpulse(3, 'Other NAM', capture())).rejects.toMatchObject({ code: 'protocol' })
    expect(fake.did).toEqual([])
  })

  it('passes over an answer that came late for an earlier request', async () => {
    const fake = unit()
    fake.lateReplies = true
    stomp = await Stomp.connect(fake, FAST)
    expect((await stomp.current()).name).toBe('Clean NAM')
    expect(await stomp.impulses()).toEqual([])
    expect(fake.problems).toEqual([])
  })
})

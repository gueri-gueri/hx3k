import { afterEach, describe, expect, it, vi } from 'vitest'
import { Channel } from '../src/main/hx/channel'
import { convertNam } from '../src/main/convert'
import { HxError } from '../src/main/hx/errors'
import { IMPULSE_BYTES, impulseChecksum, impulseHash, impulseName, storeParams, wavSamples } from '../src/main/hx/impulse'
import { Link, type Timing, type UsbPort, sleep } from '../src/main/hx/link'
import { type Packable, type Value, pack, text, unpack } from '../src/main/hx/msgpack'
import { presetBlocks } from '../src/main/hx/preset'
import { Stomp } from '../src/main/hx/stomp'
import { sampleNam } from '../src/main/sampleNam'
import { F_DATA, F_FIN, F_HEARTBEAT, F_HEARTBEATS, F_SYN, F_WIN, type Packet, decodeTransfer, encodePacket } from '../src/main/hx/wire'

vi.mock('electron', () => ({}))

// The HX Stomp's USB protocol against a stand-in for the unit: what the host
// puts on the wire, and that it keeps to the unit's rules (sequence numbers,
// windows, heartbeats, one packet per transfer).

const hex = (bytes: Uint8Array): string => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ')
const bytes = (text: string): Uint8Array => Uint8Array.from(text.split(/\s+/).filter(Boolean), (b) => parseInt(b, 16))
const concat = (...parts: Uint8Array[]): Uint8Array => Uint8Array.from(parts.flatMap((p) => [...p]))
const name16 = (name: string): Uint8Array => Uint8Array.from({ length: 16 }, (_, i) => name.charCodeAt(i) || 0)

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

// ---------------------------------------------------------------- the stand-in unit

const UNIT_BUFFER = 0x200
const UNIT_MTU = 0x200
const HOST_MTU = 512

type Answer = { status?: number; result?: Packable } | null
type Handler = (command: number, params: Value) => Answer

class UnitStream {
  txSeq = 1
  /** Bytes from the host: arrived, and read out of the stream's buffer. */
  taken = 0
  consumed = 0
  sent = 0
  hostEdge = 0
  heartbeats = 0
  service: number | null = null
  inbox: Uint8Array = new Uint8Array(0)
  outbox: Uint8Array = new Uint8Array(0)

  constructor(
    readonly host: number,
    readonly port: number,
    public rxSeq: number,
  ) {}
}

function message(service: number, body: Uint8Array): Uint8Array {
  const head = new Uint8Array(8)
  const view = new DataView(head.buffer)
  view.setUint16(2, service, true)
  view.setUint32(4, body.length, true)
  return concat(head, body)
}

/** The unit's side of the protocol, which notes every rule the host breaks. */
class FakeStomp implements UsbPort {
  readonly mtu = HOST_MTU
  readonly problems: string[] = []
  readonly heard: Packet[] = []
  readonly requests: { service: number; command: number; params: Value }[] = []
  readonly handlers = new Map<number, Handler>()
  /** Sent on the notify stream just before the next reply. */
  readonly notifyNext: Packable[] = []
  /** How many SYNs to leave unanswered, as the unit does while it still holds an earlier stream. */
  ignoreSyns = 0
  /** Before each reply, one more that answers the request before it: an answer that came late. */
  lateReplies = false
  /** The User IRs: what each slot holds. */
  readonly slots = new Map<number, { name: string; data: Uint8Array }>()
  /** What the librarian was asked to do to the IRs and the screen, in order. */
  readonly did: string[] = []
  locked = false
  fins = 0
  closed = false
  gone: (err: Error) => void = () => undefined
  private data: (bytes: Uint8Array) => void = () => undefined
  private readonly streams = new Map<number, UnitStream>()
  private pending: Uint8Array[] = []

  listen(data: (bytes: Uint8Array) => void, gone: (err: Error) => void): void {
    this.data = data
    this.gone = gone
  }

  async close(): Promise<void> {
    this.closed = true
  }

  async send(transfer: Uint8Array): Promise<void> {
    if (this.closed) throw new Error('closed')
    if (transfer.length % 4) this.problems.push('a transfer is not padded to 4')
    const packets = decodeTransfer(transfer)
    if (packets.length !== 1) this.problems.push('a transfer does not hold one packet')
    for (const packet of packets) this.take(packet)
    this.flush()
  }

  stream(host: number): UnitStream | undefined {
    return this.streams.get(host)
  }

  /** The unit ends a stream. */
  hangUp(host: number): void {
    const s = this.streams.get(host)
    if (!s) return
    this.emit(s, F_FIN)
    this.streams.delete(host)
    this.flush()
  }

  private take(p: Packet): void {
    this.heard.push(p)
    const flags = p.flags ?? 0
    if (flags & F_SYN) {
      if (p.seq !== 1) this.problems.push('a SYN does not carry seq 1')
      if (this.ignoreSyns > 0) {
        this.ignoreSyns--
        // The earlier stream is still alive on the unit's side.
        this.pending.push(encodePacket({ source: p.destination, destination: p.source, flags: F_HEARTBEAT, seq: 77, window: UNIT_BUFFER, mtu: 0 }))
        return
      }
      const s = new UnitStream(p.source, p.destination, p.seq)
      s.hostEdge = p.window
      this.streams.set(p.source, s)
      this.emit(s, F_SYN)
      return
    }
    const s = this.streams.get(p.source)
    if (!s) return
    if (((p.seq - s.rxSeq) & 0xff) !== 1) this.problems.push(`a packet is missing on stream 0x${p.source.toString(16)}`)
    s.rxSeq = p.seq
    s.hostEdge = p.window
    if (flags & F_HEARTBEAT) s.heartbeats++
    if (flags & F_FIN) {
      this.fins++
      this.streams.delete(p.source)
      return
    }
    if (flags & F_DATA) {
      if (p.data.length > UNIT_MTU - 16) this.problems.push('a packet is larger than the unit takes')
      s.taken += p.data.length
      if (s.taken > UNIT_BUFFER + s.consumed) this.problems.push('the host sent past the window')
      s.inbox = concat(s.inbox, p.data)
      // The unit reads its buffer a moment later, so the host can meet a closed window.
      setTimeout(() => {
        this.work(s)
        this.flush()
      }, 0)
    }
    this.pump(s)
  }

  private work(s: UnitStream): void {
    const before = s.consumed
    s.consumed = s.taken
    while (s.inbox.length >= 8) {
      const view = new DataView(s.inbox.buffer, s.inbox.byteOffset)
      const service = view.getUint16(2, true)
      const length = view.getUint32(4, true)
      if (s.inbox.length < 8 + length) break
      if (view.getUint16(0, true) !== 1) this.problems.push('a message is not marked as from the host')
      const body = s.inbox.slice(8, 8 + length)
      s.inbox = s.inbox.slice(8 + length)
      if (s.service === null) {
        if (length !== 1 || body[0] !== service) this.problems.push('the first message does not select a service')
        s.service = service
        s.outbox = concat(s.outbox, message(0, Uint8Array.of(service)))
        continue
      }
      const request = unpack(body)
      if (!(request instanceof Map) || [...request.keys()].join() !== '102,100,101') {
        this.problems.push('a request is not {seq, command, parameters} in that order')
        continue
      }
      const command = request.get(0x64) as number
      const params = request.get(0x65) ?? null
      this.requests.push({ service: s.service, command, params })
      const notify = this.streams.get(0x1002)
      for (const note of this.notifyNext.splice(0)) {
        if (!notify) continue
        notify.outbox = concat(notify.outbox, message(4, pack(note)))
        this.pump(notify)
      }
      const answer = this.handlers.get(s.service)?.(command, params)
      if (answer === null) continue
      if (this.lateReplies) {
        const late = new Map<Packable, Packable>([
          [0x66, ((request.get(0x66) as number) - 1) & 0xffff],
          [0x67, 0],
          [0x68, 'late'],
        ])
        s.outbox = concat(s.outbox, message(s.service, pack(late)))
      }
      const reply = new Map<Packable, Packable>([
        [0x66, request.get(0x66) as number],
        [0x67, answer?.status ?? (answer ? 0 : 255)],
        [0x68, answer ? (answer.result ?? null) : new Map([[0x6f, 1]])],
      ])
      s.outbox = concat(s.outbox, message(s.service, pack(reply)))
    }
    if (!this.pump(s) && s.consumed !== before) this.emit(s, F_WIN)
  }

  /** Sends what the host's window has room for. */
  private pump(s: UnitStream): number {
    let packets = 0
    while (s.outbox.length && s.sent < s.hostEdge) {
      const size = Math.min(s.outbox.length, HOST_MTU - 16, s.hostEdge - s.sent)
      this.emit(s, F_DATA, s.outbox.slice(0, size))
      s.outbox = s.outbox.slice(size)
      s.sent += size
      packets++
    }
    return packets
  }

  private emit(s: UnitStream, flags: number, data?: Uint8Array): void {
    this.pending.push(encodePacket({ source: s.port, destination: s.host, flags, seq: s.txSeq, window: UNIT_BUFFER + s.consumed, mtu: UNIT_MTU, data }))
    s.txSeq = (s.txSeq + 1) & 0xff
  }

  /** Hands the host what is waiting, several packets in a transfer when they fit. */
  private flush(): void {
    const transfers: Uint8Array[] = []
    let current: Uint8Array[] = []
    let size = 0
    for (const packet of this.pending.splice(0)) {
      if (current.length && size + packet.length > HOST_MTU) {
        transfers.push(concat(...current))
        current = []
        size = 0
      }
      current.push(packet)
      size += packet.length
    }
    if (current.length) transfers.push(concat(...current))
    queueMicrotask(() => {
      for (const transfer of transfers) this.data(transfer)
    })
  }
}

const FAST: Partial<Timing> = { purgeMs: 0, timeoutMs: 300, lingerMs: 0, checkMs: 5 }
const EDITOR = 6
const LIBRARIAN = 2

/** A preset with a NAM block (model 147, Model knob at slot 5) on path A and a delay on path B. */
function presetBlob(): Uint8Array {
  const empty = new Map<Packable, Packable>([
    [19, 8],
    [20, null],
  ])
  const block = (modelId: number, enabled: boolean, values: Packable[]): Map<Packable, Packable> =>
    new Map<Packable, Packable>([
      [19, 6],
      [
        20,
        new Map<Packable, Packable>([
          [24, new Map<Packable, Packable>([[25, modelId]])],
          [9, 17],
          [10, enabled],
          [11, new Map<Packable, Packable>([[4, values]])],
        ]),
      ],
    ])
  const places: Packable[] = Array.from({ length: 20 }, () => empty)
  places[2] = block(147, true, [5, 3, true])
  places[11] = block(301, false, [1])
  const sections = new Map<Packable, Packable>([
    [7, null],
    [0, new Map<Packable, Packable>([[22, places]])],
  ])
  return concat(pack('l6-helix\0'), pack(new Uint8Array(48)), pack(sections))
}

function unit(): FakeStomp {
  const fake = new FakeStomp()
  fake.handlers.set(EDITOR, (command) => {
    if (command === 0x17) {
      return {
        result: new Map<Packable, Packable>([
          [0x6b, 1],
          [0x6c, 2],
          [0x6d, name16('Clean NAM')],
          [0x75, false],
        ]),
      }
    }
    if (command === 0x16) return { result: concat(presetBlob(), new Uint8Array(0)) }
    return undefined as unknown as Answer
  })
  fake.handlers.set(LIBRARIAN, (command, params) => librarian(fake, command, params))
  return fake
}

const REFUSED = undefined as unknown as Answer
const cstring = (text: string): Uint8Array => Uint8Array.from({ length: text.length + 1 }, (_, i) => text.charCodeAt(i) || 0)
const keysOf = (params: Value): string => (params instanceof Map ? [...params.keys()].map((k) => (k as number).toString(16)).join(',') : 'none')

/** The librarian as the unit answers it: presets, and the User IRs with the screen lock around a write. */
function librarian(fake: FakeStomp, command: number, params: Value): Answer {
  if (!(params instanceof Map)) return REFUSED
  const marketplace: [Packable, Packable][] = [
    [0x7b, false],
    [0x7c, false],
    [0x7d, 0],
  ]
  const index = params.get(0x70) as number
  const slot = fake.slots.get(index)
  switch (command) {
    case 0x01: {
      const setlist = params.get(0x6b) as number
      return { result: Array.from({ length: 126 }, (_, i) => new Map<Packable, Packable>([[125 - i, new Map<Packable, Packable>([[0x6d, name16(`S${setlist} P${125 - i}`)]])]])) }
    }
    case 0x0d:
      if (keysOf(params) !== '65' || params.get(0x65) !== 2) return REFUSED
      return {
        result: [...fake.slots].reverse().map(
          ([i, s]) =>
            new Map<Packable, Packable>([[0x70, i], [0x6d, cstring(s.name)], ...marketplace, [0x68, impulseHash(s.data)]]),
        ),
      }
    case 0x0c:
      if (keysOf(params) !== '70' || !slot) return REFUSED
      return { result: new Map<Packable, Packable>([[0x70, index], [0x71, impulseChecksum(slot.data)], [0x6d, cstring(slot.name)], [0x72, 1], [0x73, 3], ...marketplace]) }
    case 0x0b:
      if (keysOf(params) !== '70,65' || !slot) return REFUSED
      return { result: slot.data }
    case 0xff:
    case 0xfe:
      if (params.size) return REFUSED
      fake.locked = command === 0xff
      fake.did.push(command === 0xff ? 'lock' : 'unlock')
      return { result: null }
    case 0x09: {
      fake.did.push('set')
      const name = params.get(0x6d)
      const data = params.get(0x6e)
      const sound =
        fake.locked &&
        keysOf(params) === '70,71,6d,72,73,7b,7c,7d,6e' &&
        name instanceof Uint8Array &&
        name[name.length - 1] === 0 &&
        data instanceof Uint8Array &&
        data.length === IMPULSE_BYTES &&
        (params.get(0x71) as number) >>> 0 === impulseChecksum(data) &&
        params.get(0x72) === 1 &&
        params.get(0x73) === 3 &&
        params.get(0x7b) === false
      if (!sound) return REFUSED
      fake.slots.set(index, { name: String.fromCharCode(...(name as Uint8Array).subarray(0, -1)), data: data as Uint8Array })
      return { result: null }
    }
    default:
      return REFUSED
  }
}

/** A capture converted by the app itself. */
const capture = (seed = 1): Uint8Array => wavSamples(convertNam(sampleNam({ seed }), { includeLevel: true, includeLoudness: true }).wav)

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

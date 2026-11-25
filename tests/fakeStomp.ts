// A stand-in for the HX Stomp, for the tests: the unit's side of the USB
// protocol, which notes every rule the host breaks, with presets and User IRs
// behind its editor and librarian.

import { convertNam } from '../src/main/convert'
import { IMPULSE_BYTES, impulseChecksum, impulseHash, wavSamples } from '../src/main/hx/impulse'
import type { Timing, UsbPort } from '../src/main/hx/link'
import { type Packable, type Value, pack, unpack } from '../src/main/hx/msgpack'
import { sampleNam } from '../src/main/sampleNam'
import { F_DATA, F_FIN, F_HEARTBEAT, F_SYN, F_WIN, type Packet, decodeTransfer, encodePacket } from '../src/main/hx/wire'

export const concat = (...parts: Uint8Array[]): Uint8Array => Uint8Array.from(parts.flatMap((p) => [...p]))
export const name16 = (name: string): Uint8Array => Uint8Array.from({ length: 16 }, (_, i) => name.charCodeAt(i) || 0)

const UNIT_BUFFER = 0x200
const UNIT_MTU = 0x200
const HOST_MTU = 512

export type Answer = { status?: number; result?: Packable } | null
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
export class FakeStomp implements UsbPort {
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

  /** A session opens. The same unit can be opened again once the last session let go of it. */
  listen(data: (bytes: Uint8Array) => void, gone: (err: Error) => void): void {
    this.data = data
    this.gone = gone
    this.closed = false
    this.streams.clear()
    this.pending = []
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

export const FAST: Partial<Timing> = { purgeMs: 0, timeoutMs: 300, lingerMs: 0, checkMs: 5 }
export const EDITOR = 6
export const LIBRARIAN = 2

/** A preset with a NAM block (model 147, Model knob at slot 5) on path A and a delay on path B. */
export function presetBlob(): Uint8Array {
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

export function unit(): FakeStomp {
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
export function librarian(fake: FakeStomp, command: number, params: Value): Answer {
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
export const capture = (seed = 1): Uint8Array => wavSamples(convertNam(sampleNam({ seed }), { includeLevel: true, includeLoudness: true }).wav)

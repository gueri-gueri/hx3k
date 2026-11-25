// The streams that carry the HX Stomp's services over its message interface.
//
// HX Edit keeps three open at once (editor, librarian, notify), all on the same
// pair of USB endpoints. So one Link reads the IN endpoint and hands each packet
// to the stream it is for, and every open stream keeps its own heartbeat: a
// notification that arrived while another stream waited for its reply would
// otherwise be lost, and the unit's sender would then stall on its window.
//
// Follows HXtra's tools/hx_dfu_reboot.py (Stream) and tools/hx_ctl.py (the
// routing), which were checked on the unit.

import { HxError } from './errors'
import { F_DATA, F_FIN, F_HEARTBEAT, F_HEARTBEATS, F_SYN, F_WIN, HEADERS, type Packet, decodeTransfer, encodePacket } from './wire'

/** The unit's message interface: its two bulk endpoints. */
export interface UsbPort {
  /** The IN endpoint's packet size. */
  readonly mtu: number
  /** One bulk OUT transfer. */
  send(data: Uint8Array): Promise<void>
  /** Hands over every bulk IN transfer from now on, and calls `gone` if the unit stops answering. */
  listen(data: (bytes: Uint8Array) => void, gone: (err: Error) => void): void
  close(): Promise<void>
}

export interface Timing {
  /** What the unit had waiting is dropped for this long before anything is sent, as Line 6 Updater does. */
  purgeMs: number
  /** A stream that has sent nothing for this long sends a heartbeat. The unit drops a stream silent for about 4 s. */
  heartbeatMs: number
  /** How long to wait for an answer. */
  timeoutMs: number
  /** How long after the last FIN the interface stays claimed, for the unit to take it. */
  lingerMs: number
  /** How long between two looks at whether the unit has done what it accepted, and between two tries to lock its screen. */
  checkMs: number
}

export const TIMING: Timing = { purgeMs: 500, heartbeatMs: 1000, timeoutMs: 3000, lingerMs: 200, checkMs: 250 }

/** The host's receive buffer for a stream, as Line 6 Updater sizes it. */
const RX_BUFFER = 0x1000

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export class Link {
  private readonly streams = new Set<Stream>()
  /** OUT transfers go one at a time, in the order they were asked for. */
  private queue: Promise<void> = Promise.resolve()
  private beat: ReturnType<typeof setInterval> | null = null
  private failure: HxError | null = null

  constructor(
    readonly port: UsbPort,
    readonly timing: Timing = TIMING,
  ) {}

  async open(): Promise<void> {
    this.port.listen(
      (bytes) => this.receive(bytes),
      (err) => this.fail(new HxError('closed', `The HX Stomp stopped answering: ${err.message}`)),
    )
    // No stream is open yet, so whatever arrives meanwhile is dropped.
    await sleep(this.timing.purgeMs)
    this.beat = setInterval(() => this.heartbeats(), Math.max(5, this.timing.heartbeatMs / 4))
  }

  stream(local: number, remote: number): Stream {
    const stream = new Stream(this, local, remote)
    if (this.failure) stream.fail(this.failure)
    this.streams.add(stream)
    return stream
  }

  drop(stream: Stream): void {
    this.streams.delete(stream)
  }

  transmit(bytes: Uint8Array): Promise<void> {
    if (this.failure) return Promise.reject(this.failure)
    const sent = this.queue.then(() => this.port.send(bytes))
    this.queue = sent.catch((err: unknown) => {
      this.fail(new HxError('closed', `The HX Stomp did not take what was sent: ${err instanceof Error ? err.message : String(err)}`))
    })
    return sent
  }

  async close(): Promise<void> {
    if (this.beat) clearInterval(this.beat)
    this.beat = null
    this.fail(new HxError('closed', 'The connection to the HX Stomp was closed.'))
    await this.queue
    await this.port.close()
  }

  private receive(bytes: Uint8Array): void {
    let packets: Packet[]
    try {
      packets = decodeTransfer(bytes)
    } catch (err) {
      this.fail(err instanceof HxError ? err : new HxError('protocol', String(err)))
      return
    }
    for (const packet of packets) {
      if (packet.flags === null) continue
      for (const stream of this.streams) {
        if (stream.takes(packet)) {
          stream.handle(packet)
          break
        }
      }
    }
  }

  private heartbeats(): void {
    const now = Date.now()
    for (const stream of this.streams) {
      if (stream.connected && now - stream.lastSent >= this.timing.heartbeatMs) stream.send(F_HEARTBEAT).catch(() => undefined)
    }
  }

  private fail(err: HxError): void {
    if (this.failure) return
    this.failure = err
    if (this.beat) clearInterval(this.beat)
    this.beat = null
    for (const stream of this.streams) stream.fail(err)
  }
}

export class Stream {
  lastSent = 0
  /** The largest packet the unit takes on this stream, from its SYN. */
  private peerMtu = 0
  private txSeq = 1
  private rxSeq: number | null = null
  /** Bytes read from this stream: they move the edge of the window the unit may fill. */
  private consumed = 0
  /** Bytes sent on this stream, against the edge of the unit's window. */
  private sent = 0
  private peerWindow = 0
  private received: Uint8Array[] = []
  private waiting = 0
  private error: HxError | null = null
  private readonly waiters = new Set<() => void>()

  constructor(
    private readonly link: Link,
    readonly local: number,
    readonly remote: number,
  ) {}

  get connected(): boolean {
    return this.rxSeq !== null && this.error === null
  }

  /** The most data one packet to the unit can carry. */
  get room(): number {
    return (this.peerMtu || 512) - HEADERS
  }

  takes(packet: Packet): boolean {
    return (packet.source & 0xff) === (this.remote & 0xff) && packet.destination === this.local
  }

  send(flags: number, data?: Uint8Array): Promise<void> {
    if (this.error) return Promise.reject(this.error)
    const bytes = encodePacket({
      source: this.local,
      destination: this.remote & 0x3ff,
      flags,
      seq: this.txSeq,
      window: RX_BUFFER + this.consumed,
      mtu: this.link.port.mtu,
      data,
    })
    this.txSeq = (this.txSeq + 1) & 0xff
    this.sent += data?.length ?? 0
    this.lastSent = Date.now()
    return this.link.transmit(bytes)
  }

  handle(packet: Packet): void {
    if (this.error) return
    const flags = packet.flags ?? 0
    if (flags & F_SYN) {
      if (this.rxSeq !== null) return this.fail(new HxError('protocol', 'The HX Stomp opened a stream that was already open.'))
      this.rxSeq = packet.seq
      this.peerMtu = packet.mtu
      this.peerWindow = packet.window
    } else {
      // The unit keeps a stream that was never closed until its heartbeats run out, and
      // may still send on it: that is the earlier stream's, not an answer to this SYN.
      if (this.rxSeq === null) return
      if (((packet.seq - this.rxSeq) & 0xff) !== 1) return this.fail(new HxError('protocol', 'A packet from the HX Stomp was lost.'))
      this.rxSeq = packet.seq
      if (flags & (F_DATA | F_WIN)) {
        this.peerWindow = packet.window
        if (flags & F_DATA && packet.data.length) {
          this.received.push(packet.data)
          this.waiting += packet.data.length
        }
      }
      if (flags & F_FIN) return this.fail(new HxError('refused', 'The HX Stomp closed the stream.'))
    }
    this.wake()
  }

  fail(err: HxError): void {
    this.error ??= err
    this.wake()
  }

  async connect(ms: number): Promise<void> {
    await this.send(F_SYN | F_HEARTBEATS)
    await this.until(() => this.rxSeq !== null, ms, 'to open a stream')
  }

  /** Sends `data`, at most `room` bytes, once the unit's window has room for it. */
  async write(data: Uint8Array, ms: number): Promise<void> {
    if (data.length > this.room) throw new HxError('protocol', 'That is more than one packet to the HX Stomp carries.')
    await this.until(() => this.sent + data.length <= this.peerWindow, ms, 'to take what is sent')
    await this.send(F_DATA, data)
  }

  /** The next `n` bytes of the stream. */
  async read(n: number, ms: number, what: string): Promise<Uint8Array> {
    await this.until(() => this.waiting >= n, ms, what)
    const out = new Uint8Array(n)
    let filled = 0
    while (filled < n) {
      const first = this.received[0]
      const part = first.subarray(0, n - filled)
      out.set(part, filled)
      filled += part.length
      if (part.length === first.length) this.received.shift()
      else this.received[0] = first.subarray(part.length)
    }
    this.waiting -= n
    this.consumed += n
    return out
  }

  /** Tells the unit how far it may send now. */
  windowUpdate(): Promise<void> {
    return this.send(F_WIN)
  }

  /** Sends FIN, so the unit frees the port at once. */
  async close(): Promise<void> {
    if (this.connected) await this.send(F_FIN).catch(() => undefined)
    this.fail(new HxError('closed', 'The stream was closed.'))
  }

  private wake(): void {
    for (const check of [...this.waiters]) check()
  }

  /** Resolves once `done` holds; `ms` may be Infinity. What has arrived counts even after the stream failed. */
  private until(done: () => boolean, ms: number, what: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null
      const finish = (err?: HxError): void => {
        if (timer) clearTimeout(timer)
        this.waiters.delete(check)
        if (err) reject(err)
        else resolve()
      }
      const check = (): void => {
        if (done()) finish()
        else if (this.error) finish(this.error)
      }
      if (Number.isFinite(ms)) timer = setTimeout(() => finish(new HxError('timeout', `The HX Stomp took too long ${what}.`)), ms)
      this.waiters.add(check)
      check()
    })
  }
}

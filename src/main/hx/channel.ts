// One stream to one of the unit's services, with the service selected.
//
// A message on it is {u16 1 from the host or 0 from the unit, u16 service,
// u32 length} and then that many bytes of MessagePack:
//   request  {0x66: seq, 0x64: command, 0x65: parameters}
//   reply    {0x66: seq, 0x67: status, 0x68: result, or {0x6f: error} when refused}
// Status 0 is done. Status 1 is "accepted, ends later": the end then comes as a
// notification. Only commands that change the unit answer so, and none is sent here.
//
// Follows Channel in HXtra's tools/hx_ctl.py.

import { HxError } from './errors'
import type { Link, Stream } from './link'
import { type Packable, type Value, pack, unpack } from './msgpack'

export interface Service {
  /** The host's address for the stream. */
  local: number
  /** The unit's port. */
  remote: number
  service: number
}

const K_COMMAND = 0x64
const K_PARAMS = 0x65
const K_SEQ = 0x66
const K_STATUS = 0x67
const K_RESULT = 0x68
const K_ERROR = 0x6f

/** A stream the unit still holds from a session that was not closed is ignored until then: about 4 s. */
const CONNECT_TRIES = 4
/** How much of a message is read before the unit is told it may send more. */
const READ_STEP = 0x400

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function message(service: number, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + body.length)
  const view = new DataView(out.buffer)
  view.setUint16(0, 1, true)
  view.setUint16(2, service, true)
  view.setUint32(4, body.length, true)
  out.set(body, 8)
  return out
}

export class Channel {
  private seq = 0
  /** One request at a time: a reply is the next message on the stream. */
  private turn: Promise<unknown> = Promise.resolve()

  private constructor(
    private readonly link: Link,
    private readonly stream: Stream,
    private readonly service: number,
  ) {}

  static async open(link: Link, target: Service): Promise<Channel> {
    const ms = link.timing.timeoutMs
    let stream: Stream
    for (let attempt = 1; ; attempt++) {
      stream = link.stream(target.local, target.remote)
      try {
        await stream.connect(ms)
        break
      } catch (err) {
        link.drop(stream)
        if (attempt === CONNECT_TRIES || !(err instanceof HxError) || err.code === 'closed') throw err
      }
    }
    const channel = new Channel(link, stream, target.service)
    try {
      await channel.write(message(target.service, Uint8Array.of(target.service)))
      const reply = await channel.read(ms)
      if (reply.length !== 1 || reply[0] !== target.service) {
        throw new HxError('protocol', `The HX Stomp did not open its service ${target.service}.`)
      }
    } catch (err) {
      await channel.close()
      throw err
    }
    return channel
  }

  /** Sends a command and resolves with its result. */
  request(command: number, params: Packable = null, ms = this.link.timing.timeoutMs): Promise<Value> {
    const run = async (): Promise<Value> => {
      this.seq = (this.seq + 1) & 0xffff
      const seq = this.seq
      // The unit finds the parameters by where their key is, so that key goes last.
      const body = pack(
        new Map<Packable, Packable>([
          [K_SEQ, seq],
          [K_COMMAND, command],
          [K_PARAMS, params],
        ]),
      )
      await this.write(message(this.service, body))
      const reply = unpack(await this.read(ms))
      const name = `0x${command.toString(16).padStart(2, '0')}`
      if (!(reply instanceof Map)) throw new HxError('protocol', `The HX Stomp answered command ${name} with something that is not a reply.`)
      if (reply.get(K_SEQ) !== seq) throw new HxError('protocol', `The HX Stomp answered another request than command ${name}.`)
      const status = reply.get(K_STATUS)
      const result = reply.get(K_RESULT) ?? null
      if (status !== 0) {
        const error = result instanceof Map ? result.get(K_ERROR) : undefined
        throw new HxError('refused', `The HX Stomp refused command ${name} (status ${String(status)}, error ${String(error)}).`)
      }
      return result
    }
    const result = this.turn.then(run, run)
    this.turn = result.catch(() => undefined)
    return result
  }

  /**
   * Hands over every message the unit sends on this stream, until it closes.
   * For the notify service, which has to be read: left unread, its messages pile
   * up in the unit, and it hangs after some thirty preset changes.
   */
  listen(onMessage: (message: Value) => void): void {
    const loop = async (): Promise<void> => {
      for (;;) {
        const bytes = await this.read(Infinity)
        let value: Value
        try {
          value = unpack(bytes)
        } catch {
          value = bytes
        }
        onMessage(value)
      }
    }
    loop().catch(() => undefined)
  }

  async close(): Promise<void> {
    await this.stream.close()
    this.link.drop(this.stream)
  }

  private async write(data: Uint8Array): Promise<void> {
    const step = this.stream.room
    for (let o = 0; o < data.length; o += step) await this.stream.write(data.subarray(o, o + step), this.link.timing.timeoutMs)
  }

  /** The next message's bytes. `ms` is how long to wait for it to start. */
  private async read(ms: number): Promise<Uint8Array> {
    const head = await this.stream.read(8, ms, 'to answer')
    const length = new DataView(head.buffer).getUint32(4, true)
    const rest = this.link.timing.timeoutMs
    const parts: Uint8Array[] = []
    for (let got = 0; got < length; ) {
      const part = await this.stream.read(Math.min(length - got, READ_STEP), rest, 'to finish its answer')
      parts.push(part)
      got += part.length
      await this.stream.windowUpdate()
    }
    if (!length) await this.stream.windowUpdate()
    return concat(parts)
  }
}

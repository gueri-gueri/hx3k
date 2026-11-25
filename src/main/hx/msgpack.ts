// MessagePack as the HX Stomp's services speak it: requests and replies are
// maps with small whole-number keys.
//
// Two things differ from a general library, both as HXtra's tools/hx_ctl.py
// found them on the unit:
//  - a str is bytes, not text: the unit sends a preset's blob as one, and a
//    name is padded with NULs. So a str is read as bytes (text() reads a name).
//  - bytes are written as a str, never as a bin, and never as a str 8: that is
//    how HX Edit packs them.

import { HxError } from './errors'

/** What a reply holds. A str and a bin are both bytes. */
export type Value = null | boolean | number | bigint | Uint8Array | Value[] | Map<Value, Value>

/** What a request can hold. A Map keeps its keys in the order they were set, and so do its bytes. */
export type Packable = null | boolean | number | string | Uint8Array | Packable[] | Map<Packable, Packable>

const utf8 = new TextEncoder()

function packInto(out: number[], v: Packable): void {
  if (v === null) out.push(0xc0)
  else if (v === false) out.push(0xc2)
  else if (v === true) out.push(0xc3)
  else if (typeof v === 'number') packInt(out, v)
  else if (typeof v === 'string') packStr(out, utf8.encode(v))
  else if (v instanceof Uint8Array) packStr(out, v)
  else if (Array.isArray(v)) {
    if (v.length < 16) out.push(0x90 | v.length)
    else if (v.length <= 0xffff) out.push(0xdc, v.length >> 8, v.length & 0xff)
    else throw new HxError('protocol', 'The list is too long to send.')
    for (const item of v) packInto(out, item)
  } else {
    if (v.size < 16) out.push(0x80 | v.size)
    else if (v.size <= 0xffff) out.push(0xde, v.size >> 8, v.size & 0xff)
    else throw new HxError('protocol', 'The map is too long to send.')
    for (const [key, value] of v) {
      packInto(out, key)
      packInto(out, value)
    }
  }
}

function packInt(out: number[], n: number): void {
  if (!Number.isInteger(n)) throw new HxError('protocol', `${n} is not a whole number.`)
  if (n >= 0) {
    if (n < 0x80) out.push(n)
    else if (n <= 0xff) out.push(0xcc, n)
    else if (n <= 0xffff) out.push(0xcd, n >> 8, n & 0xff)
    else if (n <= 0xffffffff) out.push(0xce, n >>> 24, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff)
    else throw new HxError('protocol', `${n} is too large to send.`)
  } else if (n >= -32) out.push(n & 0xff)
  else if (n >= -0x80) out.push(0xd0, n & 0xff)
  else if (n >= -0x8000) out.push(0xd1, (n >> 8) & 0xff, n & 0xff)
  else if (n >= -0x80000000) out.push(0xd2, (n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff)
  else throw new HxError('protocol', `${n} is too small to send.`)
}

function packStr(out: number[], bytes: Uint8Array): void {
  const n = bytes.length
  if (n < 32) out.push(0xa0 | n)
  else if (n <= 0xffff) out.push(0xda, n >> 8, n & 0xff)
  else out.push(0xdb, n >>> 24, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff)
  for (const b of bytes) out.push(b)
}

export function pack(value: Packable): Uint8Array {
  const out: number[] = []
  packInto(out, value)
  return Uint8Array.from(out)
}

/** Reads values one after another from `bytes`; `offset` is where the next one starts. */
export class Unpacker {
  offset = 0
  private readonly view: DataView

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  get done(): boolean {
    return this.offset >= this.bytes.length
  }

  next(): Value {
    const t = this.u8()
    if (t < 0x80) return t
    if (t < 0x90) return this.map(t & 0x0f)
    if (t < 0xa0) return this.array(t & 0x0f)
    if (t < 0xc0) return this.take(t & 0x1f)
    if (t >= 0xe0) return t - 0x100
    switch (t) {
      case 0xc0:
        return null
      case 0xc2:
        return false
      case 0xc3:
        return true
      case 0xc4:
      case 0xd9:
        return this.take(this.u8())
      case 0xc5:
      case 0xda:
        return this.take(this.u16())
      case 0xc6:
      case 0xdb:
        return this.take(this.u32())
      case 0xca:
        return this.at(4, (o) => this.view.getFloat32(o))
      case 0xcb:
        return this.at(8, (o) => this.view.getFloat64(o))
      case 0xcc:
        return this.u8()
      case 0xcd:
        return this.u16()
      case 0xce:
        return this.u32()
      case 0xcf:
        return whole(this.at(8, (o) => this.view.getBigUint64(o)))
      case 0xd0:
        return this.at(1, (o) => this.view.getInt8(o))
      case 0xd1:
        return this.at(2, (o) => this.view.getInt16(o))
      case 0xd2:
        return this.at(4, (o) => this.view.getInt32(o))
      case 0xd3:
        return whole(this.at(8, (o) => this.view.getBigInt64(o)))
      case 0xdc:
        return this.array(this.u16())
      case 0xdd:
        return this.array(this.u32())
      case 0xde:
        return this.map(this.u16())
      case 0xdf:
        return this.map(this.u32())
      default:
        // 0xc1 is unused, and the unit's services send no extension types.
        throw new HxError('protocol', `The unit sent a MessagePack type this app does not read (0x${t.toString(16)}).`)
    }
  }

  private at<T>(size: number, read: (offset: number) => T): T {
    if (this.offset + size > this.bytes.length) throw new HxError('protocol', 'The unit sent a message that ends too soon.')
    const value = read(this.offset)
    this.offset += size
    return value
  }

  private u8(): number {
    return this.at(1, (o) => this.view.getUint8(o))
  }

  private u16(): number {
    return this.at(2, (o) => this.view.getUint16(o))
  }

  private u32(): number {
    return this.at(4, (o) => this.view.getUint32(o))
  }

  private take(n: number): Uint8Array {
    return this.at(n, (o) => this.bytes.slice(o, o + n))
  }

  private array(n: number): Value[] {
    const out: Value[] = []
    for (let i = 0; i < n; i++) out.push(this.next())
    return out
  }

  private map(n: number): Map<Value, Value> {
    const out = new Map<Value, Value>()
    for (let i = 0; i < n; i++) {
      const key = this.next()
      out.set(key, this.next())
    }
    return out
  }
}

function whole(n: bigint): number | bigint {
  return n >= BigInt(Number.MIN_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n
}

/** The one value `bytes` holds. */
export function unpack(bytes: Uint8Array): Value {
  const u = new Unpacker(bytes)
  const value = u.next()
  if (!u.done) throw new HxError('protocol', 'The unit sent a message with something after its end.')
  return value
}

/** A name as the unit sends it: one byte a character, cut at the first NUL. */
export function text(value: Value | undefined): string {
  if (!(value instanceof Uint8Array)) return ''
  let out = ''
  for (const b of value) {
    if (b === 0) break
    out += String.fromCharCode(b)
  }
  return out
}

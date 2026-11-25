// The packets of the HX Stomp's message interface, as HXtra's
// tools/hx_dfu_reboot.py describes them and checked them on the unit.
//
// USB: interface 0 (class 0xFF), one bulk OUT and one bulk IN endpoint. The
// host sends one packet per OUT transfer, zero-padded to a multiple of 4. An IN
// transfer may hold several packets, each padded to 4.
//
// A packet is a transport header, then a stream header, then data. All words
// are little-endian.
//   transport: type << 28 | 2 << 26 | length    (the bytes after this header)
//              source | destination << 16
//              type 2 opens a stream, and one more word follows: mtu << 16
//   stream:    flags << 24 | seq << 8
//              the edge of the sender's receive window: its buffer's size plus
//              the bytes it has taken so far
// seq counts a direction's packets, 1 on the SYN; a gap drops the stream.

import { HxError } from './errors'

export const F_SYN = 0x01
export const F_FIN = 0x02
export const F_DATA = 0x04
export const F_WIN = 0x08
export const F_HEARTBEAT = 0x10
/** On a SYN: the opener will send heartbeats. */
export const F_HEARTBEATS = 0x20

/** Both headers: what a packet's data has to leave room for in the mtu. */
export const HEADERS = 16

export interface Packet {
  source: number
  destination: number
  /** null when the packet is not a stream's. */
  flags: number | null
  seq: number
  window: number
  /** On a SYN: the largest packet the sender takes. */
  mtu: number
  data: Uint8Array
}

export interface Outgoing {
  source: number
  destination: number
  flags: number
  seq: number
  window: number
  /** Sent on a SYN only. */
  mtu: number
  data?: Uint8Array
}

export function encodePacket(p: Outgoing): Uint8Array {
  const syn = (p.flags & F_SYN) !== 0
  const data = p.data ?? new Uint8Array(0)
  const length = (syn ? 4 : 0) + 8 + data.length
  const out = new Uint8Array((8 + length + 3) & ~3)
  const view = new DataView(out.buffer)
  view.setUint32(0, (((syn ? 2 : 1) << 28) | (2 << 26) | length) >>> 0, true)
  view.setUint32(4, ((p.source & 0xffff) | ((p.destination & 0xffff) << 16)) >>> 0, true)
  let o = 8
  if (syn) {
    view.setUint32(o, ((p.mtu & 0xffff) << 16) >>> 0, true)
    o += 4
  }
  view.setUint32(o, (((p.flags & 0xff) << 24) | ((p.seq & 0xff) << 8)) >>> 0, true)
  view.setUint32(o + 4, p.window >>> 0, true)
  out.set(data, o + 8)
  return out
}

/** The packets of one IN transfer. */
export function decodeTransfer(bytes: Uint8Array): Packet[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const out: Packet[] = []
  let off = 0
  while (off + 8 <= bytes.length) {
    const w0 = view.getUint32(off, true)
    const w1 = view.getUint32(off + 4, true)
    const type = w0 >>> 28
    const length = w0 & 0xffff
    const end = off + 8 + length
    if (end > bytes.length) throw new HxError('protocol', 'The unit sent a packet that ends too soon.')
    const packet: Packet = { source: w1 & 0xffff, destination: w1 >>> 16, flags: null, seq: 0, window: 0, mtu: 0, data: new Uint8Array(0) }
    let o = off + 8
    if (type === 2) {
      if (length < 4) throw new HxError('protocol', 'The unit opened a stream without saying its packet size.')
      packet.mtu = view.getUint32(o, true) >>> 16
      o += 4
    }
    if (end - o >= 8) {
      const s0 = view.getUint32(o, true)
      packet.flags = s0 >>> 24
      packet.seq = (s0 >>> 8) & 0xff
      packet.window = view.getUint32(o + 4, true)
      packet.data = bytes.slice(o + 8, end)
    }
    out.push(packet)
    off += (8 + length + 3) & ~3
  }
  return out
}

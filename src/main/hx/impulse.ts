// A User IR slot of the HX Stomp, which is where a converted capture lives.
//
// What a slot holds and how HX Edit 3.82 writes one were read from HX Edit
// itself (HelixLibrarianService::setIR and what calls it) and checked against
// what an HX Stomp on 3.80 answers when asked for the IRs it already has:
//  - the unit keeps the .wav's samples as they are: 2,048 words of 32-bit
//    float, little-endian, 8,192 bytes
//  - the checksum is the sum of those words, as 32-bit numbers
//  - the list gives each IR's MD5 over those bytes, which is how a preset
//    finds its IR again
//  - a name is at most 63 characters, and HX Edit turns into "?" whatever is
//    not plain ASCII or is one of \|~`<>[]{};

import { createHash } from 'node:crypto'
import { HxError } from './errors'
import type { Packable } from './msgpack'

/** Slots 1 to 128 on the unit, 0 to 127 here. */
export const IMPULSE_SLOTS = 128
export const IMPULSE_BYTES = 2048 * 4
const NAME_CHARS = 63
const REFUSED_IN_NAMES = '\\|~`<>[]{};'
/** HX Edit refuses a .wav with a sample beyond this. */
const LARGEST_SAMPLE = 15.85

const K_FORMAT = 0x65
const K_NAME = 0x6d
const K_DATA = 0x6e
const K_INDEX = 0x70
const K_CHECKSUM = 0x71
const K_KIND = 0x72
const K_LENGTH = 0x73
const K_PREMIUM = 0x7b
const K_ORIGINAL = 0x7c
const K_PBN = 0x7d

/** What the unit answers for every IR HX Edit made from a mono .wav. */
const KIND_MONO = 1
/** 1 is 512 samples, 2 is 1,024, 3 is 2,048. */
const LENGTH_2048 = 3

export interface ImpulseEntry {
  /** 0 for slot 1. */
  index: number
  name: string
  /** The MD5 of the samples, in hex. */
  hash: string
}

export function impulseName(name: string): string {
  let out = ''
  for (const char of [...name].slice(0, NAME_CHARS)) {
    const code = char.codePointAt(0) ?? 0
    out += code >= 0x20 && code < 0x7f && !REFUSED_IN_NAMES.includes(char) ? char : '?'
  }
  return out
}

export function impulseChecksum(data: Uint8Array): number {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let sum = 0
  for (let o = 0; o + 4 <= data.length; o += 4) sum = (sum + view.getUint32(o, true)) >>> 0
  return sum
}

export function impulseHash(data: Uint8Array): string {
  return createHash('md5').update(data).digest('hex')
}

/**
 * The samples of a capture's .wav, as the unit keeps them. Only the .wav this app
 * writes is taken: 2,048 samples of 32-bit float, mono, 48 kHz, ending in silence.
 * HX Edit sends such a file as it is; any other it would resample, fade or trim.
 */
export function wavSamples(wav: Uint8Array): Uint8Array {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
  const tag = (o: number): string => String.fromCharCode(...wav.subarray(o, o + 4))
  const no = (why: string): HxError => new HxError('invalid', `This is not a capture converted for the HX Stomp: ${why}.`)
  if (wav.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw no('it is not a .wav file')
  let format = false
  for (let o = 12; o + 8 <= wav.length; ) {
    const size = view.getUint32(o + 4, true)
    const body = o + 8
    if (body + size > wav.length) break
    if (tag(o) === 'fmt ') {
      if (size < 16) throw no('its format is cut short')
      const ok = view.getUint16(body, true) === 3 && view.getUint16(body + 2, true) === 1 && view.getUint32(body + 4, true) === 48000 && view.getUint16(body + 14, true) === 32
      if (!ok) throw no('it is not 32-bit float, mono, 48 kHz')
      format = true
    } else if (tag(o) === 'data') {
      if (!format) throw no('its format does not come first')
      if (size !== IMPULSE_BYTES) throw no('it does not hold 2,048 samples')
      const data = wav.slice(body, body + size)
      const samples = new DataView(data.buffer)
      for (let s = 0; s < size; s += 4) {
        const x = samples.getFloat32(s, true)
        if (!(Math.abs(x) <= LARGEST_SAMPLE)) throw no('a sample is out of range')
      }
      if (samples.getUint32(size - 4, true) !== 0) throw no('it does not end in silence')
      return data
    }
    o = body + size + (size & 1)
  }
  throw no('it has no samples')
}

/** What asks the unit for its IRs, for one IR's details, and for one IR's samples. */
export const listParams = (): Packable => new Map([[K_FORMAT, 2]])
export const infoParams = (index: number): Packable => new Map([[K_INDEX, index]])
export const dataParams = (index: number): Packable =>
  new Map([
    [K_INDEX, index],
    [K_FORMAT, 2],
  ])

/** What writes an IR into a slot, key for key as HX Edit sends it. */
export function storeParams(index: number, name: string, data: Uint8Array): Packable {
  if (!Number.isInteger(index) || index < 0 || index >= IMPULSE_SLOTS) throw new HxError('invalid', `There is no IR slot ${index + 1}.`)
  if (data.length !== IMPULSE_BYTES) throw new HxError('invalid', 'An IR for this slot holds 2,048 samples.')
  const text = impulseName(name)
  // A str carries its closing NUL, in both directions.
  const cstring = Uint8Array.from({ length: text.length + 1 }, (_, i) => text.charCodeAt(i) || 0)
  return new Map<Packable, Packable>([
    [K_INDEX, index],
    // HX Edit holds it as a signed 32-bit number, and packs it so.
    [K_CHECKSUM, impulseChecksum(data) | 0],
    [K_NAME, cstring],
    [K_KIND, KIND_MONO],
    [K_LENGTH, LENGTH_2048],
    [K_PREMIUM, false],
    [K_ORIGINAL, false],
    [K_PBN, 0],
    [K_DATA, data],
  ])
}

/** The keys of an IR's details, in the unit's order: what a unit this code can write to answers. */
export const INFO_KEYS = [K_INDEX, K_CHECKSUM, K_NAME, K_KIND, K_LENGTH, K_PREMIUM, K_ORIGINAL, K_PBN]
export const IMPULSE_KEYS = { name: K_NAME, index: K_INDEX, checksum: K_CHECKSUM, hash: 0x68, premium: K_PREMIUM, original: K_ORIGINAL } as const

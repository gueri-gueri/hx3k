// Reading the blocks out of a preset as the unit sends it (the edit buffer).
//
// The blob is three MessagePack values: the str "l6-helix\0", a str of twelve
// offsets, and a map of sections. Section 0, key 22, is a list of 20 places:
//   0 input A, 1..8 path A, 9 output A, 10 split, 11..18 path B, 19 join
// each {19: type, 20: body}; type 8 is an empty place. A block's body holds
// {24: {25: model id}, 10: enabled, 11: {4: [knob values]}}.
//
// Follows decode_preset and summarize in HXtra's tools/hx_ctl.py.

import { HxError } from './errors'
import { FLOAT32, Unpacker, type Value, float32, text } from './msgpack'

/**
 * HXtra's NAM A2 Lite block on the HX Stomp and the HX Stomp XL. It sits on the
 * model number of a stock fuzz it replaces, with that fuzz's ten knobs type for
 * type, so that HX Edit keeps the block (HXtra's tools/patch_amp.py, EQ_FX_PARAMS):
 * Input, Treble, Output, Polarity, Bass, Mid, Model, Mid Freq, Q, High Cut.
 * Model is the User IR slot, 1 to 128, kept as a float.
 */
export const NAM_MODEL_ID = 555
export const NAM_MODEL_KNOB = 6

export interface Block {
  path: 'A' | 'B'
  /** 0 to 7, from the left. */
  position: number
  /** Where the block is in the preset's list of places. */
  place: number
  /** The model's number in the firmware's table. HXtra's NAM block has one of its own, which depends on the build. */
  modelId: number | null
  enabled: boolean
  /** The knobs' values, in the model's order. */
  values: (number | boolean)[]
}

const SECTION_BLOCKS = 0
const K_PLACES = 22
const K_TYPE = 19
const K_BODY = 20
const K_ENABLED = 10
const K_PARAMS = 11
const K_VALUES = 4
const K_MODEL = 24
const K_MODEL_ID = 25
const TYPE_EMPTY = 8
const PATHS = [
  { path: 'A', first: 1 },
  { path: 'B', first: 11 },
] as const

const map = (v: Value | undefined): Map<Value, Value> | null => (v instanceof Map ? v : null)

export function presetBlocks(blob: Uint8Array): Block[] {
  const reader = new Unpacker(blob)
  const magic = reader.next()
  reader.next()
  const sections = map(reader.next())
  if (!text(magic).startsWith('l6-helix') || !sections) throw new HxError('protocol', 'The HX Stomp sent something that is not a preset.')
  const places = map(sections.get(SECTION_BLOCKS))?.get(K_PLACES)
  if (!Array.isArray(places)) throw new HxError('protocol', 'The preset from the HX Stomp has no list of blocks.')

  const out: Block[] = []
  for (const { path, first } of PATHS) {
    for (let position = 0; position < 8; position++) {
      const place = map(places[first + position])
      const body = map(place?.get(K_BODY))
      if (!place || !body || place.get(K_TYPE) === TYPE_EMPTY) continue
      const modelId = map(body.get(K_MODEL))?.get(K_MODEL_ID)
      const values = map(body.get(K_PARAMS))?.get(K_VALUES)
      out.push({
        path,
        position,
        place: first + position,
        modelId: typeof modelId === 'number' ? modelId : null,
        enabled: body.get(K_ENABLED) === true,
        values: Array.isArray(values) ? values.filter((v) => typeof v === 'number' || typeof v === 'boolean') : [],
      })
    }
  }
  return out
}

/**
 * The preset with one knob of one block set to `value`. Only the knob's four
 * bytes change: everything else stays as the unit packed it, which is what it
 * takes back. Only a knob the unit keeps as a 32-bit float can be set this way.
 */
export function withKnob(blob: Uint8Array, place: number, knob: number, value: number): Uint8Array {
  const reader = new Unpacker(blob)
  reader.next()
  reader.next()
  reader.seek([SECTION_BLOCKS, K_PLACES, place, K_BODY, K_PARAMS, K_VALUES, knob])
  const at = reader.offset
  if (blob[at] !== FLOAT32 || at + 5 > blob.length) throw new HxError('protocol', 'That knob is not a number the HX Stomp keeps as a float.')
  const out = blob.slice()
  out.set(float32(value), at + 1)
  return out
}

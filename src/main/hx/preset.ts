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
import { Unpacker, type Value, text } from './msgpack'

export interface Block {
  path: 'A' | 'B'
  /** 0 to 7, from the left. */
  position: number
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
        modelId: typeof modelId === 'number' ? modelId : null,
        enabled: body.get(K_ENABLED) === true,
        values: Array.isArray(values) ? values.filter((v) => typeof v === 'number' || typeof v === 'boolean') : [],
      })
    }
  }
  return out
}

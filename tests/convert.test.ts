import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

// convert.ts takes AppError from errors.ts, which has no Electron in it.
import { WAV_BYTES, convertNam } from '../src/main/convert'
import { A2_LITE_WEIGHTS, sampleModel, sampleNam, sampleSlimmableNam } from '../src/main/sampleNam'

vi.mock('electron', () => ({}))

const both = { includeLevel: true, includeLoudness: true }

function view(wav: Uint8Array): DataView {
  return new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
}
const sample = (wav: Uint8Array, i: number): number => view(wav).getFloat32(44 + 4 * i, true)
const tag = (wav: Uint8Array, at: number): string => String.fromCharCode(...wav.subarray(at, at + 4))

describe("HXtra's converter, as vendored", () => {
  it('is the unmodified upstream file', () => {
    const bytes = readFileSync(join(__dirname, '../vendor/hxtra/nam2ir-core.js'))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('406438a54983b5a9cbc372f9c6078cc36284c8f5b716a7db64f56e617c94af8e')
  })
})

describe('convertNam', () => {
  it('writes a 48 kHz mono 32-bit float .wav of 2,048 samples', () => {
    const { wav } = convertNam(sampleNam(), both)
    expect(wav.byteLength).toBe(WAV_BYTES)
    const v = view(wav)
    expect(tag(wav, 0)).toBe('RIFF')
    expect(tag(wav, 8)).toBe('WAVE')
    expect(tag(wav, 12)).toBe('fmt ')
    expect(v.getUint16(20, true)).toBe(3) // IEEE float
    expect(v.getUint16(22, true)).toBe(1) // mono
    expect(v.getUint32(24, true)).toBe(48000)
    expect(v.getUint16(34, true)).toBe(32)
    expect(tag(wav, 36)).toBe('data')
    expect(v.getUint32(40, true)).toBe(2048 * 4)
  })

  it("starts with HXtra's header words and ends in silence", () => {
    const { wav, info } = convertNam(sampleNam(), both)
    expect(sample(wav, 0)).toBe(0.5)
    expect(sample(wav, 1)).toBe(-0.5)
    expect(sample(wav, 2)).toBe(3) // channels
    expect(sample(wav, 3)).toBe(2 ** info.exponent)
    expect(sample(wav, 4)).toBeCloseTo(A2_LITE_WEIGHTS / 1024, 6)
    expect(sample(wav, 7)).toBe(0)
    // HX Edit would fade the tail if the last sample were not 0.
    expect(sample(wav, 2047)).toBe(0)
    // 8 header words + 1,871 weights + 72 words of silence state, then zeros.
    for (let i = 8 + A2_LITE_WEIGHTS + 72; i < 2048; i++) expect(sample(wav, i)).toBe(0)
  })

  it('keeps every sample inside the range HX Edit accepts', () => {
    const { wav } = convertNam(sampleNam({ seed: 7 }), both)
    for (let i = 0; i < 2048; i++) expect(Math.abs(sample(wav, i))).toBeLessThan(15.8489)
  })

  it('carries the input level and the loudness, and reports the trims', () => {
    const { wav, info } = convertNam(sampleNam({ metadata: { input_level_dbu: 12.5, loudness: -20.5 } }), both)
    expect(sample(wav, 5)).toBeCloseTo(10 ** (-12.5 / 20), 6)
    expect(sample(wav, 6)).toBeCloseTo(10 ** ((-18 + 20.5) / 20), 6)
    expect(info.inputDbu).toBe(12.5)
    expect(info.trimDb).toBeCloseTo(11.5 - 12.5, 6)
    expect(info.loudDb).toBeCloseTo(-18 + 20.5, 6)
  })

  it('leaves the level and the loudness out when asked to', () => {
    const { wav, info } = convertNam(sampleNam(), { includeLevel: false, includeLoudness: false })
    expect(sample(wav, 5)).toBe(0)
    expect(sample(wav, 6)).toBe(0)
    expect(info.trimDb).toBeNull()
    expect(info.loudDb).toBeNull()
  })

  it('is deterministic: the same capture gives the same bytes', () => {
    const a = convertNam(sampleNam({ seed: 3 }), both).wav
    const b = convertNam(sampleNam({ seed: 3 }), both).wav
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)
    const other = convertNam(sampleNam({ seed: 4 }), both).wav
    expect(Buffer.from(a).equals(Buffer.from(other))).toBe(false)
  })

  it('takes the A2 Lite model out of a multi-size .nam', () => {
    const { info, wav } = convertNam(sampleSlimmableNam(5), both)
    expect(info.slimmable).toBe(true)
    expect(wav.byteLength).toBe(WAV_BYTES)
    // The same weights on their own give the same samples.
    const alone = convertNam(JSON.stringify({ ...sampleModel({ seed: 5 }), metadata: { input_level_dbu: 12.5, loudness: -20.5 } }), both)
    expect(Buffer.from(wav).equals(Buffer.from(alone.wav))).toBe(true)
  })

  it('reads the capture name and gear from the metadata', () => {
    const { info } = convertNam(sampleNam({ metadata: { name: 'My amp', modeled_by: 'me', gear_make: 'Acme', gear_model: 'Acme Lead' } }), both)
    expect(info).toMatchObject({ name: 'My amp', modeledBy: 'me', gear: 'Acme Lead', slimmable: false })
  })

  it.each([
    ['text that is not JSON', 'not a nam', /not valid JSON/],
    ['JSON that is not a model', '{"hello":1}', /not a NAM model file/],
    ['an 8-channel model', JSON.stringify(sampleModel({ channels: 8 })), /No 3-channel A2 Lite model/],
    ['a 44.1 kHz capture', sampleNam({ sampleRate: 44100 }), /44100 Hz/],
  ])('refuses %s', (_what, text, why) => {
    expect(() => convertNam(text, both)).toThrowError(why)
    try {
      convertNam(text, both)
    } catch (err) {
      expect((err as { code?: string }).code).toBe('not_convertible')
    }
  })

  it('refuses an A2 Lite shape with another activation', () => {
    const model = sampleModel() as { config: { layers: { activation: { type: string }[] }[] } }
    model.config.layers[0].activation[4] = { type: 'Tanh' }
    expect(() => convertNam(JSON.stringify(model), both)).toThrowError(/Tanh/)
  })
})

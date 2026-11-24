// Types for nam2ir-core.js, which is HXtra's file, unmodified (see README.md here).

export interface Nam2IrInfo {
  /** metadata.name of the capture, or "". */
  name: string
  modeledBy: string
  /** "Make Model" from the capture's metadata, or "". */
  gear: string
  /** The A2 Lite model came out of a multi-size .nam (SlimmableContainer). */
  slimmable: boolean
  /** The weights were divided by 2^exponent to fit HX Edit's sample limit. */
  exponent: number
  peak: number
  /** The capture's input level (metadata input_level_dbu), or null when left out. */
  inputDbu: number | null
  /** Trim the kernel applies on the HX Stomp, in dB; null when there is none. */
  trimDb: number | null
  loudness: number | null
  /** Output change that normalises the capture to -18 dB; null when there is none. */
  loudDb: number | null
  sampleRate: number | undefined
  warnings: string[]
}

export interface Nam2IrOptions {
  /** false leaves the input level out (IR word 5 = 0: no trim). */
  level?: boolean
  /** false leaves the loudness out (IR word 6 = 0: output as it comes). */
  loudness?: boolean
}

export interface Nam2Ir {
  STOMP_DBU: number
  LOUD_TARGET: number
  /** Text of a .nam file -> the User IR .wav. Throws an Error that says what is wrong. */
  convert(text: string, opts?: Nam2IrOptions): { wav: Uint8Array; info: Nam2IrInfo }
  pickModel(d: unknown): { model: unknown; slimmable: boolean }
  problems(model: unknown): string[]
  irSamples(weights: number[], dbu?: number | null, loud?: number | null): { samples: Float32Array; exponent: number; peak: number }
  wavBytes(samples: Float32Array): Uint8Array
}

declare const api: Nam2Ir
export default api

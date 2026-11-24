import type { Model, Tone } from './types'

/**
 * What HXtra's NAM A2 Lite block can play: the 3-channel A2 Lite WaveNet
 * (1,871 weights) at 48 kHz. TONE3000 calls that architecture "2" and size "lite".
 * The file itself has the last word (vendor/hxtra/nam2ir-core.js checks it).
 */
export type Fit =
  /** An A2 Lite model: expected to convert. */
  | 'ready'
  /** An A2 model of another size; a multi-size .nam may still hold the A2 Lite one. */
  | 'maybe'
  /** Not an A2 NAM model: it cannot convert. */
  | 'no'

export function modelFit(model: Pick<Model, 'architecture_version' | 'size'>): Fit {
  if (model.architecture_version !== '2') return 'no'
  return model.size === 'lite' ? 'ready' : 'maybe'
}

/** A tone's fit from its list entry alone, before its models are known. */
export function toneFit(tone: Pick<Tone, 'format' | 'a2_models_count' | 'sizes'>): Fit {
  if (tone.format !== 'nam') return 'no'
  // A list entry that does not say how many A2 models it has is left undecided.
  if (typeof tone.a2_models_count === 'number' && tone.a2_models_count === 0) return 'no'
  return Array.isArray(tone.sizes) && tone.sizes.includes('lite') ? 'ready' : 'maybe'
}

/** Models in the order to offer them: A2 Lite first, the tone's own order within each group. */
export function sortModels<T extends Pick<Model, 'architecture_version' | 'size'>>(models: T[]): T[] {
  const rank = { ready: 0, maybe: 1, no: 2 } as const
  return models
    .map((m, i) => ({ m, i }))
    .sort((a, b) => rank[modelFit(a.m)] - rank[modelFit(b.m)] || a.i - b.i)
    .map((x) => x.m)
}

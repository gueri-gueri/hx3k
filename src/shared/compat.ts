import type { Model, Tone } from './types'

/**
 * What HXtra's NAM A2 Lite block can play: the 3-channel A2 Lite WaveNet
 * (1,871 weights) at 48 kHz. TONE3000 calls that architecture "2" and size "lite".
 * Every A2 .nam carries the A2 Lite model, whatever size TONE3000 lists for it
 * (a multi-size file gives it up), so any A2 model converts.
 * The file itself has the last word (vendor/hxtra/nam2ir-core.js checks it).
 */
export type Fit =
  /** An A2 model: expected to convert. */
  | 'ready'
  /** Not an A2 NAM model: it cannot convert. */
  | 'no'

export function modelFit(model: Pick<Model, 'architecture_version'>): Fit {
  return model.architecture_version === '2' ? 'ready' : 'no'
}

/** A tone's fit from its list entry alone, before its models are known. */
export function toneFit(tone: Pick<Tone, 'format' | 'a2_models_count'>): Fit {
  if (tone.format !== 'nam') return 'no'
  // A list entry that does not say how many A2 models it has is given the benefit of the doubt.
  return typeof tone.a2_models_count === 'number' && tone.a2_models_count === 0 ? 'no' : 'ready'
}

/** Models in the order to offer them: A2 Lite first, then other A2, the tone's own order within each group. */
export function sortModels<T extends Pick<Model, 'architecture_version' | 'size'>>(models: T[]): T[] {
  const rank = (m: T): number => (modelFit(m) === 'no' ? 2 : m.size === 'lite' ? 0 : 1)
  return models
    .map((m, i) => ({ m, i }))
    .sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i)
    .map((x) => x.m)
}

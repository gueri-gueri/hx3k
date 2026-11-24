// A made-up capture with the A2 Lite shape, for the tests and for the sample
// data of development (HX3K_MOCK=1). Its weights are noise: it is not a sound.

const KERNEL = [...Array<number>(14).fill(6), 15, 15, ...Array<number>(7).fill(6)]
const DILATION = [1, 3, 7, 17, 41, 101, 239, 1, 3, 7, 17, 41, 101, 239, 1, 13, 1, 3, 7, 17, 41, 101, 239]
const CHANNELS = 3
const HEAD_TAPS = 16

export const A2_LITE_WEIGHTS = 1871

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface SampleOptions {
  seed?: number
  channels?: number
  sampleRate?: number
  metadata?: Record<string, unknown>
}

/** A WaveNet model object: A2 Lite when `channels` is 3. */
export function sampleModel({ seed = 1, channels = CHANNELS, sampleRate = 48000 }: SampleOptions = {}): Record<string, unknown> {
  const count =
    channels +
    KERNEL.reduce((n, k) => n + channels * channels * k + 3 * channels + channels * channels, 0) +
    channels * HEAD_TAPS +
    2
  const random = mulberry32(seed)
  return {
    version: '0.7.0',
    architecture: 'WaveNet',
    config: {
      layers: [
        {
          input_size: 1,
          condition_size: 1,
          channels,
          bottleneck: channels,
          kernel_sizes: KERNEL,
          dilations: DILATION,
          activation: KERNEL.map(() => ({ type: 'LeakyReLU', negative_slope: 0.01 })),
          layer1x1: { active: true, groups: 1 },
          head: { out_channels: 1, kernel_size: HEAD_TAPS, bias: true },
        },
      ],
      head_scale: 0.02,
    },
    weights: Array.from({ length: count }, () => Math.round((random() - 0.5) * 1e6) / 1e6),
    sample_rate: sampleRate,
  }
}

/** The text of a .nam file holding one A2 Lite capture. */
export function sampleNam(options: SampleOptions = {}): string {
  return JSON.stringify({
    ...sampleModel(options),
    metadata: {
      name: 'Sample capture',
      modeled_by: 'nobody',
      gear_make: 'Sample',
      gear_model: 'Amp',
      input_level_dbu: 12.5,
      loudness: -20.5,
      ...options.metadata,
    },
  })
}

/** A multi-size .nam: an 8-channel model and the 3-channel A2 Lite one. */
export function sampleSlimmableNam(seed = 1): string {
  return JSON.stringify({
    version: '0.7.0',
    architecture: 'SlimmableContainer',
    config: {
      submodels: [
        { max_value: 1, model: sampleModel({ seed: seed + 1, channels: 8 }) },
        { max_value: 0.5, model: sampleModel({ seed }) },
      ],
    },
    sample_rate: 48000,
    metadata: { name: 'Sample multi-size capture', input_level_dbu: 12.5, loudness: -20.5 },
  })
}

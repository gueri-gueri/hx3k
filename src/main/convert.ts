// A .nam capture -> the HX Stomp User IR .wav that HXtra's NAM A2 Lite block loads.
//
// The work is HXtra's own converter, unmodified (vendor/hxtra/nam2ir-core.js):
// 2,048 samples, 48 kHz, mono, 32-bit float, holding the capture's 1,871 weights.
// It is not a sound, and only the 3-channel A2 Lite size at 48 kHz converts.

import NAM2IR from '../../vendor/hxtra/nam2ir-core.js'
import type { ConversionInfo } from '@shared/types'
import { AppError } from './errors'

export interface ConvertOptions {
  includeLevel: boolean
  includeLoudness: boolean
}

export interface Converted {
  wav: Uint8Array
  info: ConversionInfo
}

/** 44-byte header + 2,048 float samples. */
export const WAV_BYTES = 44 + 2048 * 4

/** Throws AppError('not_convertible') with the converter's own explanation. */
export function convertNam(text: string, options: ConvertOptions): Converted {
  try {
    const { wav, info } = NAM2IR.convert(text, { level: options.includeLevel, loudness: options.includeLoudness })
    return {
      wav,
      info: {
        name: info.name,
        modeledBy: info.modeledBy,
        gear: info.gear,
        slimmable: info.slimmable,
        exponent: info.exponent,
        inputDbu: info.inputDbu,
        trimDb: info.trimDb,
        loudness: info.loudness,
        loudDb: info.loudDb,
      },
    }
  } catch (err) {
    throw new AppError('not_convertible', err instanceof Error ? err.message : 'This capture could not be converted.')
  }
}

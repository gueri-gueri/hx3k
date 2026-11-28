import type { ErrorCode, Result } from '@shared/types'

/** A failure the main process reported, with a code the UI can word itself. */
export class HxError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'HxError'
  }
}

/** Unwraps a bridge answer: the data, or an HxError thrown. */
export async function call<T>(answer: Promise<Result<T>>): Promise<T> {
  const r = await answer
  if (r.ok) return r.data
  throw new HxError(r.code, r.message)
}

export const hx = window.hx

export const LINKS = {
  tone3000: 'https://www.tone3000.com',
  tone3000Keys: 'https://www.tone3000.com/settings',
  apiTerms: 'https://www.tone3000.com/api/terms',
  hxtra: 'https://github.com/wisemandenny/hxtra',
  hxtraSetup: 'https://wisemandenny.github.io/hxtra/web/',
  hxtraFeatures: 'https://wisemandenny.github.io/hxtra/web/features.html',
  // Line 6's downloads, as HXtra's setup page links them (a free Line 6 account is needed).
  stockFirmware: 'https://line6.com/software/readeula.html?rid=12906',
  updaterMac: 'https://line6.com/software/readeula.html?rid=12240',
  updaterWin: 'https://line6.com/software/readeula.html?rid=12239',
  hxEditMac: 'https://line6.com/software/readeula.html?rid=12926',
  hxEditWin: 'https://line6.com/software/readeula.html?rid=12927',
  nam: 'https://www.neuralampmodeler.com',
  gpl: 'https://www.gnu.org/licenses/gpl-3.0.html',
} as const

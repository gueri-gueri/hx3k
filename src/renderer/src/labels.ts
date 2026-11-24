// Display labels for API values, worded as TONE3000's own UI words them.

import type { Size } from '@shared/types'

const FORMAT: Record<string, string> = {
  nam: 'NAM',
  ir: 'IR',
  'aida-x': 'AIDA-X',
  'aa-snapshot': 'Snapshot',
  proteus: 'Proteus',
}

const GEAR: Record<string, string> = {
  amp: 'Amp Head',
  'amp-cab': 'Amp + Cab',
  'full-rig': 'Amp + Cab',
  pedal: 'Pedal',
  outboard: 'Outboard',
  cab: 'Cabinet',
  space: 'Spaces',
  experimental: 'Experimental',
  ir: 'Impulse Response',
}

const LICENSE: Record<string, string> = {
  t3k: 'TONE3000',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'cc-by-nd': 'CC BY-ND',
  'cc-by-nc-nd': 'CC BY-NC-ND',
  cco: 'CC0',
}

const SIZE: Record<Size, string> = {
  standard: 'Standard',
  lite: 'Lite',
  feather: 'Feather',
  nano: 'Nano',
  custom: 'Custom',
}

// An unknown value still shows as itself.
export const formatLabel = (v?: string | null): string => (v ? (FORMAT[v] ?? v) : '')
export const gearLabel = (v?: string | null): string => (v ? (GEAR[v] ?? v) : '')
export const licenseLabel = (v?: string | null): string => (v ? (LICENSE[v] ?? v) : '')
export const sizeLabel = (v?: string | null): string => (v ? (SIZE[v as Size] ?? v) : '')

/** "+2.5", "−1.0": a dB change with a real minus sign. */
export function signedDb(db: number): string {
  const s = Math.abs(db).toFixed(1)
  return db < 0 ? `−${s}` : `+${s}`
}

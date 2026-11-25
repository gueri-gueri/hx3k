import type { Language } from '@shared/types'
import { HxError } from '../api'
import { type Key, en } from './en'
import { ptBR } from './pt-BR'

export type { Key }
export type Lang = 'en' | 'pt-BR'
export type T = (key: Key, vars?: Record<string, string | number>) => string

const DICTS: Record<Lang, Record<Key, string>> = { en, 'pt-BR': ptBR }

/** The language to show: the setting, or the system's when it says "system". */
export function resolveLang(setting: Language, systemLocale: string): Lang {
  if (setting === 'en' || setting === 'pt-BR') return setting
  return systemLocale.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

export function translator(lang: Lang): T {
  const dict = DICTS[lang]
  return (key, vars) => {
    const text = dict[key] ?? en[key] ?? key
    return vars ? text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole)) : text
  }
}

/**
 * The converter explains itself in English (it is HXtra's file, unchanged).
 * Its usual refusals are worded here in the user's language; anything else
 * keeps the converter's own words, which say exactly what differs.
 */
export function convertErrorText(message: string, t: T): string {
  if (/No 3-channel A2 Lite model/i.test(message)) return t('err.noLite')
  const rate = /Trained at ([\d.]+) Hz/i.exec(message)
  if (rate) return t('err.rate', { rate: rate[1] })
  if (/not valid JSON|not a NAM model file/i.test(message)) return t('err.notNam')
  if (/could not be read/i.test(message)) return t('local.unread')
  return `${t('err.notA2Lite')} ${message}`
}

/** What to tell the user about a failed call. */
export function errorText(err: unknown, t: T): string {
  if (err instanceof HxError) {
    if (err.code === 'not_convertible') return convertErrorText(err.message, t)
    if (err.code === 'invalid' && /secret key/i.test(err.message)) return t('err.secretKey')
    if (err.code === 'invalid' && /t3k_pub_/.test(err.message)) return t('err.badKey')
    // What the unit or the USB layer said goes with it: it tells which step failed.
    if (err.code === 'device_failed') return `${t('err.device_failed')} ${err.message}`
    return t(`err.${err.code}` as Key)
  }
  return t('err.unknown')
}

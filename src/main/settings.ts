import { app } from 'electron'
import { join } from 'node:path'
import type { Language, Settings, Theme } from '@shared/types'
import { APP_NAME, BUILD_CLIENT_ID, isPublishableKey } from './config'
import { AppError } from './errors'
import { readJson, writeJson } from './jsonFile'

const LANGUAGES: Language[] = ['system', 'en', 'pt-BR']
const THEMES: Theme[] = ['dark', 'light', 'system']

const file = (): string => join(app.getPath('userData'), 'settings.json')

function defaults(): Settings {
  return {
    clientId: '',
    outputDir: join(app.getPath('documents'), APP_NAME),
    language: 'system',
    theme: 'dark',
    includeLevel: true,
    includeLoudness: true,
    sendAfterConvert: false,
    pointBlock: false,
  }
}

let cached: Settings | null = null

export function getSettings(): Settings {
  if (!cached) {
    const base = defaults()
    const saved = readJson<Partial<Settings>>(file(), {})
    cached = {
      clientId: typeof saved.clientId === 'string' && isPublishableKey(saved.clientId) ? saved.clientId : base.clientId,
      outputDir: typeof saved.outputDir === 'string' && saved.outputDir ? saved.outputDir : base.outputDir,
      language: LANGUAGES.includes(saved.language as Language) ? (saved.language as Language) : base.language,
      theme: THEMES.includes(saved.theme as Theme) ? (saved.theme as Theme) : base.theme,
      includeLevel: typeof saved.includeLevel === 'boolean' ? saved.includeLevel : base.includeLevel,
      includeLoudness: typeof saved.includeLoudness === 'boolean' ? saved.includeLoudness : base.includeLoudness,
      sendAfterConvert: typeof saved.sendAfterConvert === 'boolean' ? saved.sendAfterConvert : base.sendAfterConvert,
      pointBlock: typeof saved.pointBlock === 'boolean' ? saved.pointBlock : base.pointBlock,
    }
  }
  return cached
}

/** The key the app signs in with: the build's, else the one typed on first run. */
export function clientId(): string {
  return BUILD_CLIENT_ID || getSettings().clientId
}

/** Applies the fields of `patch` that are valid; throws on one that is not. */
export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings() }
  if (patch.clientId !== undefined) {
    const key = String(patch.clientId).trim()
    if (key.startsWith('t3k_cs_')) {
      throw new AppError('invalid', 'That is a secret key. Use the publishable key (it starts with t3k_pub_).')
    }
    if (key !== '' && !isPublishableKey(key)) {
      throw new AppError('invalid', 'A TONE3000 publishable key starts with t3k_pub_.')
    }
    next.clientId = key
  }
  if (patch.outputDir !== undefined) {
    if (typeof patch.outputDir !== 'string' || !patch.outputDir) throw new AppError('invalid', 'No folder given.')
    next.outputDir = patch.outputDir
  }
  if (patch.language !== undefined) {
    if (!LANGUAGES.includes(patch.language)) throw new AppError('invalid', 'Unknown language.')
    next.language = patch.language
  }
  if (patch.theme !== undefined) {
    if (!THEMES.includes(patch.theme)) throw new AppError('invalid', 'Unknown theme.')
    next.theme = patch.theme
  }
  if (patch.includeLevel !== undefined) next.includeLevel = Boolean(patch.includeLevel)
  if (patch.includeLoudness !== undefined) next.includeLoudness = Boolean(patch.includeLoudness)
  if (patch.sendAfterConvert !== undefined) next.sendAfterConvert = Boolean(patch.sendAfterConvert)
  if (patch.pointBlock !== undefined) next.pointBlock = Boolean(patch.pointBlock)
  cached = next
  writeJson(file(), next)
  return next
}

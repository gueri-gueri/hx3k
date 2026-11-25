// Types shared by the main process, the preload bridge and the renderer.

// ─── TONE3000 API v1 (https://www.tone3000.com/api#types) ───────────────────

export type Gear = 'amp' | 'amp-cab' | 'pedal' | 'outboard' | 'cab' | 'space' | 'experimental'
export type Format = 'nam' | 'ir' | 'aida-x' | 'aa-snapshot' | 'proteus'
export type Size = 'standard' | 'lite' | 'feather' | 'nano' | 'custom'
export type Architecture = '1' | '2' | 'custom'
export type License = 't3k' | 'cc-by' | 'cc-by-sa' | 'cc-by-nc' | 'cc-by-nc-sa' | 'cc-by-nd' | 'cc-by-nc-nd' | 'cco'

/** `display_name` is only set for a verified creator: fall back to `username`. */
export interface EmbeddedUser {
  id: number
  username: string
  display_name: string | null
  is_verified: boolean
  avatar_url: string | null
  url: string
}

export interface User extends EmbeddedUser {
  bio: string | null
  links: string[] | null
}

export interface Tone {
  id: number
  user: EmbeddedUser
  title: string
  description: string | null
  gear: Gear
  images: string[] | null
  format: Format
  license: License
  sizes: Size[]
  makes: { id: number; name: string }[]
  tags: { id: number; name: string }[]
  models_count: number
  a1_models_count: number
  a2_models_count: number
  downloads_count: number
  favorites_count: number
  url: string
}

export interface Model {
  id: number
  /** Download URL; fetched by the main process with the Bearer token. */
  model_url: string
  name: string
  size: Size
  tone_id: number
  /** null for a model that is not NAM (an IR, say). */
  architecture_version: Architecture | null
}

export interface TonePage {
  data: Tone[]
  page: number
  totalPages: number
  total: number
}

/** The bounded lists an independent integration may show. */
export type ToneListKind = 'favorited' | 'downloaded' | 'created' | 'trending' | 'latest'

// ─── The app ────────────────────────────────────────────────────────────────

export type Language = 'system' | 'en' | 'pt-BR'
export type Theme = 'dark' | 'light' | 'system'

export interface Settings {
  /** TONE3000 publishable key (t3k_pub_…), the OAuth client_id. "" until set. */
  clientId: string
  /** Folder the .wav files are written to. */
  outputDir: string
  language: Language
  theme: Theme
  /** Carry the capture's input level, so the HX Stomp trims its input to match. */
  includeLevel: boolean
  /** Carry the capture's loudness, so captures play at about the same volume. */
  includeLoudness: boolean
  /** Send each capture to the HX Stomp as soon as it is converted, when one is connected. */
  sendAfterConvert: boolean
}

/** What the converter says about a capture (vendor/hxtra/nam2ir-core.js `info`). */
export interface ConversionInfo {
  name: string
  modeledBy: string
  gear: string
  slimmable: boolean
  exponent: number
  inputDbu: number | null
  trimDb: number | null
  loudness: number | null
  loudDb: number | null
}

/** The tone a converted capture came from, kept so its creator and license stay with it. */
export interface ToneRef {
  id: number
  title: string
  url: string
  gear: Gear
  format: Format
  license: License
  image: string | null
  creator: { username: string; displayName: string | null; avatarUrl: string | null; url: string }
}

/** Where a capture was put on the HX Stomp, the last time it was sent. */
export interface DevicePlace {
  /** The User IR slot, 1 to 128: the number the NAM A2 Lite block's Model knob takes. */
  slot: number
  /** The MD5 of the samples sent, as the unit lists it. */
  hash: string
  sentAt: string
}

export interface ConversionRecord {
  id: string
  createdAt: string
  /** e.g. "JCM800 Crunch NAM.wav" */
  fileName: string
  filePath: string
  source: 'tone3000' | 'local'
  /** The model's name on TONE3000, or the dropped file's name. */
  sourceName: string
  info: ConversionInfo
  tone?: ToneRef
  model?: { id: number; name: string; size: Size }
  device?: DevicePlace
  /** The .wav is no longer where it was written. */
  missing?: boolean
}

export interface SendOutcome {
  record: ConversionRecord
  slot: number
  /** The unit already held this capture in that slot: nothing was written. */
  already: boolean
}

export interface AppState {
  version: string
  /** process.platform: "darwin", "win32", "linux"… */
  platform: string
  /** The system's locale, e.g. "pt-BR". */
  locale: string
  settings: Settings
  /** The publishable key came from the build (.env), so it is not asked for. */
  clientIdFromBuild: boolean
  hasClientId: boolean
  connected: boolean
  user: User | null
  /** Development only: TONE3000 is faked with sample data (HX3K_MOCK=1). */
  mock: boolean
}

/** How an embedded TONE3000 flow ended. */
export type AuthResult =
  | { status: 'connected'; user: User | null; toneId?: number }
  | { status: 'canceled' }
  | { status: 'error'; error: string }

export interface AuthRequest {
  /** select_tone opens the TONE3000 catalog; load_tone checks access to one tone. */
  prompt: 'select_tone' | 'load_tone'
  toneId?: number
}

/** Where the renderer wants the embedded TONE3000 view, in window coordinates. */
export interface ViewBounds {
  x: number
  y: number
  width: number
  height: number
}

export type ErrorCode =
  | 'no_client_id'
  | 'not_connected'
  | 'session_expired'
  | 'rate_limited'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'server'
  | 'not_convertible'
  | 'write_failed'
  | 'invalid'
  /** No HX Stomp is connected by USB. */
  | 'device_not_found'
  /** Another program holds the HX Stomp. */
  | 'device_busy'
  /** This system keeps the HX Stomp to its own driver. */
  | 'device_unsupported'
  /** Every User IR slot is taken. */
  | 'device_full'
  | 'device_failed'
  | 'unknown'

export type Result<T> = { ok: true; data: T } | { ok: false; code: ErrorCode; message: string }

/** One dropped or picked .nam file. */
export interface LocalNam {
  name: string
  text: string
}

export type LocalOutcome =
  | { name: string; ok: true; record: ConversionRecord }
  | { name: string; ok: false; message: string }

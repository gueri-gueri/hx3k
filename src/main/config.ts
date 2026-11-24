import { app } from 'electron'

export const APP_NAME = 'HXtra 3000'

export const API_BASE = 'https://www.tone3000.com'

/**
 * Nothing listens here: the main process intercepts the navigation inside the
 * embedded TONE3000 view. TONE3000 always accepts loopback redirect URIs, so
 * this needs no registering on the key.
 */
export const REDIRECT_URI = (import.meta.env.MAIN_VITE_T3K_REDIRECT_URI ?? '').trim() || 'http://127.0.0.1:38300/callback'

/** The TONE3000 web session lives here, apart from the app's own pages. */
export const T3K_PARTITION = 'persist:tone3000'

/** A publishable key; the secret key (t3k_cs_…) must never reach a desktop app. */
export function isPublishableKey(key: string): boolean {
  return /^t3k_pub_[A-Za-z0-9_-]{8,}$/.test(key)
}

const fromBuild = (import.meta.env.MAIN_VITE_T3K_PUBLISHABLE_KEY ?? '').trim()

/** The key from .env at build time; "" when it is missing or still the example's placeholder. */
export const BUILD_CLIENT_ID = isPublishableKey(fromBuild) && fromBuild !== 't3k_pub_your_key_here' ? fromBuild : ''

/** Development only: sample data stands in for TONE3000, so the UI runs without a key. */
export const MOCK = process.env['HX3000_MOCK'] === '1' && !app.isPackaged

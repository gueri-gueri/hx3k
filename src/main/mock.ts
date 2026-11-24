// Development only (HX3K_MOCK=1, never in a packaged app): made-up tones that
// stand in for TONE3000, so the screens can be worked on and tested without a
// key or a network. Nothing here is real catalog content.

import type { Gear, Model, Size, Tone, User } from '@shared/types'
import { AppError } from './errors'
import { sampleModel, sampleNam, sampleSlimmableNam } from './sampleNam'
import type { Backend } from './t3k'

export const mockSession = { connected: false }

/**
 * The page shown in the embedded view in place of TONE3000's catalog. Its links
 * go to the redirect address, as TONE3000's own pages do when a tone is picked
 * or the catalog is closed; the app intercepts them the same way.
 */
export function sampleCatalogUrl(redirectUri: string): string {
  const pick = (id: number): string => {
    const found = tones.find((t) => t.id === id)
    return `<li><a id="pick-${id}" href="${redirectUri}?code=sample&tone_id=${id}">${found?.title ?? id}</a></li>`
  }
  const html =
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Sample TONE3000</title>` +
    `<style>html{color-scheme:dark}body{margin:0;padding:48px;background:#000;color:#fff;font:15px/1.5 system-ui,sans-serif}` +
    `h1{font-size:26px;margin:0 0 8px}p{color:#a1a1aa;max-width:60ch}ul{padding:0;margin:24px 0;list-style:none;display:grid;gap:8px;max-width:420px}` +
    `a{color:#fff}li a{display:block;padding:12px 14px;border:1px solid #71717a;border-radius:8px;text-decoration:none}` +
    `li a:hover{background:#27272a}a:focus-visible{outline:2px solid #6b9bff;outline-offset:2px}</style>` +
    `<body><main><h1>Sample catalog</h1><p>A stand-in for TONE3000 while developing. Nothing here is real. Pick a tone to take it back to the app.</p>` +
    `<ul>${[101, 102, 103, 108].map(pick).join('')}</ul>` +
    `<p><a id="close" href="${redirectUri}?code=sample&canceled=true">Close without picking</a> · ` +
    `<a id="cancel" href="${redirectUri}?canceled=true">Cancel sign-in</a></p></main></body></html>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

const me: User = {
  id: 1,
  username: 'sample_player',
  display_name: null,
  is_verified: false,
  avatar_url: null,
  url: 'https://www.tone3000.com',
  bio: null,
  links: null,
}

function cover(a: string, b: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="320" height="200" fill="url(#g)"/><g fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3">` +
    `<circle cx="80" cy="150" r="16"/><circle cx="130" cy="150" r="16"/><circle cx="180" cy="150" r="16"/><circle cx="230" cy="150" r="16"/>` +
    `<rect x="32" y="32" width="256" height="76" rx="8"/></g></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function tone(
  id: number,
  title: string,
  gear: Gear,
  creator: string,
  sizes: Size[],
  colors: [string, string] | null,
  extra: Partial<Tone> = {},
): Tone {
  return {
    id,
    user: { id: id * 7, username: creator, display_name: null, is_verified: id % 3 === 0, avatar_url: null, url: 'https://www.tone3000.com' },
    title,
    description:
      'Sample tone for development. Captured through a made-up signal chain: guitar, the amp at noon, a 4x12 and one dynamic microphone slightly off axis.',
    gear,
    images: colors ? [cover(colors[0], colors[1])] : null,
    format: 'nam',
    license: 't3k',
    sizes,
    makes: [{ id: 1, name: 'Sample Amps' }],
    tags: [
      { id: 1, name: 'crunch' },
      { id: 2, name: 'british' },
    ],
    models_count: 4,
    a1_models_count: 2,
    a2_models_count: 4,
    downloads_count: 1200 + id,
    favorites_count: 80 + id,
    url: 'https://www.tone3000.com',
    ...extra,
  }
}

const tones: Tone[] = [
  tone(101, 'Plexi Lead 100', 'amp', 'valve_hunter', ['standard', 'lite'], ['#3b1d6e', '#c2410c']),
  tone(102, 'Tweed Deluxe Edge of Breakup', 'amp-cab', 'small_combo', ['standard', 'lite', 'nano'], ['#78350f', '#facc15']),
  tone(103, 'Green Overdrive 808', 'pedal', 'pedal_shelf', ['lite'], ['#14532d', '#22c55e'], { license: 'cc-by' }),
  tone(104, 'Recto Modern High Gain', 'amp', 'downtuned', ['standard'], ['#111827', '#dc2626'], { license: 'cc-by-nc' }),
  tone(105, 'Vintage 4x12 Greenbacks', 'cab', 'ir_maker', [], ['#1e3a8a', '#38bdf8'], { format: 'ir', a2_models_count: 0, a1_models_count: 0 }),
  tone(106, 'AC30 Top Boost Chime', 'amp-cab', 'valve_hunter', ['standard', 'lite', 'feather'], null),
  tone(107, 'Studio Channel Strip', 'outboard', 'rack_rat', ['standard'], ['#312e81', '#a78bfa'], { a2_models_count: 0 }),
  tone(108, 'Jazz Clean 120', 'amp', 'chorus_on', ['lite'], ['#0f766e', '#99f6e4'], { license: 'cc-by-sa' }),
]

function models(toneId: number): Model[] {
  const m = (n: number, name: string, size: Size, arch: Model['architecture_version'] = '2'): Model => ({
    id: toneId * 10 + n,
    model_url: `https://www.tone3000.com/api/v1/models/${toneId * 10 + n}/download`,
    name,
    size,
    tone_id: toneId,
    architecture_version: arch,
  })
  return [m(1, 'Gain 4 - SM57', 'lite'), m(2, 'Gain 7 - SM57', 'lite'), m(3, 'Gain 7 - SM57', 'standard'), m(4, 'All sizes', 'custom')]
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export const mockBackend: Backend = {
  async user() {
    return me
  },

  async tones(kind) {
    await wait(250)
    const pick: Record<string, number[]> = {
      favorited: [101, 102, 103, 104, 105, 106],
      downloaded: [102, 108],
      created: [],
      trending: [104, 101, 103, 107, 108, 106, 102],
      latest: [108, 107, 106, 105, 104],
    }
    const data = (pick[kind] ?? []).map((id) => tones.find((t) => t.id === id)!)
    return { data, page: 1, totalPages: 1, total: data.length }
  },

  async tone(id) {
    await wait(150)
    const found = tones.find((t) => t.id === id)
    if (!found) throw new AppError('not_found', 'Not found on TONE3000.')
    return found
  },

  async models(toneId) {
    await wait(200)
    const found = tones.find((t) => t.id === toneId)
    return found && found.format === 'nam' && found.a2_models_count > 0 ? models(toneId) : []
  },

  async modelText(model) {
    await wait(350)
    const name = `${tones.find((t) => t.id === model.tone_id)?.title ?? 'Sample'} ${model.name}`
    if (model.size === 'lite') return sampleNam({ seed: model.id, metadata: { name } })
    if (model.size === 'custom') return sampleSlimmableNam(model.id)
    // The 8-channel size: the converter refuses it, as it would the real one.
    return JSON.stringify({ ...sampleModel({ seed: model.id, channels: 8 }), metadata: { name } })
  },
}

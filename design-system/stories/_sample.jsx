// Made-up tones, the ones the app's sample mode shows (src/main/mock.ts). Nothing here is real catalog content.

/** The sample mode's stand-in picture: two colors and a few outlines. */
export function cover(a, b) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="320" height="200" fill="url(#g)"/><g fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3">` +
    `<circle cx="80" cy="150" r="16"/><circle cx="130" cy="150" r="16"/><circle cx="180" cy="150" r="16"/><circle cx="230" cy="150" r="16"/>` +
    `<rect x="32" y="32" width="256" height="76" rx="8"/></g></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const user = (username, is_verified = false) => ({ username, avatar_url: null, is_verified })

export const TONES = [
  { id: 101, title: 'Plexi Lead 100', gear: 'Amp Head', format: 'NAM', user: user('valve_hunter'), image: cover('#3b1d6e', '#c2410c'), fit: 'ready' },
  { id: 102, title: 'Tweed Deluxe Edge of Breakup', gear: 'Amp + Cab', format: 'NAM', user: user('small_combo', true), image: cover('#78350f', '#facc15'), fit: 'ready' },
  { id: 103, title: 'Green Overdrive 808', gear: 'Pedal', format: 'NAM', user: user('pedal_shelf'), image: cover('#14532d', '#22c55e'), fit: 'ready' },
  { id: 104, title: 'Recto Modern High Gain', gear: 'Amp Head', format: 'NAM', user: user('downtuned'), image: cover('#111827', '#dc2626'), fit: 'ready' },
  { id: 105, title: 'Vintage 4x12 Greenbacks', gear: 'Cabinet', format: 'IR', user: user('ir_maker', true), image: cover('#1e3a8a', '#38bdf8'), fit: 'no' },
  { id: 106, title: 'AC30 Top Boost Chime', gear: 'Amp + Cab', format: 'NAM', user: user('valve_hunter'), image: null, fit: 'ready' },
]

export const ME = { username: 'sample_player', avatar_url: null }

// The tokens of the HX3K design system: project/tokens.json and project/tokens.css.
// Values come from src/renderer/src/styles/tokens.css and app.css; the two derived
// colors (--hx-edge, --hx-hover) are the values Chromium resolves their color-mix() to.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const APP_CSS = path.join(HERE, '..', 'src', 'renderer', 'src', 'styles', 'app.css')

const NOT_A_VAR = 'Not a variable in the app'

const color = [
  ['t3k-toggle-on', { dark: '#00d13b' }, "TONE3000's toggle green, declared for parity with its stylesheet but not painted by the app: the on-track of `Toggle` uses `t3k-success`, because this green is 2.06:1 on white in the light theme. Same value in both themes."],
  ['t3k-toggle-off', { dark: '#71717a' }, 'Off-track of `Toggle`, in both themes. 3.67:1 against `t3k-surface` in dark, 4.83:1 in light.'],
  ['t3k-toggle-knob', { dark: '#fff' }, "The knob of `Toggle`, in both themes. 4.83:1 on the off-track. On the dark theme's on-track (`t3k-success`, #00d13b) it is 2.06:1: TONE3000's own pair, kept exact; the knob's position and `aria-checked` carry the state."],
  ['t3k-canvas', { dark: '#000', light: '#fff' }, 'The window itself: the menu, the content area, the TONE3000 stage, and the inside of inputs and selects. Text on it: `t3k-fg`, `t3k-muted-2`, `t3k-muted`, `t3k-link`.'],
  ['t3k-surface', { dark: '#18181b', light: '#fff' }, 'Raised panels: cards, row lists, notices, the splash and setup panels, the dropzone, the Browse button. Equal to `t3k-canvas` in the light theme, where a panel is told apart by its `t3k-line` border alone.'],
  ['t3k-surface-2', { dark: '#27272a', light: '#efefef' }, 'One step above `t3k-surface`: chips, the current menu entry, count badges, avatar fallbacks, picture stand-ins, skeletons, the segmented track, toasts, and hovered panels.'],
  ['t3k-line', { dark: '#3f3f46', light: '#e3e3e3' }, 'Hairlines: card and panel borders, row and setting dividers, the menu and top bar rules, outline buttons, line chips. Decorative (2.01:1 on `t3k-canvas` in dark, 1.28:1 in light): never the only edge of a field, which takes `hx-edge`.'],
  ['t3k-line-strong', { dark: '#71717a', light: '#c9c9c9' }, "The stronger line: a hovered card or outline button, the toast's and `kbd`'s border, the dropzone's dashed edge, the scrollbar thumb, the wave of a missing picture. 4.35:1 on `t3k-canvas` in dark; 1.66:1 in light, so decorative there."],
  ['t3k-fg', { dark: '#fff', light: '#1a1a1a' }, "Primary text and icons on `t3k-canvas`, `t3k-surface` and `t3k-surface-2` (14.9:1 or more in both themes). Also the selected tab's underline, the ring of the current menu entry, the border of a hovered or focused field, `accent-color` and the caret."],
  ['t3k-muted', { dark: '#a1a1aa', light: '#666' }, "Secondary text on `t3k-canvas`, `t3k-surface` and `t3k-surface-2`: page leads, help lines, the uppercase section label (`h2`), a row's second line, the off chip, the unselected tab. 5.81:1 or more in dark, 4.99:1 or more in light."],
  ['t3k-muted-2', { dark: '#d4d4d8', light: '#444' }, 'Between `t3k-fg` and `t3k-muted`, on the same three grounds: menu entries at rest, chip labels, notice and description text, form labels, quiet buttons, creator names. 10.08:1 or more in dark, 8.47:1 or more in light.'],
  ['t3k-accent', { dark: '#fff', light: '#1a1a1a' }, "The neutral strong fill: `btn-accent` (a row's Convert) and the selected segment of a segmented control. It is the text color turned into a fill, so it flips with the theme."],
  ['t3k-on-accent', { dark: '#000', light: '#fff' }, 'Label on a `t3k-accent` fill: 21:1 in dark, 17.4:1 in light.'],
  ['primary-top', { dark: '#0000ff' }, `Top stop of the \`t3k-primary\` gradient, the brand blue of the primary button and of the "3K" half of the logo. ${NOT_A_VAR} (it has only the gradient): named here so the blue shows as a color. Same in both themes. On black it is 2.44:1, so a primary button is told by its label, never by its edge.`],
  ['primary-bottom', { dark: '#0000d0' }, `Bottom stop of the \`t3k-primary\` gradient. ${NOT_A_VAR}; same in both themes.`],
  ['t3k-on-primary', { dark: '#fff' }, 'Label on the `t3k-primary` gradient: 8.59:1 on its top stop, 10.99:1 on its bottom. Same in both themes.'],
  ['t3k-link', { dark: '#6b9bff', light: '#1d5fd1' }, "Links (`.link`, `ExternalLink`), the verified tick, the keyboard focus ring (2px solid, 2px offset) and the selection background. On `t3k-canvas`, `t3k-surface` and `t3k-surface-2`: 5.5:1 or more in dark, 5.06:1 or more in light."],
  ['t3k-success', { dark: '#00d13b', light: '#0a7d3b' }, "Done and convertible: the Toggle's on-track; mixed 82% with `t3k-fg` for success text and icons (`chip-ready`, `row-ok`, the ok toast's icon) and 14% over transparent for the `chip-ready` wash. Never by color alone: it comes with the check icon, a dot and a word, or the saved file's name."],
  ['t3k-danger', { dark: '#ff3b3b', light: '#c8102e' }, "Errors and destructive actions: `btn-danger`'s text and border, `field-error`, `row-bad`, an invalid field's border, the icon of an error notice and toast. As text on `t3k-canvas` and `t3k-surface` (5.01:1 or more in both themes); on `t3k-surface-2` in dark it is 4.21:1, so there it colors icons only. Always with the alert icon or the words."],
  ['t3k-warning', { dark: '#f0b429', light: '#b97f00' }, 'Attention that is not an error: the icon of an info `Notice`; mixed 82% with `t3k-fg` for `row-warn` text ("File not found"); a 22% wash for the sample-mode banner. In light it is 3.44:1 on white: an icon color there, not a text color.'],
  ['hx-edge', { dark: '#7f7f86', light: '#8c8c8c' }, "The border of `.input` and `.select`. In the app it is `color-mix(in srgb, var(--t3k-muted) 75%, var(--t3k-surface))`; these are the values that resolves to. 3:1 or more against the `t3k-canvas` a field sits on (5.28:1 dark, 3.36:1 light)."],
  ['hx-hover', { dark: 'rgba(255, 255, 255, 0.09)', light: 'rgba(26, 26, 26, 0.09)' }, 'The hover wash that shows on any ground: menu entries, outline and quiet buttons. In the app it is `color-mix(in srgb, var(--t3k-fg) 9%, transparent)`; these are the values that resolves to.'],
]

const FIG = 'Figtree Variable'
const JBM = 'JetBrains Mono Variable'
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'
const fonts = [
  { family: FIG, file: 'fonts/figtree-latin-ext-wght-normal.woff2', weight: '300 900', style: 'normal', unicodeRange: LATIN_EXT },
  { family: FIG, file: 'fonts/figtree-latin-wght-normal.woff2', weight: '300 900', style: 'normal', unicodeRange: LATIN },
  { family: JBM, file: 'fonts/jetbrains-mono-cyrillic-ext-wght-normal.woff2', weight: '100 800', style: 'normal', unicodeRange: 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F' },
  { family: JBM, file: 'fonts/jetbrains-mono-cyrillic-wght-normal.woff2', weight: '100 800', style: 'normal', unicodeRange: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116' },
  { family: JBM, file: 'fonts/jetbrains-mono-greek-wght-normal.woff2', weight: '100 800', style: 'normal', unicodeRange: 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF' },
  { family: JBM, file: 'fonts/jetbrains-mono-vietnamese-wght-normal.woff2', weight: '100 800', style: 'normal', unicodeRange: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB' },
  { family: JBM, file: 'fonts/jetbrains-mono-latin-ext-wght-normal.woff2', weight: '100 800', style: 'normal', unicodeRange: LATIN_EXT },
  { family: JBM, file: 'fonts/jetbrains-mono-latin-wght-normal.woff2', weight: '100 800', style: 'normal', unicodeRange: LATIN },
]

const st = (name, fontSize, lineHeight, fontWeight, letterSpacing, sample, usage) => ({ name, fontSize, lineHeight, fontWeight, ...(letterSpacing ? { letterSpacing } : {}), sample, usage })

const type = {
  fonts,
  families: {
    't3k-font': '"Figtree Variable", Figtree, -apple-system, system-ui, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  groups: [
    {
      name: 'Headings',
      family: 't3k-font',
      note: 'The app names no type styles: these are the rules app.css sets on h1, h2 and its title classes, named here. Headings balance their lines (text-wrap: balance).',
      styles: [
        st('heading-screen', '26px', '1.2', 800, '-0.02em', 'Your tones', "`h1`: a screen's title, one per screen, in `t3k-fg`. It names the screen's region and the window (\"Your tones · HX3K\")."),
        st('heading-empty', '17px', '1.2', 700, '-0.01em', 'Nothing converted yet', '`.empty-title`: the title of an empty state, in `t3k-fg`.'),
        st('heading-card', '15px', '1.3', 700, '-0.01em', 'Tweed Deluxe Edge of Breakup', "`.tone-title`: a tone's title on its card, clamped to two lines. 16px in `.more-card`."),
        st('heading-section', '13px', '1.2', 700, '0.08em', 'CONVERSION', '`h2`: the label of a section, set in uppercase by CSS, in `t3k-muted`.'),
      ],
    },
    {
      name: 'Text',
      family: 't3k-font',
      note: 'Paragraphs wrap with text-wrap: pretty, and leads stop at 62ch (48ch in an empty state, 70ch for a description).',
      styles: [
        st('body', '14px', '1.5', 400, '', 'Captures ready for the User IR slots of your HX Stomp.', "`body`: everything that is not named below. `t3k-fg` for content, `t3k-muted` for a screen's lead."),
        st('body-large', '15px', '1.5', 400, '', 'Pick a tone there, and it comes back as the .wav your HX Stomp loads with HXtra.', "`.splash-copy` and the steps of the guide (`.steps-lg`): the few lines a screen exists to say."),
        st('body-small', '13px', '1.5', 400, '', 'Where the .wav files are written.', '`.small`, `.row-sub`, `.meta-row`, `.row-status`, `.field-error`, `.creator`, and the help line of a setting: second lines and metadata.'),
        st('fine-print', '12px', '1.5', 400, '', 'An independent project. Not affiliated with TONE3000, Line 6 or Yamaha Guitar Group.', "`.splash-fine` and the About card's `small`: disclaimers and trademark lines, in `t3k-muted`. The tagline under the logo is the same size at 1.35, the F6 hint at 1.4."),
      ],
    },
    {
      name: 'Controls',
      family: 't3k-font',
      note: 'One line each: a control sets its height, not its line height.',
      styles: [
        st('control', '14px', '1.5', 600, '', 'Convert all (3)', '`.btn`, `.tab`, `.row-title` and the title of a setting.'),
        st('control-large', '15px', '1.5', 600, '', 'Continue', '`.btn-lg`: the one action of the splash, and Browse in an empty state.'),
        st('control-small', '13px', '1.5', 600, '', 'Show in folder', '`.btn-sm`, the buttons of a segmented control, and form labels (`.field label`, `.label`).'),
        st('nav-entry', '14px', '1.5', 500, '', 'Load on the HX Stomp', '`.nav-item` at rest and the signed-in name in the top bar. The current entry is 600.'),
        st('chip-label', '12px', '18px', 500, '', 'A2 Lite · 1,871 weights', '`.chip`: one line, never wrapped.'),
        st('count-badge', '11px', '18px', 600, '', '12', '`.nav-count`: the number of converted captures beside its menu entry.'),
        st('overline', '11px', '1.5', 600, '0.06em', 'POWERED BY', '`.powered`: the uppercase label over the TONE3000 logo at the foot of the menu.'),
        st('banner-label', '12px', '1.5', 600, '', 'Sample mode: TONE3000 is replaced by made-up tones.', '`.banner`: the one-line strip over the top bar. The number in a step is the same size at 700.'),
      ],
    },
    {
      name: 'Mono',
      family: 'mono',
      note: 'For what the user may copy or compare character by character: paths, file names, keys. It breaks anywhere, since those have no spaces.',
      styles: [
        st('mono-text', '12px', '1.5', 400, '', 'Plexi Lead 100 - Gain 4 - SM57 NAM.wav', '`.mono`: file names, the output folder, the publishable key and its input.'),
        st('mono-key', '11px', '16px', 400, '', 'F6', '`kbd`: a key, in a 1px `t3k-line-strong` box with a 4px radius.'),
      ],
    },
  ],
}

const spacing = {
  note: `The app has no spacing variables. These are the steps app.css repeats, named here by their size; in the app's own CSS write the pixels.`,
  tokens: [
    ['space-2', '2px', "Inside the smallest parts: a chip's vertical padding, between a setting's title and its help line."],
    ['space-4', '4px', 'Between menu entries, between tabs, between the lines of a row.'],
    ['space-6', '6px', 'Between chips, between a label and its field, between an icon and a status line.'],
    ['space-8', '8px', "Inside a button (icon to label), between buttons, between the parts of a tone card's body, between stacked toasts."],
    ['space-10', '10px', "A menu entry's padding and gap, a notice's and a toast's icon gap, between steps, a small or quiet button's side padding."],
    ['space-12', '12px', "A row's, a notice's and the top bar's vertical padding; between a section's label and its content; a field's side padding; the menu's side padding."],
    ['space-14', '14px', "A button's side padding; the side padding of rows, notices and toasts; between the parts of a row; between the blocks of a tone's details."],
    ['space-16', '16px', 'Between tone cards; a setting row\'s side padding; between a head and its actions; the content\'s side padding in a narrow window.'],
    ['space-20', '20px', "The menu's top padding, the inset of the toast stack from the corner, the padding of the \"more\" card."],
    ['space-24', '24px', "Between the blocks of a screen (`.page`), and the side padding of an empty state and the dropzone."],
    ['space-28', '28px', "The content area's padding, the top bar's side padding, between a tone's picture and its details."],
  ].map(([name, value, usage]) => ({ name, value, usage: `${usage} ${NOT_A_VAR}.` })),
}

const radius = {
  note: 'Two variables from TONE3000; the other four are literals in app.css, named here by what they are.',
  tokens: [
    { name: 't3k-radius', value: '12px', usage: 'Panels: cards, row lists, tone cards, the splash and setup panels, the dropzone, an empty state, a tone\'s picture.' },
    { name: 't3k-radius-sm', value: '8px', usage: 'Controls and small panels: buttons, inputs, selects, menu entries, notices, toasts, the segmented track, thumbnails, the top corners of a tab.' },
    { name: 'radius-6', value: '6px', usage: `The button inside a segmented control (its 8px track less the 3px padding, rounded up), and the title and block skeletons. ${NOT_A_VAR}.` },
    { name: 'radius-4', value: '4px', usage: `The smallest boxes: \`kbd\`, the origin marker on a thumbnail, a line skeleton. ${NOT_A_VAR}.` },
    { name: 'radius-pill', value: '999px', usage: `Pills: chips, the count badge, the Toggle's track, a chip skeleton. ${NOT_A_VAR}.` },
    { name: 'radius-round', value: '50%', usage: `Discs: avatars, the chip's dot, the spinner, the number of a step, the Toggle's knob. ${NOT_A_VAR}.` },
  ],
}

const shadow = {
  note: 'One shadow in the whole app. Everything else is set apart by a ground step and a 1px line.',
  tokens: [{ name: 'shadow-toast', value: { dark: '0 10px 30px rgb(0 0 0 / 0.35)' }, usage: `The toast, the only thing that floats over the screen. The same in both themes. ${NOT_A_VAR}.` }],
}

const gradient = {
  note: 'The one gradient: TONE3000\'s primary blue.',
  tokens: [
    {
      name: 't3k-primary',
      value: 'linear-gradient(180deg, #00f, #0000d0)',
      usage: 'The fill of `btn-primary`: the one primary action of a screen (Continue, Save key, Convert all, Connect). Used as `background`, never as a text color. Hover is `filter: brightness(1.18)`. Its two stops are the colors `primary-top` and `primary-bottom`.',
    },
  ],
}

export const tokens = {
  name: 'HX3K',
  version: 1,
  color: {
    themes: [
      { id: 'dark', name: 'Dark' },
      { id: 'light', name: 'Light' },
    ],
    tokens: color.map(([name, value, usage]) => ({ name, value, usage })),
  },
  type,
  spacing,
  radius,
  shadow,
  gradient,
}

// ─── tokens.css, laid out as the design system page compiles it ──────────────

const esc = (n) => n.replace(/\./g, '\\.')
const comment = (u, on) => (on && u ? ' /* ' + u.replace(/\*\//g, '* /').replace(/<\//g, '< /').replace(/[\r\n\f]+/g, ' ').trim() + ' */' : '')
const alias = (v) => (/^\{([A-Za-z0-9][A-Za-z0-9_.-]{0,63})\}$/.exec(v) || [])[1]

export function compile(t, { usageComments = false, styleVars = false, fontFaces = true, fontSrc = (f) => f } = {}) {
  const out = []
  const themes = t.color.themes
  const first = themes[0].id
  const colors = t.color.tokens
  const shadows = t.shadow?.tokens ?? []
  const decl = (tok, v, c) => `  --${esc(tok.name)}: ${alias(v) ? `var(--${esc(alias(v))})` : v};${comment(tok.usage, c && usageComments)}`
  if (colors.length || shadows.length) {
    out.push(`:root, [data-theme="${first}"] {`)
    for (const c of colors) out.push(decl(c, c.value[first], true))
    for (const s of shadows) out.push(`  --${esc(s.name)}: ${s.value[first]};${comment(s.usage, usageComments)}`)
    out.push('}')
    for (const th of themes.slice(1)) {
      const lines = [
        ...colors.filter((c) => c.value[th.id] !== undefined || alias(c.value[first])).map((c) => decl(c, c.value[th.id] ?? c.value[first], false)),
        ...shadows.filter((s) => s.value[th.id] !== undefined).map((s) => `  --${esc(s.name)}: ${s.value[th.id]};`),
      ]
      if (lines.length) out.push(`[data-theme="${th.id}"] {`, ...lines, '}')
    }
  }
  const root = []
  for (const x of t.spacing?.tokens ?? []) root.push(`  --${esc(x.name)}: ${x.value};${comment(x.usage, usageComments)}`)
  for (const x of t.radius?.tokens ?? []) root.push(`  --${esc(x.name)}: ${x.value};${comment(x.usage, usageComments)}`)
  for (const key of Object.keys(t)) {
    if (['name', 'version', 'color', 'type', 'spacing', 'radius', 'shadow', 'meta'].includes(key)) continue
    for (const x of t[key].tokens ?? []) root.push(`  --${esc(x.name)}: ${x.value};${comment(x.usage, usageComments)}`)
  }
  for (const [k, v] of Object.entries(t.type.families)) root.push(`  --font-${esc(k)}: ${v};`)
  if (styleVars) {
    for (const g of t.type.groups)
      for (const s of g.styles) {
        const fam = s.family || g.family
        root.push(`  --text-${esc(s.name)}: ${s.fontWeight} ${s.fontSize}/${s.lineHeight}${fam ? ` var(--font-${esc(fam)})` : ' inherit'};${comment(s.usage, usageComments)}`)
      }
  }
  if (root.length) out.push(':root {', ...root, '}')
  for (const g of t.type.groups)
    for (const s of g.styles) {
      const fam = s.family || g.family
      out.push(`.${esc(s.name)} {`, ...(fam ? [`  font-family: var(--font-${esc(fam)});`] : []), `  font-size: ${s.fontSize};`, `  line-height: ${s.lineHeight};`, `  font-weight: ${s.fontWeight};`, `  letter-spacing: ${s.letterSpacing ?? '0'};`, '}')
    }
  if (fontFaces) {
    for (const f of t.type.fonts) {
      out.push('@font-face {', `  font-family: "${f.family}";`, `  src: url("${fontSrc(f.file)}") format("woff2");`, `  font-weight: ${f.weight};`, `  font-style: ${f.style};`, '  font-display: swap;', ...(f.unicodeRange ? [`  unicode-range: ${f.unicodeRange};`] : []), '}')
    }
  }
  return out.join('\n') + '\n'
}

/** Writes both files under `OUT` (a project/ folder whose fonts/ is already filled) and checks every value against the grammar the page reads. */
export function writeTokens(OUT) {
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'tokens.json'), JSON.stringify(tokens, null, 2) + '\n')
  fs.writeFileSync(path.join(OUT, 'tokens.css'), '/* HX3K — generated from tokens.json */\n' + compile(tokens, { usageComments: true, styleVars: true }))
  // Every value against the grammar the page reads.
  const name = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/
  const hex = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/
  const fn = /^(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\([0-9a-z.,%/ \-]{1,60}\)$/
  const len = /^-?\d{1,4}(?:\.\d{1,6})?(?:px|rem|em|%)$|^0$/
  const seen = new Set()
  const bad = []
  const once = (n) => (!name.test(n) || seen.has(n) ? bad.push('name ' + n) : seen.add(n))
  for (const c of tokens.color.tokens) {
    once(c.name)
    for (const v of Object.values(c.value)) if (!hex.test(v) && !fn.test(v)) bad.push('color ' + c.name + ' ' + v)
    if (c.usage.length > 1000) bad.push('usage ' + c.name)
  }
  for (const x of [...tokens.spacing.tokens, ...tokens.radius.tokens]) {
    once(x.name)
    if (!len.test(x.value)) bad.push('length ' + x.name)
  }
  for (const x of tokens.shadow.tokens) {
    once(x.name)
    for (const v of Object.values(x.value)) if (!/^[a-z0-9 #%(),./+-]{1,400}$/.test(v)) bad.push('shadow ' + x.name)
  }
  for (const x of tokens.gradient.tokens) {
    once(x.name)
    if (!/^[A-Za-z0-9 #%(),./+_-]{1,200}$/.test(x.value) || /(?:url|var|expression|image|image-set|src)\s*\(/i.test(x.value)) bad.push('extra ' + x.name)
  }
  const styles = new Set()
  for (const g of tokens.type.groups)
    for (const s of g.styles) {
      if (!name.test(s.name) || styles.has(s.name)) bad.push('style ' + s.name)
      styles.add(s.name)
      if (!len.test(s.fontSize)) bad.push('fontSize ' + s.name)
      if (!/^\d(?:\.\d{1,6})?$/.test(s.lineHeight) && !len.test(s.lineHeight)) bad.push('lineHeight ' + s.name)
      if (s.letterSpacing && !len.test(s.letterSpacing)) bad.push('letterSpacing ' + s.name)
      if (s.sample.length > 200 || s.usage.length > 1000) bad.push('long ' + s.name)
    }
  for (const f of tokens.type.fonts) {
    if (!/^U\+[0-9A-Fa-f]{1,6}(?:-[0-9A-Fa-f]{1,6})?(?:, ?U\+[0-9A-Fa-f]{1,6}(?:-[0-9A-Fa-f]{1,6})?)*$/.test(f.unicodeRange)) bad.push('range ' + f.file)
    if (!fs.existsSync(path.join(OUT, f.file))) bad.push('missing ' + f.file)
  }
  for (const [k, v] of Object.entries(tokens.type.families)) if (!/^[^;{}<>()\\\r\n\f]{1,200}$/.test(v)) bad.push('family ' + k)
  // A type style's class must not land on a class the app's own stylesheet uses.
  const appCss = fs.readFileSync(APP_CSS, 'utf8')
  for (const s of styles) if (new RegExp('\\.' + s + '(?![\\w-])').test(appCss)) bad.push('class clash ' + s)
  if (bad.length) throw new Error('tokens: ' + bad.join(' | '))
  return `${tokens.color.tokens.length} colors, ${styles.size} type styles, ${tokens.spacing.tokens.length} spacing steps, ${tokens.radius.tokens.length} radii, ${tokens.type.fonts.length} font files`
}

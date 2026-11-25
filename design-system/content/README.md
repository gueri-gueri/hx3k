# HX3K — building with this system

HX3K is a desktop app (Electron) that turns TONE3000 NAM captures into IR files for the HX Stomp. Its look is
TONE3000's: near-black canvas, zinc surfaces, Figtree, a blue gradient for the one primary action per screen.
Dark is the default theme; light exists.

## Read before designing

- `brand/1-foundations.md` — color, type, space, shape, sizes, layout, states and motion, with the measured contrast of every pair.
- `brand/2-content.md` — the voice, casing, names, numbers, and how leads, empty states and errors are worded.
- `brand/3-iconography.md` — the 15 icons, HX3K's logo, and the rules for TONE3000's logos.
- `brand/4-accessibility.md` — structure, keyboard, what is announced, names.
- `brand/5-screens.md` — the nine screens, how a screen is put together, and where feedback goes.

## Setup

Wrap everything in `HX3KProvider`. `Creator`, `FitChip`, `BrowseButton` and `ExternalLink` read the app
context and throw ("useApp outside the app") without it.

```jsx
const { HX3KProvider, Creator, FitChip, Notice } = window.HX3K;
<HX3KProvider theme="dark" lang="en">{/* screens */}</HX3KProvider>
```

- `theme`: `'dark'` | `'light'` — set on `<html data-theme>`, which is what every `--t3k-*` color keys off.
- `lang`: `'en'` | `'pt-BR'` — the components' own strings (chip labels, "Browse TONE3000").
- `surface`: paints the canvas behind children. Only needed when the host page background is not the app's.
- The stylesheet styles `body` as the app shell: canvas background, `overflow: hidden`, `user-select: none`.
  A full-page design must scroll inside its own container (as the app's `.content` does), not on `body`.

## Two kinds of card

- **Bundle components** (group "general", 15): the app's real React components at `window.HX3K.*`. Mount them; never rebuild one by hand.
- **Patterns and screens** (27): what the app builds from CSS classes alone, with no component of its own. Each card's
  README begins "A CSS pattern, not a bundle export" or "A showcase of the app's own screen": there is nothing to mount.
  Copy the markup of its examples and keep its classes.

| Group | Cards |
|---|---|
| Actions | `Button` |
| Navigation | `Sidebar`, `Tabs`, `Pager` |
| Data display | `Chip`, `ToneCard`, `Rows` |
| Feedback | `EmptyState`, `Toast`, `Banner`, `Skeleton` (and the bundle's `Notice`, `Spinner`) |
| Forms | `Field`, `Select`, `Segmented`, `SettingsCard`, `Dropzone` (and the bundle's `Toggle`) |
| Layout | `PageHead`, `Steps` |
| Screens | `ScreenTones` (the shell), `ScreenTone`, `ScreenConverted` (the menu as a rail), `ScreenLocalFiles`, `ScreenGuide`, `ScreenSettings`, `ScreenSplash`, `ScreenSetup`, `ScreenTone3000` |

## Styling idiom: the app's classes + `--t3k-*` tokens

Style with the existing classes from `components/bundle.css`; color only through `var(--t3k-*)`. Never hard-code hex.

| Family | Classes / tokens |
|---|---|
| Buttons | `btn` + one of `btn-primary` (blue gradient, one per screen), `btn-accent`, `btn-outline`, `btn-quiet`, `btn-danger`; size `btn-sm`, `btn-lg` |
| Chips | `chip`, `chip-line`, `chip-ready`, `chip-off`, with a `dot` span |
| Layout | `shell` (232px sidebar + main), `sidebar`, `main`, `topbar`, `content` (scrolls), `page` (max 1120px column, 24px gap), `page-narrow` (760px), `page-head`, `section`, `actions` |
| Panels | `card` + `setting` rows, `rows` + `row`, `tone-grid` + `tone-card`, `notice`, `empty`, `dropzone` |
| Forms | `field`, `input`, `input-row`, `select-wrap` + `select`, `segmented`, `toggle`, `field-error` |
| Text | `link`, `muted`, `small`, `mono`, `selectable`, `sr-only` |
| Color | `--t3k-canvas`, `--t3k-surface`, `--t3k-surface-2`, `--t3k-line`, `--t3k-line-strong`, `--t3k-fg`, `--t3k-muted`, `--t3k-muted-2`, `--t3k-accent`, `--t3k-on-accent`, `--t3k-primary`, `--t3k-on-primary`, `--t3k-link`, `--t3k-success`, `--t3k-danger`, `--t3k-warning`; the app's own `--hx-edge` (field borders) and `--hx-hover` (hover wash) |
| Type / shape | `--t3k-font` (Figtree), `--t3k-font-mono` (JetBrains Mono); `--t3k-radius` 12px, `--t3k-radius-sm` 8px; base text 14px/1.5 |

### Which names exist where

- `--t3k-*` and `--hx-*` are variables of the app's own CSS (`components/bundle.css`). Use them anywhere.
- Unprefixed tokens (`--primary-top`, `--primary-bottom`, `--space-2` to `--space-28`, `--radius-6`, `--radius-4`, `--radius-pill`,
  `--radius-round`, `--shadow-toast`) name values that app.css writes as literals. They exist in this system's `tokens.css` and
  `tokens.json`, for designs made with it; in the app's own code write the value.
- The type styles (`heading-screen`, `body`, `control`, `mono-text` and the rest: classes and `--text-*` shorthands in `tokens.css`)
  name the sizes and weights app.css sets on `h1`, `h2`, `body` and its classes. Inside the app's markup the app's own classes already
  carry them; use the type classes on slides and canvases, where that stylesheet is not loaded.

Gotchas:
- `Spinner` is an inline span sized by width/height: put it in a flex parent (a `btn`, or a flex column).
- `ToneImage` needs a sizing class: `tone-image` (16:10, full width) is the card one.
- `Icon` names: tones, wave, file, guide, settings, folder, external, back, close, check, alert, trash,
  refresh, upload, info. Icons inherit `currentColor`.
- Brand: the full `Tone3000Logo` before the short `T3KMark`; the mark goes in compact spots (buttons, origin markers).
- Two widths change the layout: at 1040px and under a tone's picture stacks over its details; at 720px and under the menu is a rail of icons.
- The status greens, ambers and reds of chips, rows and toasts are `color-mix()` recipes, not variables: copy them from `brand/1-foundations.md`.

## Where the truth lives

- `components/bundle.css` — every class above, and the component styles.
- `tokens.css` / `tokens.json` — the `--t3k-*` values per theme, with a usage note on each; the type scale; the spacing steps and radii.
- `components/<Name>/README.md` and `components/index.d.ts` — each component's props and examples.
- `brand/*.md` — the rules.
- `fonts/` — Figtree Variable and JetBrains Mono Variable (SIL Open Font License 1.1), the files the app ships. `components/bundle.css` embeds the same files.
- `assets/Logos/` and `assets/TONE3000/` — the logo files, for surfaces that cannot mount the logo components. They are uploads: each one's id is in `design-system.json` under `assetGroups.<Group>.files.<name>.blob`, and its address is `/_blob/<id>`. Each group's `README.md` says which file is for what.

## Example

```jsx
const { HX3KProvider, Creator, FitChip, Notice, Icon } = window.HX3K;
<HX3KProvider>
  <div className="page">
    <Notice>Converted captures are User IR .wav files for HXtra's NAM A2 Lite block.</Notice>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Creator user={{ username: 'fluxtone', avatar_url: null, is_verified: true }} />
      <FitChip fit="ready" />
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" className="btn btn-primary">Convert</button>
      <button type="button" className="btn btn-outline btn-sm"><Icon name="folder" />Show in folder</button>
    </div>
  </div>
</HX3KProvider>
```

# HX3K (hx3k@0.1.0)

This design system is the published hx3k React library, bundled as a single
browser global. All 15 components are the real upstream code.

## Where things are

- `components/bundle.js` — every component, as one script that sets `window.HX3K`.
- `components/bundle.css` — the one stylesheet: the library's tokens and component styles, joined.
- `components/<Name>/README.md` (usage, example JSX), `components/<Name>/preview.html` (the live preview), `components/index.d.ts` (every `<Name>Props`).
- `tokens.json` — the tokens this system's pages show, read from the library's custom properties; `tokens.css` is the same as CSS.

For a specific component, read `components/<Name>/README.md`.

## Loading

What to load, and in what order, is under "Consuming this system" at the end of this file.

Components are then available at `window.HX3K.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Avatar } = window.HX3K;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Avatar />);
```

Wrap the tree in the provider — most components read theme/i18n from context:

```jsx
<HX3KProvider surface={true}>{children}</HX3KProvider>
```

## Tokens

25 CSS custom properties from hx3k. Names are
preserved verbatim from upstream. They are declared inside `components/bundle.css`.

- **color** (20): `--t3k-canvas`, `--t3k-surface`, `--t3k-surface-2`, `--t3k-line`, `--t3k-line-strong`, `--t3k-fg`, `--t3k-muted`, `--t3k-muted-2`, `--t3k-accent`, `--t3k-on-accent`, `--t3k-on-primary`, `--t3k-link`, `--t3k-success`, `--t3k-danger`, `--t3k-warning`, `--t3k-toggle-on`, `--t3k-toggle-off`, `--t3k-toggle-knob`, `--hx-edge`, `--hx-hover`
- **gradient** (1): `--t3k-primary`
- **typography** (2): `--t3k-font`, `--t3k-font-mono`
- **radius** (2): `--t3k-radius`, `--t3k-radius-sm`

## Components

### general
- `Avatar`
- `BrowseButton`
- `Creator`
- `ExternalLink`
- `FitChip`
- `Hx3kLogo`
- `Hx3kMark`
- `Icon`
- `Notice`
- `Spinner`
- `T3KMark`
- `Toggle`
- `Tone3000Logo`
- `ToneImage`
- `Verified`

### Patterns and screens (CSS classes, not bundle exports)
- Actions: `Button`
- Navigation: `Sidebar`, `Tabs`, `Pager`
- Data display: `Chip`, `ToneCard`, `Rows`
- Feedback: `EmptyState`, `Toast`, `Banner`, `Skeleton`
- Forms: `Field`, `Select`, `Segmented`, `SettingsCard`, `Dropzone`
- Layout: `PageHead`, `Steps`
- Screens: `ScreenTones`, `ScreenTone`, `ScreenConverted`, `ScreenLocalFiles`, `ScreenGuide`, `ScreenSettings`, `ScreenSplash`, `ScreenSetup`, `ScreenTone3000`

---

## Consuming this system (generated — do not edit)

Every path named in this file is under `project/` in this design system: read `project/components/bundle.js`, not `components/bundle.js`.

`components/bundle.js` defines `window.HX3K` (15 components). `components/bundle.css` is its stylesheet, with the library's own custom properties in it. `tokens.css` holds the tokens the pages of this system show. The bundle reads `window.React` and `window.ReactDOM`; `components/lib/react.js` sets both (React 19.3.1, the version the library was built against).
Build any UI by mounting these components. Never hand-build a control the system provides.

- **Any page:** load, in this order, `tokens.css`, `components/bundle.css`, `components/lib/react.js` and `components/bundle.js`. A script here is a classic script, not a module.
- **Design canvas:** copy `tokens.css`, `components/bundle.css`, `components/bundle.js` and `components/index.d.ts` in full, each to the same path under the canvas's `project/ds/<folder>/`. Link the stylesheets in that order, before the script. Leave `components/lib/` out: the artboard supplies React. The editor's Properties panel reads each component's props from `components/index.d.ts`. Mount a component with `<x-import component-from-global-scope="HX3K.<Comp>">`.
- **Slides deck, or any surface that cannot run the bundle:** take `tokens.json`; a deck mounts no components.

**Where to read more:** a component's props: `<Comp>Props` in `components/index.d.ts`; how to use a component, with examples: `components/<Comp>/README.md`; token values: `tokens.json`.

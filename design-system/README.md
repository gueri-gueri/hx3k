# The HX3K design system, the hand-authored part

The HX3K design system is published as a Claude artifact. It has two halves:

- **What `/design-sync` builds from the app.** The 15 React components of `src/renderer/src/components/`, bundled as
  `components/bundle.js`, `bundle.css` and `lib/react.js`, with a card for each.
- **What this folder builds.** The tokens with their usage notes, the type scale, the fonts, the brand book, the
  cover, and 27 cards for what the app makes out of CSS classes alone: 18 patterns (buttons, chips, tabs, rows,
  forms…) and its 9 screens.

Nothing here is used by the app or packaged with it.

## What is where

| Path | What it is |
|---|---|
| `tokens.mjs` | Every token, with its usage note. Writes `tokens.json` and `tokens.css`. |
| `cards.json` | One entry per card: its group, how its stories are laid out, the width and height of its frame. |
| `stories/<Name>.jsx` | A card's examples, each an `export const Name = () => (…)`. |
| `stories/_sample.jsx`, `stories/_shell.jsx` | Shared by the screens: the sample mode's made-up tones (as `src/main/mock.ts`), and the app's shell. |
| `docs/<Name>.md` | A card's guidelines. Its first sentence is the card's summary. |
| `content/` | Published as it is: the system's `README.md`, the five sections of the brand book, the note of each asset group. |
| `cover.mjs` | The cover. |
| `build.mjs` | Builds all of it into `dist/project/`. |
| `check.mjs` | Renders the built cards and says what is wrong with them. |

## Building

The fonts are copied from the app's own `@fontsource-variable` packages, so install the app first.

```bash
npm install                # at the root of the repository
cd design-system
npm install
npm run build
```

`dist/project/` then holds 73 files, each at the path it has in the design system. `npm run build -- Button` rebuilds
one card.

## Checking

The cards are drawn with the app's real stylesheet and components, which `/design-sync` builds and this folder does
not. Download `bundle.css`, `bundle.js` and `lib/react.js` from the design system's `project/components/` into a
folder, keeping `lib/`, and point the check at it:

```bash
npm run check -- ../path/to/bundle                  # every card, dark theme
npm run check -- ../path/to/bundle --theme light Button Rows
```

It reports script errors, a story that did not mount, content wider than its frame, and a height that no longer
matches `cards.json`. Screenshots go to `dist/shots/`. It needs a browser: `npx playwright-core install chromium`
at the root, or `HX3K_CHROME=/path/to/chrome`.

A card is drawn with the stylesheet in that bundle, not with `src/renderer/src/styles/`. After changing the app's
CSS, sync first, then check.

## Writing a card

- Copy the app's markup and keep its classes. A story recreates what a view renders; it does not design.
- Use the app's own words, from `src/renderer/src/i18n/en.ts`, and the sample mode's tones.
- The 15 bundle components and `useState`, `useRef`, `Fragment` are in scope without an import.
- Stories show in the order the file gives them, and their source is printed in the card's README as its examples:
  keep each one whole and readable.
- In `cards.json`: `mode` is `grid` (cells side by side), `column` (one per row) or `single` (the first story, edge
  to edge). A screen is `single` with `"surface": false` and `"page": true`, and states its own `height`. Give a
  `width` to any card whose layout depends on the window's (the breakpoints are 720px and 1040px). For the other
  cards, `height` is what the check measures.

## Tokens

- Values are exactly those of `src/renderer/src/styles/tokens.css` and `app.css`. `--t3k-*` and `--hx-*` are
  variables of the app. Unprefixed names (`space-8`, `radius-pill`, `primary-top`, `shadow-toast`) and the type
  styles are this system's names for values the app writes as literals, and each usage note says so.
- A type style becomes a CSS class of the same name, so it must not be a class `app.css` already uses. The build
  fails if it is.
- The contrast figures in the usage notes and in `content/brand/1-foundations.md` were measured in a browser, in
  both themes. Measure again when a color changes.

## Publishing

From a Claude Code session, ask for `design-system/dist` to be published to the HX3K design system. Each file goes
at its path under `project/`; a `preview.html` is sent as `text/plain`, like the synced ones.

Two things are not built here and stay in the artifact:

- Its index, `project/design-system.json`. It is read from the artifact right before publishing, and only its
  `lastChange` is set (and an asset's record, when a logo changes).
- The logo files, which are uploads. Their sources are `src/renderer/src/assets/logo/`, `src/renderer/src/assets/brand/`
  and `build/icon.*`.

## What `/design-sync` also writes

`README.md`, `tokens.json` and `tokens.css` are written by `/design-sync` too, from what it reads in the code: no
usage notes, no type scale, no spacing. After a sync, build and publish again.

The last part of `content/README.md`, from "# HX3K (hx3k@0.1.0)" down, is the sync's own text with the token and
card lists corrected. If a sync changes it (a new component, a new version), carry that change over by hand.

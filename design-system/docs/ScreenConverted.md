The converted captures, shown in a window 720px wide or less: the menu is a rail of icons and the screen keeps the width.

A showcase of the app's own screen, not a component: there is nothing to mount. Source: `src/renderer/src/views/Converted.tsx`, and the last media query of `styles/app.css`.

## The rail

The window is never narrower than 960px, so this is what the default window looks like zoomed to 200%. At `max-width: 720px`:

- `shell` is 60px and the rest; the menu's padding is 12px 8px.
- The logo, the tagline, the entries' words, the count, and "Powered by" hide. `Hx3kMark` (36px) and the T3K marks show (`when-rail`).
- An entry is a centered icon with 10px above and below; its `aria-label` keeps its name.
- The top bar and the banner take 16px side padding, the content 20px 16px 40px.

Nothing else changes: rows and heads already wrap.

## This screen

`page-head` with the title, its lead and two outline actions (How to load them, Open folder); the `Notice` that says what the .wav is; then `Rows`, one per capture. Empty: an `EmptyState` with a title, the `BrowseButton` and "Convert local files".

`Shell` in the example is the `ScreenTones` card's wrapper; it is not exported.

The app's window and its home screen: the menu, the top bar, and the user's tone lists.

A showcase of the app's own screen, not a component: there is nothing to mount. Build a new screen from the cards it is made of. Source: `src/renderer/src/App.tsx` and `ToneLists` in `views/Tones.tsx`. The window opens at 1240 by 840 and goes no smaller than 960 by 640.

## The shell

| Class | What it is |
|---|---|
| `shell` | The window: a grid of 232px and the rest, full height. |
| `sidebar` | The menu (the `Sidebar` card). |
| `main` | The right column: banner, top bar, content, with the toasts over its corner. |
| `banner` | Optional, first (the `Banner` card). |
| `topbar` | 61px at least, a `t3k-line` rule under it, its content at the right: "Signed in as", an `Avatar` at 24px, `@username`. Only while signed in, and never on the TONE3000 screen, which shows that itself. |
| `content` | The scrolling region: 28px padding (48px at the bottom). It is the `<main>`, named by the screen's `h1`, and takes focus when the screen changes. |
| `page` | The column inside: 1120px at most, 24px between blocks. |

`body` is the shell's ground and does not scroll (`overflow: hidden`, `user-select: none`): a design built with this stylesheet scrolls inside `content`.

## This screen

`page-head` with the title, the `Tabs`, then the `tone-grid` of `ToneCard`s ending with the "more" card, then the `Pager`. Empty: an `EmptyState` with the `BrowseButton`. Loading: eight skeleton cards. Failed: a `Notice kind="error"` with a "Try again" link.

`Shell` in the example is this card's own wrapper around the classes above; it is not exported.

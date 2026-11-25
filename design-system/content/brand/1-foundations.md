# Visual foundations

HX3K wears TONE3000's look: a black window, zinc panels drawn with hairlines, white type in Figtree, and one blue. Nothing is decorated. A screen is a column of plain panels, and color appears only where it means something.

## Color

Set the theme with `data-theme="dark"` or `"light"` on `<html>`; every `--t3k-*` color follows it. Dark is the default and the one to design in first. The app's third setting, System, follows the operating system.

- **Three grounds.** `t3k-canvas` is the window. `t3k-surface` is a panel on it (cards, rows, notices). `t3k-surface-2` is a part on a panel (chips, the current menu entry, skeletons, toasts). Never skip a step, and never put a fourth on top.
- **A panel is drawn, not shaded.** Every panel has a 1px `t3k-line` border. In the light theme `t3k-surface` and `t3k-canvas` are the same white, so the line is all that separates them.
- **Three text steps.** `t3k-fg` for content, `t3k-muted-2` for what supports it (labels, notices, menu entries at rest), `t3k-muted` for what can be skipped (leads, help lines, section labels).
- **One blue, once.** `t3k-primary` is a gradient and fills exactly one button per screen: the thing the screen is for. It is a `background`, never a text color and never a border. Links, the focus ring and the verified tick use `t3k-link`, a lighter blue made to be read.
- **White is the second voice.** `t3k-accent` (the text color as a fill) is for the action of a row and the selected segment.
- **Status comes with a word or an icon.** Green, amber and red are never the only sign: success has the check, a dot or "Saved as…"; a failure has the alert icon and a sentence.

### Status recipes

The app mixes its status colors where it uses them. These are not variables: write the `color-mix()` as the app does.

| Role | In app.css | Dark | Light |
|---|---|---|---|
| Success text and icon (`chip-ready`, `row-ok`, ok toast) | `color-mix(in srgb, var(--t3k-success) 82%, var(--t3k-fg))` | `#2ed95e` | `#0d6b35` |
| Success wash (`chip-ready`) | `color-mix(in srgb, var(--t3k-success) 14%, transparent)` | 14% of `#00d13b` | 14% of `#0a7d3b` |
| Warning text (`row-warn`) | `color-mix(in srgb, var(--t3k-warning) 82%, var(--t3k-fg))` | `#f3c250` | `#9c6d05` |
| Warning wash (`banner`) | `color-mix(in srgb, var(--t3k-warning) 22%, transparent)` | 22% of `#f0b429` | 22% of `#b97f00` |
| Danger wash (`btn-danger` hover) | `color-mix(in srgb, var(--t3k-danger) 12%, transparent)` | 12% of `#ff3b3b` | 12% of `#c8102e` |
| Danger edge (`notice-error`) | `color-mix(in srgb, var(--t3k-danger) 55%, transparent)` | 55% of `#ff3b3b` | 55% of `#c8102e` |
| Spinner track | `color-mix(in srgb, currentColor 25%, transparent)` | | |
| Origin marker (`thumb-mark`) | `rgb(0 0 0 / 0.72)` | the same in both themes | |

### Contrast, measured

Ratios of each pair as the app paints it (WCAG 2), lowest ground first.

| Text or mark | On | Dark | Light |
|---|---|---|---|
| `t3k-fg` | canvas · surface · surface-2 | 21.0 · 17.7 · 14.9 | 17.4 · 17.4 · 15.1 |
| `t3k-muted-2` | canvas · surface · surface-2 | 14.2 · 12.0 · 10.1 | 9.7 · 9.7 · 8.5 |
| `t3k-muted` | canvas · surface · surface-2 | 8.2 · 6.9 · 5.8 | 5.7 · 5.7 · 5.0 |
| `t3k-link` | canvas · surface · surface-2 | 7.8 · 6.5 · 5.5 | 5.8 · 5.8 · 5.1 |
| `t3k-danger` | canvas · surface · surface-2 | 5.9 · 5.0 · **4.2** | 5.9 · 5.9 · 5.1 |
| Success text | surface · its own wash | 9.5 · 7.4 | 6.6 · 5.5 |
| Warning text | surface | 10.7 | 4.6 |
| `t3k-warning` (icons only) | surface | 9.5 | **3.4** |
| `t3k-on-primary` | the gradient, top · bottom | 8.6 · 11.0 | 8.6 · 11.0 |
| `t3k-on-accent` | `t3k-accent` | 21.0 | 17.4 |
| `hx-edge` (field border) | canvas | 5.3 | 3.4 |
| `t3k-line` (hairline) | canvas · surface | 2.0 · 1.7 | 1.3 · 1.3 |
| `t3k-toggle-knob` | on-track · off-track | **2.1** · 4.8 | 5.2 · 4.8 |

What the bold figures mean in use: `t3k-danger` is for icons, not text, on `t3k-surface-2` in dark; `t3k-warning` is an icon color in light; the Toggle's knob on its green track in dark is TONE3000's own pair, and its position carries the state. `t3k-line` is decoration by design, which is why a field takes `hx-edge` instead.

## Type

Two families, both variable, both shipped with the system: **Figtree** (`--t3k-font`, weights 300 to 900) for everything, **JetBrains Mono** (`--t3k-font-mono`) for what is copied or compared character by character: paths, file names, keys.

- The base is 14px on a 1.5 line. Text is never smaller than 11px, and 11px is only for the count, the "Powered by" label and a key. (An avatar's initial is decoration and scales with the avatar.)
- A screen has one `h1` (`heading-screen`, 26px, weight 800). There is no second level of headline: `h2` is a 13px uppercase label in `t3k-muted` (`heading-section`), and a card's title is 15px (`heading-card`).
- Weight does the work size does elsewhere: 400 for text, 500 for a menu entry and a chip, 600 for controls and row titles, 700 for titles, 800 for the screen title.
- Uppercase is set by CSS in two places only: the section label and "Powered by". Write both in sentence case.
- Leads stop at 62ch, an empty state's text at 48ch, a description at 70ch. Headings balance (`text-wrap: balance`), paragraphs wrap `pretty`.
- A title on a card is clamped to two lines, a long description to four with "Read more". File names and paths break anywhere (`overflow-wrap: anywhere`) and are never cut.
- Interface text cannot be selected (`user-select: none` on `body`). Add `selectable` to what a user would copy: titles, file names, paths, error text.

## Space

The app has no spacing variables; app.css repeats a short set of steps. Tokens `space-2` to `space-28` name them for use in designs made with this system.

| Step | Where |
|---|---|
| 2 · 4 · 6 | Inside a part: chip padding, between menu entries, between chips, label to field. |
| 8 · 10 | Inside a control and between controls: icon to label, between buttons, a menu entry's padding. |
| 12 · 14 · 16 | Inside a panel: row and notice padding, a setting's padding, between cards in a grid. |
| 20 · 24 · 28 | The screen: 24 between a screen's blocks, 28 around the content area. |

Larger distances appear once each and belong to their part: 32 inside the setup panel, 40 by 36 inside the splash, 44 above and below the dropzone's text, 48 under the content, 56 above and below an empty state.

## Shape

| What | Value |
|---|---|
| Panels: cards, rows, tone cards, dropzone, empty state, pictures | `t3k-radius`, 12px |
| Controls and small panels: buttons, fields, menu entries, notices, toasts | `t3k-radius-sm`, 8px |
| A button inside the segmented track; title and block skeletons | 6px |
| `kbd`, the origin marker, a line skeleton | 4px |
| Chips, the count, the Toggle's track | 999px |
| Avatars, the dot, the spinner, a step's number, the Toggle's knob | 50% |

- **Borders, not shadows.** Everything is a 1px line: `t3k-line` at rest, `t3k-line-strong` on hover and on what floats. The only shadow is the toast's (`shadow-toast`).
- **Dashed means "not yet".** A dashed edge marks a place for something that is not there: the empty state (1px `t3k-line`), the "more" card, the dropzone (1.5px `t3k-line-strong`).
- A ring instead of a border where the box must not grow: the current menu entry (inset 1px `t3k-fg`), a line chip (inset 1px `t3k-line`), a focused field (1px `t3k-fg` outside its border).

## Sizes

| Part | Size |
|---|---|
| Button | 36px tall; `btn-sm` 30px; `btn-lg` 44px |
| Input, select | 38px tall |
| Toggle | 42 by 24px, an 18px knob |
| Icon | 16px; 14px in a status line, 26px in the dropzone, 34px as a card's missing picture, 22px as a thumbnail's |
| Avatar | 22px; 24px in the top bar, 26px on a tone's screen, 14px in a chip |
| Menu | 232px wide; 60px as a rail |
| Top bar | 61px at least |
| Screen column | 1120px at most; 760px for text and forms |
| Tone card | 232px at least, 16:10 picture |
| Thumbnail | 72 by 54px |
| Window | 1240 by 840 at first; never under 960 by 640 |

## Layout

The window is a grid: the menu, and a main column with an optional banner, the top bar and the scrolling content. `body` never scrolls. A screen is one centered column (`page`) of blocks 24px apart: head, then panels.

Two breakpoints, both on the window's width:

- **1040px and under:** a tone's picture and details stack.
- **720px and under** (the default window zoomed to 200%): the menu becomes a 60px rail of icons, and the paddings step down to 16px.

Everything else wraps by itself: heads, rows, button rows and setting rows are flex rows that wrap, and the tone grid fills with as many 232px columns as fit.

## States

| State | How it looks |
|---|---|
| Hover | A control takes the `hx-hover` wash or a stronger border (`t3k-line-strong`); a field's border goes to `t3k-fg`; a link gains its underline. Color only, 0.12s. |
| Pressed | A tone card scales to 0.99. Nothing else moves. |
| Focus | 2px solid `t3k-link`, 2px away, on anything focused by keyboard. A field shows a `t3k-fg` border and a 1px ring instead. A tone card shows the ring for its title's button. |
| Current, selected, on | The menu's ring; a tab's 2px underline; the segmented control's `t3k-accent` fill; the Toggle's green track. |
| Disabled | 45% opacity and `not-allowed`. |
| Busy | The control is disabled and shows a `Spinner` and a progressive label; a list is `aria-busy` and shows skeletons. |
| Invalid | A `t3k-danger` border, and the reason under the field. |
| Dragged over | The dropzone's edge goes to `t3k-fg`, its fill to `t3k-surface-2`. |
| Unavailable | A tone that cannot be converted fades its picture to 50% and drops its title to `t3k-muted`. It still opens. |

## Motion

Short, and only to show that something changed.

| What | How |
|---|---|
| Hover and state colors | 0.12s |
| A link's underline, the Toggle | 0.15s |
| A toast arriving | Rises 6px and fades in, 0.18s ease-out |
| Spinner | One turn in 0.7s, linear |
| Skeleton | Fades to 45% and back, 1.4s ease-in-out |

With `prefers-reduced-motion: reduce`, nothing slides, scales or pulses: the toast only fades, the card does not shrink, the Toggle's knob jumps, skeletons hold at 70%. The spinner keeps turning, slowly (1.6s), since it is the only sign that work is going on. Color and opacity changes stay: they are how a state change is seen.

## Pictures

The only pictures are the tones' own, which come from TONE3000 and belong to their creators. They are cropped to cover (`object-fit: cover`): 16:10 on a card, 4:3 on a tone's screen, 72 by 54 in a row. Where there is none, or it fails to load, the `wave` icon stands on `t3k-surface-2`. The app draws no illustrations, uses no photographs of its own, no emoji, and no gradient but the primary button's.

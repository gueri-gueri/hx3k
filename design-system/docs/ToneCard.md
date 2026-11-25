One tone in a list: its picture, its title, what it is, who made it and whether it converts.

A CSS pattern, not a bundle export: there is no `window.HX3K.ToneCard`. It is built from the bundle's `ToneImage`, `Creator` and `FitChip`. Source: `ToneCard` and `MoreCard` in `src/renderer/src/views/Tones.tsx`.

## Parts

| Class | What it is |
|---|---|
| `tone-grid` | The list: `repeat(auto-fill, minmax(232px, 1fr))`, 16px apart. |
| `tone-card` | An `<article>`: `t3k-surface`, 1px `t3k-line`, 12px radius. Hover: `t3k-line-strong`. Pressed: `scale(0.99)`. |
| `tone-image` | The picture, 16:10, cropped to cover. |
| `tone-card-body` | 12px 14px 14px padding, 8px between its parts. |
| `tone-title` | 15px, weight 700, two lines at most. It wraps the `card-link` button. |
| `tone-card-foot` | Pinned to the bottom: `Creator` on the left, `FitChip` on the right. |
| `tone-card-dim` | A tone the HX Stomp cannot play: the picture at 50% opacity, the title in `t3k-muted`. Still readable, still opens. |
| `more-card` | The last card of every list: dashed edge, no fill, the T3K mark, "Discover more on TONE3000". |

## Rules

- The whole card opens the tone, but only its title is the control: a button's name should be a name, not everything printed on the card. The click handler is on the `<article>`; the `<button class="card-link">` holds the title.
- Two fill chips: gear, then format, worded as TONE3000 words them.
- No picture: `ToneImage` shows the `wave` icon on `t3k-surface-2`. Never a placeholder photo.
- Loading: the same card with `skeleton` parts, eight of them, in a grid that is `role="status"`.
- The "more" card always follows the tones: a list is a starting point, and the whole catalog is one click away.

## Accessibility

- The card shows the focus of its title: `.tone-card:has(.card-link:focus-visible)` draws the ring around the card.
- Coming back from a tone, focus returns to the card it was opened from (`data-focus-key`).

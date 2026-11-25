The gray shapes that stand where content is about to be.

A CSS pattern, not a bundle export: there is no `window.HX3K.Skeleton`. Source: `src/renderer/src/styles/app.css` (Small parts), used in `views/Tones.tsx` and `views/ToneDetail.tsx`.

## Classes

| Class | Shape |
|---|---|
| `skeleton` | `t3k-surface-2`, pulsing to 45% opacity every 1.4s. Put it on any box. |
| `sk-line` | 18px tall, 4px radius: a line of text. |
| `sk-chip` | 22px tall, a pill: a chip. |
| `sk-title` | 30px tall, 6px radius: a screen title. |
| `sk-block` | 70px tall, 6px radius: a paragraph. |
| `sk-w35` … `sk-w90` | Widths: 35, 40, 50, 60, 75 and 90%. |

## Rules

- A skeleton keeps the layout of what it stands for: a tone card's skeleton is a `tone-card` with a `tone-image skeleton` and three lines; the tone screen's is its `detail` grid.
- The group is `role="status"` with an `aria-label` ("Loading…"); each skeleton piece inside is `aria-hidden`.
- With reduced motion it does not pulse and sits at 70% opacity.
- For a wait with no layout to keep (the app starting, TONE3000 opening), use a `Spinner` with a label instead.

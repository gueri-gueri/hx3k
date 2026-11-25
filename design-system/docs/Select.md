The native select, with the app's field edge and its own arrow.

A CSS pattern, not a bundle export: there is no `window.HX3K.Select`. Source: `src/renderer/src/views/Settings.tsx`.

`select-wrap` is the positioning box and draws the arrow (a 12px chevron in `t3k-fg`, 12px from the right). `select` is the `<select>` itself: 38px tall, 8px radius, `t3k-canvas` inside, 1px `hx-edge`, `appearance: none`, 34px of right padding for the arrow.

## Rules

- Always inside a `select-wrap`: without it there is no arrow.
- Hover and focus are the field's: `t3k-fg` border, and a 1px `t3k-fg` ring on focus.
- For two or three options that fit on one line, use a `Segmented` control instead (the theme); a select is for a list that can grow (the language).
- Its label is a `<label htmlFor>`, here the setting's title.

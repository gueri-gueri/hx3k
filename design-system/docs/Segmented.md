A row of two or three choices where exactly one is on.

A CSS pattern, not a bundle export: there is no `window.HX3K.Segmented`. Source: `src/renderer/src/views/Settings.tsx`.

`segmented` is the track: `t3k-surface-2`, 8px radius, 3px padding. Each `<button>` inside is 13px, weight 600, `t3k-muted-2`, 4px by 12px, 6px radius. The one with `aria-pressed="true"` is `t3k-accent` with a `t3k-on-accent` label.

## Rules

- Two or three short options, one word each ("Dark", "Light", "System"). More than that, or longer words: a `Select`.
- It acts at once: no Save button.
- The group is `role="group"` with an `aria-label` that repeats the setting's title; each button carries `aria-pressed`.

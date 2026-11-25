First run: the app has no TONE3000 key yet, and says how to get one and where to paste it.

A showcase of the app's own screen, not a component: there is nothing to mount. Source: `Setup` and `KeyForm` in `src/renderer/src/views/Tones.tsx`.

`center` holds `setup`: a panel 600px wide at most, `t3k-surface`, 1px `t3k-line`, 12px radius, 32px padding, left-aligned, 18px between its parts.

- The full `Tone3000Logo` at 26px, at the start.
- A `stack-sm` with the `h1` and a `muted` lead.
- `Steps`: three, the last one naming what the key starts with.
- "Open TONE3000 settings" as `btn-outline` with the `external` icon after the label.
- The `Field`: "Publishable key", a mono input, and the primary Save key.
- A `muted small` warning about the secret key.
- A `link link-start`: the way to use the app without a key.

Only the `content` area changes on this screen: the menu stays, so Local files and Settings are still one click away.

`Shell` in the example is the `ScreenTones` card's wrapper; it is not exported.

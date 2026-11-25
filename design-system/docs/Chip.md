A small pill that states one fact about a tone, a model or a converted file. It is never a control.

A CSS pattern, not a bundle export: there is no `window.HX3K.Chip` (the bundle's `FitChip` is one use of it). Source: `src/renderer/src/styles/app.css` (Small parts).

## Kinds

| Classes | Looks like | Use it for |
|---|---|---|
| `chip` | `t3k-surface-2` fill, `t3k-muted-2` label | What the thing is, in TONE3000's own words: gear ("Amp Head"), format ("NAM"), "Local file". |
| `chip chip-line` | No fill, 1px inset `t3k-line` | What is said about it: its license, its tags, its creator. |
| `chip chip-ready` + `<span class="dot" />` | Green label on a 14% green wash, a dot before the words | It converts for the HX Stomp: "A2 Lite", "A2 Standard". |
| `chip chip-line chip-off` | A line chip in `t3k-muted` | It does not ("Not for the HX Stomp"), and the quiet facts of a conversion ("scaled ÷2"). |

`chips` is the row: it wraps, 6px apart.

## Rules

- One line, never wrapped; 12px, weight 500, 18px line, 2px by 8px padding.
- Ready is never color alone: it has the dot and the words. Give a ready or off chip a `title` that says why.
- A creator chip holds an `Avatar` at 14px, then `@username`.
- Numbers keep their real signs and units: "input −6.5 dB" with a minus sign, "÷2", "1,871 weights".
- Order in a row: fill chips first, then line chips. A second `chips` row holds the conversion facts.

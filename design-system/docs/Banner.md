A one-line strip across the top of the main area for a state of the whole app.

A CSS pattern, not a bundle export: there is no `window.HX3K.Banner`. Source: `src/renderer/src/App.tsx`.

`banner`: `t3k-fg` on a 22% `t3k-warning` wash, 12px, weight 600, centered, 6px by 28px padding (16px at the sides in a narrow window). It sits above the top bar, inside `.main`.

## Rules

- The app has one use: "Sample mode: TONE3000 is replaced by made-up tones." Keep it to states like that one, true for every screen until the app is restarted.
- One line, no action, no close button. For anything the user can act on, use a `Notice`.

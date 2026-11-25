A numbered list of things to do, in order.

A CSS pattern, not a bundle export: there is no `window.HX3K.Steps`. Source: `views/Tones.tsx` (the setup) and `views/Guide.tsx`.

`steps` is an `<ol>` with no markers of its own: each `<li>` gets a 24px disc (`t3k-surface-2`, the number in 12px weight 700 `t3k-fg`) and its text beside it in `t3k-muted-2`, 10px between steps. `steps-lg` sets the text to 15px `t3k-fg`, for a screen whose whole point is the steps. `step-actions` is a row of `actions` under a step's text, 8px below it.

## Rules

- One action per step, starting with the verb: "Open HX Edit…", "Drag a .wav…", "Turn Model…".
- Name what the user will see exactly as it is written there: "Settings → API Keys", "Amp › NAM › NAM A2 Lite".
- A step that needs something from the app carries it: the Open folder button and the folder's path sit inside step 2.
- Three to five steps. A caveat goes in a `Notice` after the list, not inside a step.

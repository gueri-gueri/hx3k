The target for the user's own .nam files: drop them on it, or click it to browse.

A CSS pattern, not a bundle export: there is no `window.HX3K.Dropzone`. Source: `src/renderer/src/views/Local.tsx`.

`dropzone` is a `<button>`: full width, `t3k-surface`, a 1.5px dashed `t3k-line-strong` edge, 12px radius, 44px by 24px padding, its three lines centered 6px apart. The icon is `upload` at 26px in `t3k-muted`; the `<strong>` is 16px; the last line is `muted`.

## States

- Hover, or `data-over="true"` while files are dragged over it: the edge goes to `t3k-fg` and the fill to `t3k-surface-2`.
- Busy: `disabled`, and a `Spinner` with a label takes the icon's place. The words stay.

## Rules

- One per screen. It is a real button, so it works by keyboard: Enter opens the file dialog through a hidden `<input type="file" accept=".nam,application/json" multiple>`.
- Set `data-over` on `dragover`, clear it on `dragleave` and `drop`. The window stops a file dropped outside the zone from replacing the page.
- Say underneath, in `muted`, what works: "Only the 3-channel A2 Lite size works…". Results appear below as `Rows`, newest first.

A list of things with their own actions: the models of a tone, the converted captures, the results of a local conversion.

A CSS pattern, not a bundle export: there is no `window.HX3K.Rows`. Source: `ModelRow` in `views/ToneDetail.tsx`, `ConvertedRow` in `views/Converted.tsx`, and `views/Local.tsx`.

## Parts

| Class | What it is |
|---|---|
| `rows` | The panel: `t3k-surface`, 1px `t3k-line`, 12px radius. |
| `row` | One row: 12px 14px padding, 14px between its parts, a `t3k-line` rule between rows. It wraps when the window is narrow. |
| `thumb`, `thumb-image`, `thumb-mark` | An optional 72 by 54 picture. `thumb-mark` puts the T3K mark on its corner: this capture came from TONE3000. |
| `row-main` | The text column: title, second line, chips, file name, status. |
| `row-title` | 14px, weight 600. With `row-link` it is a button that opens something and underlines on hover. |
| `row-sub` | 13px, `t3k-muted`. With `mono` it is the file name. |
| `row-status` + `row-ok` / `row-warn` / `row-bad` | An outcome, with its icon: `check` and "Saved as …", `alert` and "File not found", `alert` and the reason it failed. |
| `actions`, `actions-end` | The row's buttons, all `btn-sm`. |

## Rules

- The outcome of an action stays in its row. A row that converted says "Saved as {file}" and offers Show in folder; a row that failed says why, in the user's words.
- One accent button per row at most, and only while the row has not been done: Convert is `btn-accent`, Convert again is `btn-outline`.
- While a row works, its button is disabled with a `Spinner` and "Converting…", and the other rows' buttons are disabled too.
- A removal asks in the row: the buttons are replaced by "Move the .wav to the trash?", `btn-danger` and Cancel. When the file is already gone there is nothing to trash, so the button reads "Remove from list" and acts at once.
- File names and paths are `mono` and `selectable`; so are titles that are not links.

## Accessibility

- `row-bad` on a model is `role="alert"`.
- A remove button names its file: `aria-label="Remove: {file}"`.
- When the question replaces the button, focus goes to Cancel; when it is answered "no", focus goes back to Remove; when the row is removed, focus goes to the top of the screen and the removal is announced.

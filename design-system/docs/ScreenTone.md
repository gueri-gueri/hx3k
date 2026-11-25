One tone: its picture and details on top, its models below, each with its own Convert.

A showcase of the app's own screen, not a component: there is nothing to mount. Source: `src/renderer/src/views/ToneDetail.tsx`.

## Layout

- Back (`btn-quiet btn-sm`) alone on the first line.
- `detail`: a grid of the picture (220 to 340px, 4:3, `detail-image`) and `detail-info`, 28px apart. At 1040px and under it becomes one column and the picture stops at 420px.
- `detail-info`, 14px between its parts: the `h1`, fill chips for gear and format and a line chip for the license, the `Creator` at 26px, the description under its `h2` (clamped to four lines when it is longer than 280 characters, with "Read more"), up to twelve tags as line chips, the `meta-row` of counts, and "Open on TONE3000".
- A `section` headed "Model": the help line, "Convert all (n)" as the screen's one `btn-primary` when more than one model converts, and the `Rows` of models.

## Rules

- The title, the description and the model names are `selectable`.
- A tone with no A2 models shows an `EmptyState` in place of the rows: "No A2 models in this tone", or "This is not a NAM capture".
- Loading keeps the layout: the `detail` grid with skeletons. An error is a `Notice kind="error"` with "Try again", under Back.

`Shell` in the example is the `ScreenTones` card's wrapper; it is not exported.

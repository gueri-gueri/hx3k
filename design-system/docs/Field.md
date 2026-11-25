A labelled text field with its action beside it and its error below.

A CSS pattern, not a bundle export: there is no `window.HX3K.Field`. Source: `KeyForm` in `src/renderer/src/views/Tones.tsx`.

## Parts

| Class | What it is |
|---|---|
| `field` | The column: label, row, messages, 6px apart. |
| `field label`, `label` | 13px, weight 600, `t3k-muted-2`. |
| `input` | 38px tall, 12px side padding, 8px radius, `t3k-canvas` inside, 1px `hx-edge` border. Add `mono` for a key or a path. |
| `input-row` | The input and its button, 8px apart; the input takes the room. |
| `field-error` | 13px, `t3k-danger`, under the row. |

## States

- Hover: the border goes to `t3k-fg`.
- Focus: `t3k-fg` border and a 1px `t3k-fg` ring (`box-shadow`), in place of the global focus ring.
- Invalid: `aria-invalid="true"` turns the border `t3k-danger`.
- The button is `disabled` while the field is empty or the form is busy.

## Rules

- The label is always visible, above the field. The placeholder shows the shape of the value ("t3k_pub_…"), never the label.
- Help that prevents a mistake sits under the field in `muted small` ("Never paste the secret key (t3k_cs_…). This app has no use for it.").
- An error says what is wrong and what to do instead, and replaces nothing: the help line stays.

## Accessibility

- `<label htmlFor>` the input. On error: `aria-invalid`, `aria-describedby` the error's id, and the error is `role="alert"`.
- `spellCheck={false}` and `autoComplete="off"` for keys and paths.

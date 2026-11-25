A card of setting rows: what a setting is on the left, its control on the right, a hairline between rows.

A CSS pattern, not a bundle export: there is no `window.HX3K.SettingsCard`. Source: `src/renderer/src/views/Settings.tsx` and `views/Guide.tsx`.

## Parts

| Class | What it is |
|---|---|
| `card` | The panel: `t3k-surface`, 1px `t3k-line`, 12px radius. No padding of its own. |
| `setting` | A row: 14px 16px padding, the text and the control at opposite ends, a `t3k-line` rule above every row but the first. It wraps in a narrow window. |
| `setting-top` | Aligns the row to its top, for a row that holds a form. |
| `setting-text` | The left side: a `<strong>` title (weight 600) and a `<span>` help line (13px, `t3k-muted`). |
| `setting-text-row` | The left side as a row: a logo, then the account. |
| `setting-form` | A form in place of the text, taking the row's width. |
| `path`, `account`, `note` | Inside `setting-text`: a mono path (13px, weight 500); the signed-in account (14px, `t3k-fg`); a full-size line of text in `t3k-muted-2` for a card of notes. |
| `about` | With `card`: a padded column of paragraphs, for the About block. |

## Rules

- Each card sits in a `section` under an `h2` label ("Conversion"). One subject per card.
- The control is one of: a `Toggle`, a `Select`, a `Segmented` control, or one or two `btn-sm` buttons. Its accessible name repeats the row's title.
- The title says what the setting does in the user's terms ("Even out loudness"); the help line says what happens when it is on, and ends with what Off does.
- A setting applies as soon as it changes. Nothing on this screen has a Save button except the key form.
- `card setting` on one element is a single-row card, as on the guide ("Your HX Stomp needs HXtra").

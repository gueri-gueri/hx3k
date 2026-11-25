A short message over the bottom right corner of the screen: what went well, or what failed.

A CSS pattern, not a bundle export: there is no `window.HX3K.Toast`. In the app, `notify('ok' | 'error', text)` from the app context shows one. Source: `src/renderer/src/App.tsx`.

## Parts

| Class | What it is |
|---|---|
| `toasts` | The stack: absolute, 20px from the right and the bottom of `.main`, at most 380px wide, above everything (`z-index: 30`). |
| `toast-stack` | Two of them, always in the page: one `role="status"` for what goes well, one `role="alert"` for what fails. |
| `toast` | `t3k-surface-2`, 1px `t3k-line-strong`, 8px radius, 11px 14px padding, and the app's only shadow (`shadow-toast`). It rises 6px as it appears. |
| `toast-ok`, `toast-error` | The icon's color: `check` in the success green, `alert` in `t3k-danger`. The text stays `t3k-fg`. |

## Rules

- One sentence. Success says what was done ("3 captures converted"); an error says what happened and what to do ("TONE3000 could not be reached. Check your connection.").
- It leaves by itself: 4.5 seconds for ok, 8 for an error. At most four at once.
- Not for an outcome that has a place of its own: a row's result goes in the row, a field's error under the field.
- The text is `selectable`, so an error can be copied.
- With reduced motion it fades in and does not rise.

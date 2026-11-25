The app's button: `btn` plus one variant class, and a size class when it is not the default 36px.

A CSS pattern, not a bundle export: there is no `window.HX3K.Button`. Write a `<button type="button">` with the classes of `components/bundle.css`. Source: `src/renderer/src/styles/app.css` (Buttons).

## Variants

| Class | Looks like | Use it for |
|---|---|---|
| `btn-primary` | `t3k-primary` gradient, `t3k-on-primary` label | The one action a screen exists for: Continue, Save key, Convert all, Connect. One per screen. |
| `btn-accent` | `t3k-accent` fill, `t3k-on-accent` label | The action of a row when several rows each have one: Convert on a model, Send to the HX Stomp on a converted capture. Once done it steps back: Send again is `btn-outline`, Convert again `btn-quiet`. |
| `btn-outline` | 1px `t3k-line`, `t3k-fg` label | Everything secondary: Open folder, Show in folder, Choose…, Previous, Next. |
| `btn-quiet` | No edge, `t3k-muted-2` label | The least weight: Back, Refresh, Cancel, Clear, Remove, Change key, Convert again. |
| `btn-danger` | 1px `t3k-danger`, `t3k-danger` label | The confirmation of a destructive action, never the first click: Move to trash. |
| `btn-browse` | `t3k-surface` fill, the T3K mark | Only through the `BrowseButton` component. |

## Sizes

`btn-sm` 30px tall, 13px text, 10px side padding: inside rows, cards and the tab bar. No class: 36px, 14px text, 14px side padding. `btn-lg` 44px, 15px text, 22px side padding: the splash, and Browse in an empty state.

## Rules

- A verb first, sentence case, no full stop: "Show in folder", "Convert again". An ellipsis only when a dialog follows ("Choose…") or work is going on ("Converting…").
- An icon goes before the label (`<Icon name="folder" />`), except `external`, which follows it. The gap is the button's own 8px.
- Busy: `disabled`, a `<Spinner />` in place of the icon, and the label in the progressive ("Converting…"). Never a spinner alone.
- Disabled is `opacity: 0.45` with `cursor: not-allowed`; do not restyle it.
- A destructive action asks in place: the row's actions are replaced by the question, `btn-danger` and a quiet Cancel (see ConfirmInPlace), and focus moves to Cancel.
- Hover: primary brightens (`filter: brightness(1.18)`), accent drops to 88% opacity, outline takes `t3k-line-strong` and the `hx-hover` wash, quiet takes `t3k-fg` and the wash, danger a 12% `t3k-danger` wash.

## Accessibility

- Always `type="button"` (or `submit` in a form). The label is the name; add `aria-label` when the label alone does not say which thing it acts on ("Remove: Plexi Lead 100 NAM.wav").
- Focus is the global ring: 2px `t3k-link`, 2px offset.

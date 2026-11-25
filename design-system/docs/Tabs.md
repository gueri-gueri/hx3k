The tab bar of the tone lists: one row of text tabs on a hairline, a second group set off by a short rule, and an action at the far end.

A CSS pattern, not a bundle export: there is no `window.HX3K.Tabs`. Source: `ToneLists` in `src/renderer/src/views/Tones.tsx`.

## Parts

| Class | What it is |
|---|---|
| `tabbar` | The row and its 1px `t3k-line` bottom rule. |
| `tablist` | The tabs (`role="tablist"`), 4px apart. |
| `tab` | 14px, weight 600, `t3k-muted`; hover and selected are `t3k-fg`. |
| `tab[aria-selected='true']` | A 2px `t3k-fg` underline that sits on the bar's rule. |
| `tab-group` | The first tab of a second group: 17px of air and an 18px `t3k-line` rule before it. |
| `tabbar-end` | Pushed to the right: a `btn-quiet btn-sm` such as Refresh. |
| `tabpanel` | The panel below, a column with 24px between its blocks. |

## Rules

- The first group is the user's own lists (Favorites, Downloaded, Created); the second is everyone's (Trending, Latest). The screen's title follows the group: "Your tones" or "Discover".
- Sentence case, one word where possible. No counts, no icons in a tab.
- Selection is the underline and the color, never a filled pill.

## Accessibility

- `role="tablist"` with an `aria-label`; each tab `role="tab"`, `aria-selected`, `aria-controls`, and `tabIndex` 0 only on the selected one: the list is one stop for Tab.
- Arrow Left and Right move and select, wrapping; Home and End go to the ends.
- The panel is `role="tabpanel"`, `aria-labelledby` the selected tab, `aria-busy` while its list loads.

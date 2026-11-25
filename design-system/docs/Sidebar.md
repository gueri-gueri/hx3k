The app's menu: the HX3K logo and tagline, one entry per screen, and "Powered by TONE3000" at its foot.

A CSS pattern, not a bundle export: there is no `window.HX3K.Sidebar`. It is the first column of the shell (232px; see the `ScreenTones` card). Source: `src/renderer/src/App.tsx`.

## Parts

| Class | What it is |
|---|---|
| `sidebar` | The column: `t3k-canvas`, a 1px `t3k-line` rule on its right, 4px between entries, scrolls when the window is short. |
| `wordmark`, `wordmark-tag` | `Hx3kLogo` at 32px and the tagline (12px, `t3k-muted`). |
| `nav-item` | An entry: a 16px icon and a word, 8px radius, `t3k-muted-2`, weight 500. Hover: the `hx-hover` wash and `t3k-fg`. |
| `nav-item[aria-current='page']` | Where the user is: `t3k-surface-2`, `t3k-fg`, weight 600 and a 1px inset ring of `t3k-fg`. The ring carries it: the fill alone is too faint, and the TONE3000 entry has no word to make bold. |
| `nav-count` | A pill at the entry's right: how many captures are converted. Shown only above zero. |
| `sidebar-foot` | Pinned to the bottom behind a `t3k-line` rule: the F6 hint, then `powered`. |
| `keys-hint`, `kbd` | "F6 moves between this menu and TONE3000": only on the TONE3000 screen, where Tab cannot cross into the embedded page. |
| `powered`, `powered-label` | A button that opens tone3000.com: the uppercase "Powered by" and the full `Tone3000Logo`. |
| `when-wide`, `when-rail` | The two halves of each pair: the full logos while the menu is wide, the compact marks when it is a rail. |

## Rules

- The first entry is TONE3000 itself, and it carries TONE3000's full logo instead of an icon and a word. It stays current for as long as the user is on TONE3000's pages.
- The other entries, in order: Tones (`tones`), Converted (`wave`), Local files (`file`), Load on the HX Stomp (`guide`), Settings (`settings`). A tone's own screen keeps Tones current.
- At 720px and under the column is a 60px rail: `Hx3kMark` replaces the logo, entries are icons only, counts and labels hide, and the T3K mark replaces the full TONE3000 logo. See `ScreenConverted`.

## Accessibility

- `<nav aria-label="HX3K">`; every entry is a `<button>` with `aria-label` (its word, or "TONE3000") and `aria-current="page"` on the current one, so the rail keeps its names.
- The `powered` button's name is "Powered by TONE3000".

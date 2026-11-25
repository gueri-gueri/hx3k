# Iconography and logos

## Icons

Fifteen stroke icons, drawn for this app, all in the `Icon` component. Never draw another icon in a design that uses this system: pick from these, or use a word.

- Drawn on a 24 grid: no fill, a 1.8 stroke, round caps and joins.
- They take `currentColor`, so an icon is the color of the text beside it, or of its status.
- 16px by default (the `icon` class), with the 8px gap of its button, or 10px in a menu entry.
- Always beside words, and `aria-hidden`. No icon-only buttons, except the menu's entries in the rail, which keep their names in `aria-label`.

| Name | Where it is used |
|---|---|
| `tones` | The Tones menu entry |
| `wave` | The Converted menu entry; the stand-in for a missing picture |
| `file` | The Local files menu entry |
| `guide` | The Load on the HX Stomp menu entry |
| `settings` | The Settings menu entry |
| `folder` | Open folder, Show in folder |
| `external` | After the label of a button that opens the browser |
| `back` | Back |
| `refresh` | Refresh |
| `trash` | Remove |
| `upload` | The dropzone |
| `check` | Success: the ok toast, "Saved as…" |
| `alert` | An error or a warning: the error notice and toast, a failed row, "File not found" |
| `info` | An info notice |
| `close` | Drawn, not yet used by a screen |

`Verified` is the one filled mark: the tick beside a verified creator's name, 14px, in `t3k-link`, with its name as a title.

There are no emoji and no decorative glyphs in the interface. Two typographic signs do appear: "×" between the two logos on the splash, and "›" and "→" in a path through another program's menus.

## HX3K's logo

"HX" on a dark tile, "3K" on the primary blue, split along the slope of the X. The letters are drawn for it: flat, white, with no red and no relief, so it is not taken for TONE3000's.

| File | Use |
|---|---|
| `assets/Logos/hx3k-logo.svg` | The horizontal logo: the top of the menu (32px tall) and the splash (44px). `Hx3kLogo` in the bundle. |
| `assets/Logos/hx3k-mark.svg` | The square mark: the menu as a rail (36px). `Hx3kMark` in the bundle. |
| `assets/Logos/app-icon.svg`, `app-icon.png` | The mark with the margin an operating system wants: the app's icon, 1024px. |

- It carries its own tile and hairline, so it is the same picture on the dark and on the light theme. Do not recolor it, outline it or place it on a tile of your own.
- Its alternative text is "HX3K".
- Never set "HX3K" in type as a substitute where the logo fits; in running text it is just the name.

## TONE3000's logos

These are TONE3000's official assets and its trademarks, shown as its API terms ask. They are not part of this system's license. Use them only to say that something is, comes from, or is powered by TONE3000.

| File | Use |
|---|---|
| `assets/TONE3000/tone3000-logo.svg` | The full logo: entry points and first exposure. The TONE3000 menu entry (17px tall), "Powered by" (22px), the splash (30px), the setup panel (26px), the account row in Settings (22px). `Tone3000Logo` in the bundle. |
| `assets/TONE3000/t3k-mark.svg` | The compact mark: the Browse button and the "more" card (14px), the origin marker on a converted capture (9px), and the menu as a rail (12 and 14px). `T3KMark` in the bundle. |

- **The full logo before the short mark.** A user must have seen "TONE3000" in full before meeting "T3K": the full logo is on the splash and in the menu of every screen, and the mark only in compact places.
- **Never recolored, stretched or cropped.** Set its height and let the width follow.
- Beside words that already name TONE3000, the mark is decorative (`<T3KMark decorative />`, an empty `alt`), so the name is not read twice.
- The lockup on the splash is the two logos with a "×" between them, HX3K's first. Use it nowhere else.

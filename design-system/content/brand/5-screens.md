# Screens

The app has nine screens. Each has a showcase card under Components, group Screens, built from the same classes and components as the app.

| Screen | Card | Menu entry | What it is made of |
|---|---|---|---|
| Tone lists | `ScreenTones` | Tones | `PageHead`, `Tabs`, a grid of `ToneCard`, `Pager` |
| One tone | `ScreenTone` | Tones (stays current) | Back, the `detail` grid, `Chip`s, `Creator`, `Rows` of models |
| Converted | `ScreenConverted` | Converted, with its count | `PageHead` with actions, `Notice`, `Rows` |
| Local files | `ScreenLocalFiles` | Local files | `PageHead`, `Dropzone`, `Rows` of results, `Notice` |
| Load on the HX Stomp | `ScreenGuide` | Load on the HX Stomp | `PageHead`, a one-row card, `Steps`, `Notice`, a card of notes |
| Settings | `ScreenSettings` | Settings | `PageHead`, five `SettingsCard`s |
| Before sign-in | `ScreenSplash` | TONE3000 or Tones | The splash panel: two logos, copy, one primary button |
| First run | `ScreenSetup` | Tones | The setup panel: `Steps`, `Field` |
| TONE3000 | `ScreenTone3000` | TONE3000 | The stage that TONE3000's own pages are laid over |

## How a screen is put together

1. The shell never changes: menu on the left, top bar with who is signed in, content below. See `ScreenTones`.
2. A screen is a `page`: one column, 1120px at most, or 760px (`page-narrow`) when it is text and forms. Blocks are 24px apart.
3. It starts with a `page-head`: the `h1`, one sentence of lead, and at most two outline actions on the right.
4. Then panels, each a `rows` list, a `card`, a `tone-grid`, or a `Notice`. A panel that needs a label sits in a `section` under an `h2`.
5. One `btn-primary` at most, beside the section it acts on.
6. Every list has its three other faces: loading (skeletons in the same layout), empty (an `EmptyState` that says how to fill it), and failed (a `Notice kind="error"` with "Try again").

## Feedback, by place

| What happened | Where it is said |
|---|---|
| A row's action finished or failed | In the row (`row-status`) |
| A field's value is wrong | Under the field (`field-error`) |
| A list could not load | In its place (`Notice kind="error"`) |
| Something finished that has no row on screen, or a call failed | A `Toast` |
| The whole app is in an unusual state | The `Banner` |
| Something the user should know before acting | A `Notice` in the flow of the screen |

## Not in the app

No modal dialogs, no menus or popovers, no tooltips beyond the native `title`, no search field, no table. A destructive action asks in place; a choice among a few is a segmented control or a native select. Do not introduce one of these without a reason the app's own patterns cannot meet.

What stands before TONE3000 until the user signs in: the two logos, what the app does, and Continue.

A showcase of the app's own screen, not a component: there is nothing to mount. Source: `Splash` in `src/renderer/src/views/Tones.tsx`.

`center` fills the content area and centers `splash`: a panel 560px wide at most, `t3k-surface`, 1px `t3k-line`, 12px radius, 40px 36px 32px padding, its parts centered 22px apart.

- `partners`: `Hx3kLogo` at 44px, a `times` sign (18px, `t3k-muted`), `Tone3000Logo` at 30px. The two logos are the picture, so the screen's `h1` is `sr-only`.
- `splash-copy` (15px, `t3k-muted-2`): what the app connects to, in TONE3000's words about itself.
- A `muted` line: what comes back.
- Continue: `btn btn-primary btn-lg`, the only action.
- `splash-fine` (12px, `t3k-muted`): "An independent project. Not affiliated with…", and a link to tone3000.com.

The full TONE3000 logo is here because this is the user's first sight of it; the compact T3K mark comes only after.

`Shell` in the example is the `ScreenTones` card's wrapper; it is not exported.

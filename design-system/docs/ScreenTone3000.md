The TONE3000 screen: the menu stays, and TONE3000's own pages are laid over everything beside it.

A showcase of the app's own screen, not a component: there is nothing to mount. Source: `src/renderer/src/views/Tone3000.tsx`.

`stage` takes the place of the top bar and the content: it fills the main column, `t3k-canvas`, its content centered in `t3k-muted`. The app lays a native view over it, edge to edge, with TONE3000's sign-in and then its catalog. What is drawn here shows only while that view opens: `stage-wait`, a column of a `Spinner` with a label, the same words in `<strong>` (`t3k-fg`), and a hint.

## Rules

- No top bar on this screen: TONE3000's pages show who is signed in themselves.
- The TONE3000 entry stays current in the menu for the whole visit, and the menu's foot shows the F6 hint: Tab cannot cross between the app and the embedded page, so F6 does, both ways.
- Design nothing inside the stage. What appears there is TONE3000's.

`Shell` in the example is the `ScreenTones` card's wrapper; it is not exported.

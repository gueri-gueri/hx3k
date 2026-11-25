Converting .nam files the user already has: a dropzone, what works, and the results.

A showcase of the app's own screen, not a component: there is nothing to mount. Source: `src/renderer/src/views/Local.tsx`.

A `page page-narrow` (760px): the `page-head` with its lead ("Nothing leaves this computer."), the `Dropzone`, a `muted` paragraph that says which files work, then, once there are any, a `section` headed by the count ("1 of 2 converted") with a quiet Clear and the `Rows` of results, newest first. The `Notice` about the .wav closes the screen.

The count is the section's `h2`, and it is announced when a batch finishes.

`Shell` in the example is the `ScreenTones` card's wrapper; it is not exported.

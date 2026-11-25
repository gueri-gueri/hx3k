Previous, "Page 2 of 7", Next: the pager under a list of tones.

A CSS pattern, not a bundle export: there is no `window.HX3K.Pager`. Source: `ToneLists` in `src/renderer/src/views/Tones.tsx`.

`pager` centers its three parts 14px apart, in `t3k-muted`. The buttons are `btn btn-outline btn-sm`.

## Rules

- Shown only when there is more than one page.
- At either end the button stays in place and is `disabled`; it never disappears, so the other one does not move under the pointer.
- The words are "Page {page} of {pages}", not "2/7".

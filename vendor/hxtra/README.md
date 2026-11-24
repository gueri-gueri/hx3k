# vendor/hxtra

`nam2ir-core.js` is `web/nam2ir-core.js` from [HXtra](https://github.com/wisemandenny/hxtra),
copied **without changes** at commit `01708b45004cc2a232e32e8e9020a3237fdad06d`
(SHA-256 `406438a54983b5a9cbc372f9c6078cc36284c8f5b716a7db64f56e617c94af8e`).

It is the converter HXtra's setup page runs in the browser, so the `.wav` this app
writes is byte for byte the one that page would give for the same `.nam` and options.

- Copyright (C) 2026 Derek Bui and the HXtra contributors.
- License: GPL-3.0-or-later (see `/LICENSE` and `/NOTICE`).

## Updating

Replace the file with the new upstream one, update the commit and hash above, and run
`npm test`. Do not edit the file here: `tests/convert.test.ts` pins its hash.

`nam2ir-core.d.ts` is this project's own type description of that file.

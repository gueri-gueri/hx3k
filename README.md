# HX3K

A desktop app (Electron) that downloads NAM captures from **TONE3000** and converts them into the `.wav` that the
**NAM A2 Lite** block of [HXtra](https://github.com/wisemandenny/hxtra) loads from the HX Stomp's User IR slots.

<a href="https://www.tone3000.com"><img src="src/renderer/src/assets/brand/tone3000-logo.svg" alt="TONE3000" height="40"></a>

**Powered by [TONE3000](https://www.tone3000.com)**: the library of Neural Amp Modeler (NAM) captures and IRs of
real analog gear, built by a global community of musicians. You pick the tone in the TONE3000 catalog, inside the
app, and it comes back ready for the HX Stomp.

## What it does

- **TONE3000**: a sidebar item that opens the TONE3000 catalog inside the app (the *Select* flow), already filtered
  to NAM A2. The item stays selected while you browse it.
- **Your tones**: favorites, downloaded and created, plus trending and recent.
- **Convert**: downloads the model you chose and writes `<name> NAM.wav` to the output folder.
- **Local files**: converts `.nam` files you already have, with no account and no network.
- **Credits**: writes `TONE3000 credits.txt` beside the `.wav` files, with the creator, license and link of each
  capture.
- Interface in Portuguese and English, dark and light themes.
- Keyboard: **F6** switches between the app's menu and the TONE3000 page (Tab alone does not cross from one to the
  other).

The conversion is HXtra's own: [`vendor/hxtra/nam2ir-core.js`](vendor/hxtra/README.md) is HXtra's file, unmodified,
and the `.wav` comes out byte for byte the same as the one from its setup page.

### What it converts

Only the **A2 Lite** size (a 3-channel WaveNet, 1,871 weights) trained at **48 kHz**: it is the only one the
HX Stomp's DSP runs. On TONE3000 that is the A2 architecture: every A2 `.nam` carries the Lite size, whatever size it
lists (a file with several sizes gives up its A2 Lite model). The `.wav` is not a sound: it carries the capture's numbers and only works in the
NAM A2 Lite block.

The HX Stomp needs HXtra installed: <https://wisemandenny.github.io/hxtra/web/>.

## Running

Requires Node.js 22 or newer.

```bash
npm install
```

npm 11 does not run the script that downloads the Electron binary. If `npm run dev` complains that Electron is not
installed:

```bash
node node_modules/electron/install.js
```

```bash
npm run dev
```

### TONE3000 key

The app asks for the **publishable key** (`t3k_pub_…`) on first run. Create one at
[tone3000.com](https://www.tone3000.com/settings) → Settings → API Keys. No redirect URI needs registering: the app
uses `http://127.0.0.1:38300/callback`, and TONE3000 always accepts loopback.

To embed the key in the build, copy `.env.example` to `.env` and fill in `MAIN_VITE_T3K_PUBLISHABLE_KEY`.
Never use the secret key (`t3k_cs_…`) in this project.

### No key: sample mode

```bash
HX3K_MOCK=1 npm run dev
```

It swaps TONE3000 for made-up tones and a sample catalog in the same embedded area, so you can work on the interface
with no key and no network. It only works outside the packaged app.

## Tests and build

| Command | What it does |
|---|---|
| `npm test` | Unit tests: conversion, API client, OAuth/PKCE, library |
| `npm run typecheck` | Types of the main process and of the interface |
| `npm run build` | Compiles to `out/` |
| `npm run test:e2e` | Drives the compiled app, in sample mode, from the first screen to the `.wav` files on disk |
| `npm run hx:probe` | Reads the loaded preset, the setlist's names, the blocks and the User IRs from a real HX Stomp over USB (macOS and Linux, HX Edit closed); changes nothing on it |
| `HX3K_WAV='… NAM.wav' npm run hx:import` | Writes a converted capture into the first free User IR slot of a real HX Stomp, or into slot `HX3K_SLOT`, and reads it back |
| `npm run dist` | Packages with electron-builder into `release/` (dmg/zip, NSIS, AppImage/deb) |
| `npm run icon` | Regenerates `build/icon.png` from `build/icon.svg` |

### Releasing

Start [`release.yml`](.github/workflows/release.yml) by hand from the Actions tab (*Release → Run workflow*) and
choose `patch`, `minor` or `major`. It always releases `main`, and the new version is the last `vX.Y.Z` tag with
that part raised (`v0.1.0` → `v0.1.1`, `v0.2.0` or `v1.0.0`). Don't edit the version in `package.json` or push tags
yourself.

The workflow runs the tests and packages the app on macOS, Windows and Linux. Then it commits the new version to
`package.json` on `main`, tags that commit and opens a **draft** release with the installers. Publish it from the
repository's Releases page. If `main` gets a new commit while it runs, the push is refused and nothing is tagged:
start it again.

The release opens with the install instructions of [`release-notes.md`](.github/release-notes.md), where
`{{version}}` and `{{repo}}` are filled in, followed by GitHub's list of changes.

The installers are not signed with a certificate. macOS asks for *System Settings → Privacy & Security → Open Anyway*
on first launch, and Windows shows SmartScreen's *More info → Run anyway*.

## How it is built

| Path | Role |
|---|---|
| `src/main/oauth.ts` | OAuth 2.0 with PKCE in an embedded `WebContentsView`; intercepts the redirect |
| `src/renderer/src/views/Tone3000.tsx` | The TONE3000 screen: the area where the embedded page is placed |
| `src/main/t3k.ts` | API client: lists, tone, models, download; token refresh |
| `src/main/convert.ts` | Calls HXtra's converter |
| `src/main/library.ts` | Writes the `.wav` files, the history and the credits file |
| `src/main/hx/` | The HX Stomp's USB protocol, as HX Edit speaks it: reads presets and User IRs, writes a User IR slot; not yet used by the app |
| `src/main/tokenStore.ts` | Tokens encrypted with `safeStorage` (Keychain, DPAPI, libsecret) |
| `src/preload/index.ts` | The `window.hx` bridge; the interface has no Node and no network |
| `src/renderer/src/styles/tokens.css` | TONE3000's `--t3k-*` tokens |
| `src/renderer/src/i18n/` | Texts in English and Portuguese |

The TONE3000 tokens stay in the main process only, and the token is only ever sent to `www.tone3000.com`.

## TONE3000: what this app follows

Access is the **independent developer** tier of the [API terms](https://www.tone3000.com/api/terms): the OAuth flows
(*Select* and *Load Tone*) and the limited lists (favorites, downloaded, created, trending, recent). There is no
search of its own; the search is the TONE3000 catalog's.

- A splash screen before sign-in, with the full TONE3000 logo.
- Lists with image, title, gear type, format and creator (avatar and username), and the connected user in view.
- The full catalog always one click away: TONE3000 is a fixed sidebar item, with the full logo.
- A tone screen with a model picker and the creator's description.
- The full logo at entry points; the T3K mark only in compact places, after the full logo.
- It downloads a model only when you ask. It does not keep the `.nam` files, only the converted `.wav`.
- The creator's name and the license go with each capture.

## License

[GPL-3.0-or-later](LICENSE). Third-party notices in [NOTICE](NOTICE).

The TONE3000 logos are TONE3000's trademarks and are not covered by this program's license. Line 6, Helix, HX Stomp
and HX Edit are trademarks of Yamaha Guitar Group, Inc. This is an independent project: it is not affiliated with,
endorsed by or supported by TONE3000, HXtra, Line 6 or Yamaha Guitar Group.

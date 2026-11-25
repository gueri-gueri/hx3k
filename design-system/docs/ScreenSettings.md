Every setting of the app, in five cards: output folder, conversion, appearance, the TONE3000 account, and About.

A showcase of the app's own screen, not a component: there is nothing to mount. Source: `src/renderer/src/views/Settings.tsx`.

A `page page-narrow` of `section`s, each an `h2` label over one `SettingsCard`:

- Output folder: the path in mono, Open folder and Choose….
- Conversion: two `Toggle` rows.
- Appearance: the language (`Select`) and the theme (`Segmented`).
- TONE3000 account: the full TONE3000 logo with who is connected and Sign out (or "Not connected" and a primary Connect), then the publishable key, shown as its first twelve characters with Change key.
- About: the version, what the app does, whose the captures are, the license, the links, and the trademark line in `small`.

Everything applies at once; only the key has a form with a button.

`Shell` in the example is the `ScreenTones` card's wrapper; it is not exported.

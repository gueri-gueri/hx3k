# Accessibility

What the app does on every screen, and what a screen built with this system must keep.

## Structure

- One `h1` per screen. It gives the content region its name and the window its title ("Settings · HX3K"), and it is announced when the screen opens. Where a picture says the title better (the splash), the `h1` is still there, in `sr-only`.
- Section labels are `h2`. A card's title is an `h2` inside its `<article>`.
- The menu is a `<nav>` with a name; the content is the `<main>`.

## Keyboard

- Everything that acts is a `<button>`, a link, or a native field. Nothing is a clickable `<div>`: a tone card opens on a click anywhere, but its control is the title's button.
- Focus is always visible: a 2px `t3k-link` outline, 2px off the control, at least 5:1 on every ground in both themes. Fields show a `t3k-fg` border and ring instead.
- Tabs are one stop for Tab; the arrows, Home and End move between them.
- A new screen takes the keyboard at its top. Coming back from a tone, focus returns to the card it was opened from.
- When something with focus goes away, focus is sent somewhere on purpose: to Cancel when a question replaces a button, back to that button on "no", to the top of the screen when a row is removed.
- F6 crosses between the app and TONE3000's embedded page, both ways, and the menu says so while that page is open.

## What is announced

- Two regions are always in the page: one `role="status"` for toasts that say something went well, one `role="alert"` for those that say something failed.
- A third, `sr-only`, says what has no toast: a screen's title, "Saved as {file}", "Removed: {file}", a batch's count.
- A list that is loading is `aria-busy`, and its skeletons are one `role="status"` named "Loading…". A `Spinner` with a label is a status of its own; without one it is decoration beside words that say the same.
- A field's error is `role="alert"`, tied to the field with `aria-describedby`, and the field is `aria-invalid`.

## Names

- A switch has `role="switch"`, `aria-checked`, and a name that repeats its row's title.
- A segmented control is a named `role="group"` of buttons with `aria-pressed`.
- A button that acts on one thing among many names it: "Remove: {file}".
- Decorative pictures have an empty `alt`: tone pictures, avatars beside a username, the T3K mark beside the word TONE3000. Logos that stand alone are named "HX3K" and "TONE3000".
- A chip that only says "A2 Lite" explains itself in its `title`.

## Seeing

- Text is at least 4.5:1 on the ground it is used on, in both themes; the measured pairs are under Visual foundations.
- Color is never alone: success, warning and danger each come with an icon or words; the current menu entry has a ring as well as a fill; a selected tab has an underline as well as a color.
- A field's border is 3:1 or more against its ground (`hx-edge`). Panel hairlines are decoration and are not relied on.
- The interface reflows instead of shrinking: at 200% zoom the menu becomes a rail and everything else wraps. Text is in px on a 14px base, so it follows the window's zoom.
- `prefers-reduced-motion` is honored: see Motion under Visual foundations.

## Targets

Buttons are 36px tall (30px in rows, 44px on the splash), fields 38px, the Toggle 42 by 24px, a menu entry 37px: no control is under 24px in either direction. A link inside a sentence is as tall as its line.

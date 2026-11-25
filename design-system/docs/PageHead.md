How a screen and its sections are headed: a title with its lead and actions, and a small uppercase label over each section.

A CSS pattern, not a bundle export: there is no `window.HX3K.PageHead`. Source: every view in `src/renderer/src/views/`.

## Parts

| Class | What it is |
|---|---|
| `page` | The screen's column: at most 1120px, centered, 24px between its blocks. `page-narrow` is 760px, for screens of text and forms (Local files, the guide, Settings). |
| `page-head` | The first block: on the left the `h1` and its lead (`t3k-muted`, 62ch at most), on the right `actions`. It wraps. |
| `section` | A titled block: 12px between its label and its content. `section-tight` is 6px, for a label over a paragraph. |
| `section-head` | A section's label with a help line on the left and an action on the right. |
| `description`, `description-clamped` | A creator's own text: `t3k-muted-2`, 70ch at most, line breaks kept; clamped to four lines until "Read more". |
| `meta-row` | A wrapping line of counts in 13px `t3k-muted`: "1,301 downloads", "181 favorites". |
| `actions`, `actions-end`, `actions-loose` | A wrapping row of buttons 8px apart; pushed to the end; 16px apart for a row of links. |

## Rules

- One `h1` per screen, and it carries the screen's title id, so the content region is named by it and the window's title follows it ("Converted · HX3K").
- The lead is one sentence that says what the screen holds: "Captures ready for the User IR slots of your HX Stomp."
- `h2` is a label, not a headline: one to three words, set in uppercase by CSS ("Conversion", "Good to know"). Write it in sentence case.
- The head's actions are `btn-outline`. A screen's one `btn-primary` belongs to the section it acts on (Convert all, beside "Model"), not to the head.
- A screen that opens from another starts with a `btn-quiet btn-sm` Back above its head.

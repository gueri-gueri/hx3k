What a list shows when it has nothing: what is missing, how to fill it, and the way there.

A CSS pattern, not a bundle export: there is no `window.HX3K.EmptyState`. Source: `views/Tones.tsx`, `views/Converted.tsx`, `views/ToneDetail.tsx`.

`empty` is a dashed 1px `t3k-line` box with a 12px radius, 56px by 24px padding, everything centered and 10px apart. `empty-title` is 17px, weight 700, `t3k-fg`. The paragraph is `t3k-muted` and stops at 48ch. `actions` sits 8px lower.

## Rules

- Say what is missing, then what makes it appear: "No favorites yet. Favorite a tone on TONE3000 and it shows up here."
- A title only when the empty state is the whole screen ("Nothing converted yet"); a tab's empty list is a sentence alone.
- The first action is the `BrowseButton`. A second may follow as `btn-outline`.
- No illustration, no icon, no emoji.

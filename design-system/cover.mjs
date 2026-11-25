// The system's cover: components/Cover/preview.html, the picture above the brand book.
// One inline SVG and two lines of text, every fill and radius bound to a token.
import fs from 'node:fs'
import path from 'node:path'

// The tile sits in a 480-wide box that starts at x = 480 of the 960 layout.
const TILE = { x: 40, y: 24, w: 480, h: 240 }
// The split follows the slope of the X of the logo: 112.37 across for 172 down.
const SLOPE = 112.37 / 172
const TOP = 304 // where the split meets the tile's top edge
const at = (y) => TOP - (y - TILE.y) * SLOPE
const left = `0,0 ${at(0).toFixed(1)},0 ${at(288).toFixed(1)},288 0,288`
const right = `${at(0).toFixed(1)},0 480,0 480,288 ${at(288).toFixed(1)},288`
// The wave: pills one space-12 wide at a space-28 pitch, centered on the tile.
const HEIGHTS = [24, 56, 104, 152, 88, 136, 184, 120, 72, 160, 104, 48, 128, 80, 32]
const bars = HEIGHTS.map((h, i) => `<rect class="bar" x="${68 + i * 28}" y="${144 - h / 2}" width="12" height="${h}" rx="6"/>`).join('\n')

const html = `<!-- @dsCard height=288 -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HX3K</title>
<style>
  html, body { margin:0; height:100%; }
  body { background:var(--t3k-canvas); color:var(--t3k-fg); font-family:var(--t3k-font); overflow:hidden; }
  .cover { position:relative; height:288px; overflow:hidden; background:var(--t3k-canvas); }
  /* the composition: a 480-wide box on the right half of the 960 layout, clear of the name */
  .art { position:absolute; top:0; left:480px; width:480px; height:288px; overflow:hidden; }
  .art svg { display:block; width:480px; height:288px; }
  .tile { fill:var(--t3k-surface-2); rx:var(--t3k-radius); }
  .edge { fill:none; stroke:var(--t3k-line); stroke-width:1px; rx:var(--t3k-radius); }
  .blue { rx:var(--t3k-radius); }
  .stop-top { stop-color:var(--primary-top); }
  .stop-bottom { stop-color:var(--primary-bottom); }
  /* a space-12-wide pill: rx = half its width = radius-6 */
  .bar { rx:var(--radius-6); }
  .on-tile .bar { fill:var(--t3k-line-strong); }
  .on-blue .bar { fill:var(--t3k-on-primary); }
  .ready { fill:var(--t3k-success); rx:var(--radius-6); }
  /* name and tagline in flow, pinned by the block's bottom edge */
  .words { position:absolute; left:var(--space-28); bottom:var(--space-28); max-width:440px; }
  .name { margin:0; font-size:120px; line-height:.9; font-weight:800; letter-spacing:-.02em; color:var(--t3k-fg); }
  .tag { margin:var(--space-12) 0 0 var(--space-6); font-size:14px; line-height:20px; font-weight:400; color:var(--t3k-muted); }
</style>
</head>
<body>
<div class="cover">
<div class="art" aria-hidden="true">
<svg viewBox="0 0 480 288" width="480" height="288">
<!--
  blocks      t3k-surface-2 tile 480x240, bleeding off the right edge (the dark tile of the logo) · the t3k-primary gradient (primary-top to primary-bottom) over its right part, the largest field, as in the "3K" half of the logo · t3k-success once, a space-12 disc (it only ever means "converts")
  arrangement one tile cut in two by a slanted line, the split of the logo, which follows the slope of its X; a t3k-line hairline around the dark part only, as the logo draws it
  pattern     the wave: fifteen pills at a space-28 pitch, the app's own "wave" icon (a capture, and the stand-in for a missing picture), in t3k-line-strong on the tile and t3k-on-primary on the blue
  scales      tile inset space-24 from top and bottom, 240 tall (ten space-24); pills space-12 wide, heights in space-8 steps; corners t3k-radius; pill and disc rx radius-6 (half of space-12)
-->
<defs>
  <linearGradient id="primary" x1="0" y1="0" x2="0" y2="1">
    <stop class="stop-top" offset="0"/>
    <stop class="stop-bottom" offset="1"/>
  </linearGradient>
  <clipPath id="dark-part"><polygon points="${left}"/></clipPath>
  <clipPath id="blue-part"><polygon points="${right}"/></clipPath>
</defs>
<rect class="tile" x="${TILE.x}" y="${TILE.y}" width="${TILE.w}" height="${TILE.h}" rx="12"/>
<rect class="blue" x="${TILE.x}" y="${TILE.y}" width="${TILE.w}" height="${TILE.h}" rx="12" fill="url(#primary)" clip-path="url(#blue-part)"/>
<rect class="edge" x="${TILE.x + 0.5}" y="${TILE.y + 0.5}" width="${TILE.w}" height="${TILE.h - 1}" rx="12" clip-path="url(#dark-part)"/>
<g class="on-tile" clip-path="url(#dark-part)">
${bars}
</g>
<g class="on-blue" clip-path="url(#blue-part)">
${bars}
</g>
<rect class="ready" x="64" y="48" width="12" height="12" rx="6"/>
</svg>
</div>
<div class="words">
<div class="name">HX3K</div>
<p class="tag">TONE3000 captures for the HX Stomp</p>
</div>
</div>
</body>
</html>
`
/** Writes the cover under `OUT` (a project/ folder). Its folder stays bare: a README beside it would make it an ordinary card. */
export function writeCover(OUT) {
  const file = path.join(OUT, 'components', 'Cover', 'preview.html')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, html)
}

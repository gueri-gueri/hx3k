// Builds the hand-authored part of the HX3K design system into dist/project/:
// the tokens, the fonts, the brand book, the cover, and one card per entry of
// cards.json (stories/<Name>.jsx compiled into components/<Name>/preview.html,
// docs/<Name>.md plus the stories' own source into components/<Name>/README.md).
// The logo files of assets.json are gathered beside it, in dist/uploads/.
//
//   node build.mjs            everything
//   node build.mjs Button     only these cards, into the dist/ already there
import esbuild from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeCover } from './cover.mjs'
import { tokens, writeTokens } from './tokens.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const OUT = path.join(HERE, 'dist', 'project')
const UPLOADS = path.join(HERE, 'dist', 'uploads')
const cards = JSON.parse(fs.readFileSync(path.join(HERE, 'cards.json'), 'utf8'))
const assets = JSON.parse(fs.readFileSync(path.join(HERE, 'assets.json'), 'utf8'))
const only = process.argv.slice(2)

// What every stories file may use without importing: the bundle's components and React's hooks.
const PRELUDE =
  'const { Avatar, BrowseButton, Creator, ExternalLink, FitChip, Hx3kLogo, Hx3kMark, Icon, Notice, Spinner, T3KMark, Toggle, Tone3000Logo, ToneImage, Verified } = window.HX3K;\n' +
  'const { useState, useRef, Fragment } = React;\n'

// The frame of a card, the same one the synced component cards use: a grid of
// labelled cells, one per story.
const HEAD = `<!doctype html>
<html><head><meta charset="utf-8">
  <style>
    body{margin:0;padding:24px;background:#fff}
    /* auto-fit (not auto-fill): empty tracks collapse, so a 1-2 story card
       fills the width instead of stranding stories in a half-width left
       column beside phantom empty columns */
    .ds-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;align-items:start}
    .ds-grid.ds-col{grid-template-columns:1fr}
    .ds-cell{border:1px solid #e5e7eb;border-radius:8px;padding:12px;min-width:0;overflow:hidden;transform:translateZ(0)}
    .ds-cell>h4{margin:0 0 8px;font:600 12px system-ui;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
    .ds-single{transform:translateZ(0)}
  </style>
</head><body>
  <div class="ds-grid" id="g"></div>
`

const runtime = (name, mode, surface, order) => `  <script>
    var h=React.createElement, g=document.getElementById('g');
    var E=[]; for (var k in (window.__dsPreview||{})) {
      if (typeof window.__dsPreview[k]==='function' && /^[A-Z]/.test(k)) E.push(k);
    }
    // The stories in the order their file gives them.
    var ORDER=${JSON.stringify(order)};
    E.sort(function(a,b){return ORDER.indexOf(a)-ORDER.indexOf(b)});
    window.__dsCells=E.slice();
    var q=null; try{q=new URLSearchParams(location.search).get('story')}catch(e){}
    var MODE=${JSON.stringify(mode)};
    window.__dsMode=MODE;
    if(MODE==='column'){g.className+=' ds-col'}
    // The frame's own theme is handed to the provider, so a card follows the theme it is opened in.
    var TH=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
    function mount(id,key){try{ReactDOM.createRoot(document.getElementById(id)).render(h(window.HX3K.HX3KProvider,{"surface":${surface ? 'true' : 'false'},"theme":TH},h(window.__dsPreview[key])))}catch(e){document.getElementById(id).textContent='\\u26a0 '+(e&&e.message||e)}}
    var pick=null;
    if(q){for(var j=0;j<E.length;j++){if(E[j]===q||E[j].toLowerCase()===q.toLowerCase()){pick=E[j];break}}}
    else if(MODE==='single'&&E.length){pick=E[0]}
    if(q&&!pick){g.textContent='\\u26a0 no export named '+q}
    else if(pick){
      var s=document.createElement('div'); s.className='ds-single'; s.id='r0';
      if(!q)document.body.style.padding='0';
      g.parentNode.replaceChild(s,g); mount('r0',pick);
    } else {
      for(var i=0;i<E.length;i++){
        var cell=document.createElement('section'); cell.className='ds-cell';
        cell.innerHTML='<h4>'+E[i]+'</h4><div id="r'+i+'"></div>'; g.appendChild(cell);
        mount('r'+i,E[i]);
      }
      if(E.length===0){g.textContent='\\u26a0 no stories for ${name}'}
    }
  </script>
</body></html>
`

/** Each `export const Name = …` of a stories file, as the README shows it. */
function storySources(text) {
  const marks = []
  const re = /^export const ([A-Z]\w*) = /gm
  let m
  while ((m = re.exec(text))) marks.push({ name: m[1], at: m.index, body: m.index + m[0].length })
  return marks.map((mk, i) => ({ name: mk.name, code: text.slice(mk.body, i + 1 < marks.length ? marks[i + 1].at : text.length).trim() }))
}

/** The files the app ships its two typefaces in, from the app's own packages. */
function copyFonts() {
  for (const font of tokens.type.fonts) {
    const name = path.basename(font.file)
    const pkg = name.startsWith('figtree-') ? 'figtree' : 'jetbrains-mono'
    const from = path.join(ROOT, 'node_modules', '@fontsource-variable', pkg, 'files', name)
    if (!fs.existsSync(from)) throw new Error(`${name} is not in the app's node_modules: run "npm install" at the root of the repository first`)
    fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true })
    fs.copyFileSync(from, path.join(OUT, font.file))
  }
}

/**
 * The logos, copied from where the app keeps them and named as the design
 * system names them. A picture under assets/ is an upload the index points at,
 * not a file of project/, so they are gathered apart, for whoever publishes.
 * Every one must be told of in its group's note and in this folder's README,
 * and neither may tell of one that is not here.
 */
function copyUploads() {
  const readme = fs.readFileSync(path.join(HERE, 'README.md'), 'utf8')
  const groups = [...new Set(assets.map((a) => a.group))]
  const notes = Object.fromEntries(
    groups.map((group) => {
      const file = path.join(HERE, 'content', 'assets', group, 'README.md')
      if (!fs.existsSync(file)) throw new Error(`content/assets/${group}/README.md is missing: the group's note says what each of its files is for`)
      return [group, fs.readFileSync(file, 'utf8')]
    }),
  )
  for (const group of groups) {
    const here = assets.filter((a) => a.group === group).map((a) => a.name)
    for (const [, named] of notes[group].matchAll(/`([\w.-]+\.(?:svg|png|jpe?g|webp|gif|pdf))`/gi)) {
      if (!here.includes(named)) throw new Error(`content/assets/${group}/README.md tells of ${named}, which assets.json does not list`)
    }
  }
  fs.rmSync(UPLOADS, { recursive: true, force: true })
  for (const asset of assets) {
    const from = path.join(ROOT, asset.from)
    if (!fs.existsSync(from)) throw new Error(`${asset.from} is gone: assets.json gives it as the source of ${asset.group}/${asset.name}`)
    if (!notes[asset.group].includes('`' + asset.name + '`')) throw new Error(`content/assets/${asset.group}/README.md does not say what ${asset.name} is for`)
    if (!readme.includes('`' + asset.group + '/' + asset.name + '`') || !readme.includes('`' + asset.from + '`')) {
      throw new Error(`README.md does not list ${asset.group}/${asset.name} with its source, ${asset.from}`)
    }
    fs.mkdirSync(path.join(UPLOADS, asset.group), { recursive: true })
    fs.copyFileSync(from, path.join(UPLOADS, asset.group, asset.name))
  }
  return assets.length
}

/** content/ is published as it is: the README, the brand book's sections, the notes of each asset group. */
function copyContent(from = path.join(HERE, 'content'), to = OUT) {
  let n = 0
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.isDirectory()) n += copyContent(path.join(from, entry.name), path.join(to, entry.name))
    else {
      fs.mkdirSync(to, { recursive: true })
      fs.copyFileSync(path.join(from, entry.name), path.join(to, entry.name))
      n++
    }
  }
  return n
}

async function buildCard(card) {
  const src = fs.readFileSync(path.join(HERE, 'stories', card.name + '.jsx'), 'utf8')
  const built = await esbuild.build({
    stdin: { contents: PRELUDE + src, resolveDir: path.join(HERE, 'stories'), loader: 'jsx', sourcefile: card.name + '.jsx' },
    bundle: true,
    format: 'iife',
    globalName: '__dsPreview',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: 'es2019',
    write: false,
    legalComments: 'none',
  })
  const js = built.outputFiles[0].text
  // The page inlines a preview, so neither may appear inside its script.
  if (/<\/script|<!--/i.test(js)) throw new Error(card.name + ': the compiled stories hold a literal </script or <!--')
  const stories = storySources(src)
  const attrs = [
    card.group ? `group="${card.group}"` : '',
    card.height ? `height=${card.height}` : '',
    card.width ? `width=${card.width}` : '',
    card.subtitle ? `subtitle="${card.subtitle}"` : '',
    card.page ? 'page' : '',
  ].filter(Boolean)
  const html =
    `<!-- @dsCard ${attrs.join(' ')} -->\n` +
    HEAD +
    '<script>' +
    js +
    '</script>\n' +
    runtime(
      card.name,
      card.mode ?? 'grid',
      card.surface !== false,
      stories.map((s) => s.name),
    )
  const dir = path.join(OUT, 'components', card.name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'preview.html'), html)

  const doc = fs.readFileSync(path.join(HERE, 'docs', card.name + '.md'), 'utf8').trim()
  const examples = stories.map((s) => `### ${s.name}\n\n\`\`\`jsx\n${s.code}\n\`\`\``).join('\n\n')
  fs.writeFileSync(path.join(dir, 'README.md'), doc + '\n\n## Examples\n\n' + examples + '\n')
  return stories.length
}

if (only.length) {
  for (const name of only) {
    const card = cards.find((c) => c.name === name)
    if (!card) throw new Error(`no card named ${name} in cards.json`)
    console.log(name, '·', await buildCard(card), 'stories')
  }
} else {
  fs.rmSync(OUT, { recursive: true, force: true })
  copyFonts()
  console.log('tokens  ', writeTokens(OUT))
  console.log('content ', copyContent(), 'files')
  console.log('uploads ', copyUploads(), 'logo files')
  let stories = 0
  for (const card of cards) stories += await buildCard(card)
  console.log('cards   ', cards.length, 'with', stories, 'stories')
  writeCover(OUT)
  console.log('cover    components/Cover/preview.html')
  console.log('written to', path.relative(ROOT, OUT), 'and', path.relative(ROOT, UPLOADS))
}

// Renders build/icon.svg to build/icon.png (1024 x 1024), the picture
// electron-builder makes the app icons from. Run it after changing the SVG:
//
//   npm run icon

const { app, BrowserWindow } = require('electron')
const { readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const SIZE = 1024
const dir = join(__dirname, '../build')

app.disableHardwareAcceleration()
app.dock?.hide()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true, sandbox: true },
  })
  const svg = readFileSync(join(dir, 'icon.svg'), 'utf8')
  const page = `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page)}`)
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE })
  // A HiDPI screen captures at twice the size; the icon is always 1024.
  writeFileSync(join(dir, 'icon.png'), image.resize({ width: SIZE, height: SIZE, quality: 'best' }).toPNG())
  app.quit()
})

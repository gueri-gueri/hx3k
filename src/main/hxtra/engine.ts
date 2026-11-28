// The firmware build itself: HXtra's setup page's web/firmware-worker.js, here.
// Pyodide runs the release's own Python tools, the same commands build.py runs
// (without --check, the simulator run), in the same order and with the same
// switches. Python sees only its own in-memory file system: the tools and the
// stock file are copied into it, and the built file is read back out.
//
// It runs in a worker thread (engine.worker.ts), never in the app's own thread:
// a build keeps a core busy for up to a minute.

import { readFile } from 'node:fs/promises'
import { join, posix } from 'node:path'
import type { PyodideInterface, loadPyodide as LoadPyodide } from 'pyodide'

export interface EngineJob {
  /** Pyodide's own folder, ending with a separator. */
  indexURL: string
  /** Where Pyodide keeps the packages it downloads (numpy). */
  packageCacheDir: string
  /** The release's files, as sources.ts left them. */
  sourcesDir: string
  /** Their paths, relative to sourcesDir and to the repository. */
  files: string[]
  /** The release's m4cache.json, relative to sourcesDir. */
  cache: string
  stockPath: string
  stockMd5: string
  unit: string
  kernel: string[]
  steps: string[][]
  e3Max: number
  /** The switches, as buildFlags() gives them. */
  flags: string[]
  /** NAM A2 Lite's slots; 0 for none. */
  slots: number
}

export type EngineEvent = { type: 'progress'; step: number } | { type: 'log'; text: string }

type Emit = (event: EngineEvent) => void

// One command of build.py: run a script as __main__ with argv, its folder on
// sys.path as `python script.py` has it (the setup page's DRIVER, as of the
// fix that lets a build with no NAM blocks find tools/features).
const DRIVER = [
  'import contextlib, io, os, runpy, sys',
  "os.chdir('/repo')",
  'def run(argv):',
  '    out = io.StringIO()',
  '    sys.argv = list(argv)',
  '    here = os.path.dirname(os.path.abspath(argv[0]))',
  '    if here not in sys.path:',
  '        sys.path.insert(0, here)',
  '    try:',
  '        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):',
  "            runpy.run_path(argv[0], run_name='__main__')",
  '    except SystemExit as e:',
  '        if e.code not in (None, 0):',
  '            raise RuntimeError(out.getvalue() + str(e.code))',
  '    return out.getvalue()',
].join('\n')

async function boot(job: EngineJob, load: typeof LoadPyodide, emit: Emit): Promise<PyodideInterface> {
  const log = (text: string): void => emit({ type: 'log', text: `${text}\n` })
  const py = await load({ indexURL: job.indexURL, packageCacheDir: job.packageCacheDir, stdout: log, stderr: log })
  await py.loadPackage('numpy', { messageCallback: log, errorCallback: log })
  for (const path of [...job.files, job.cache]) {
    const dest = `/repo/${path}`
    py.FS.mkdirTree(posix.dirname(dest))
    py.FS.writeFile(dest, await readFile(join(job.sourcesDir, path)))
  }
  py.FS.mkdirTree('/repo/build')
  py.runPython(DRIVER)
  return py
}

/** Builds the firmware; resolves with its bytes. */
export async function runEngine(job: EngineJob, emit: Emit, load: typeof LoadPyodide): Promise<Uint8Array> {
  const progress = (step: number): void => emit({ type: 'progress', step })
  const log = (text: string): void => emit({ type: 'log', text })

  progress(1)
  const py = await boot(job, load, emit)

  progress(2)
  py.FS.writeFile('/repo/build/stock.hxf', await readFile(job.stockPath))
  const md5 = py.runPython("import hashlib; hashlib.md5(open('/repo/build/stock.hxf','rb').read()).hexdigest()") as string
  if (md5 !== job.stockMd5) throw new Error(`This is not the stock firmware the release builds from (its MD5 is ${md5}).`)
  log(`stock firmware: ${job.unit.replace(/_/g, ' ')} 3.80.0 (MD5 ${md5})\n`)

  // The features' switches and the slot count, as build.py's environment has them; their M4 code from the cache.
  py.globals.set('flags', py.toPy(job.flags))
  py.runPython(
    [
      "for k in [k for k in os.environ if k.startswith('HX_')]: del os.environ[k]",
      "os.environ.update({f: '1' for f in flags})",
      `os.environ['HX_NAM_SLOTS'] = '${job.slots}'`,
      `if flags: os.environ['HX_M4_CACHE'] = '/repo/${job.cache}'`,
    ].join('\n'),
  )
  log(`features: ${job.flags.join(' ') || 'none'}\nNAM slots: ${job.slots}\n`)

  const run = py.globals.get('run') as ((argv: unknown) => string) & { destroy(): void }
  const step = (n: number, argv: string[]): string => {
    progress(n)
    log(`$ ${argv.join(' ')}\n`)
    const out = run(py.toPy(argv))
    log(out)
    return out
  }
  const rename = (from: string, to: string): void => py.FS.rename(`/repo/${from}`, `/repo/${to}`)
  const unlink = (path: string): void => py.FS.unlink(`/repo/${path}`)

  const file = 'build/hxtra.hxf'
  try {
    const { slots } = job
    if (slots) step(3, [...job.kernel, ...(slots === 3 ? [] : ['--slots', String(slots)]), '-o', 'build/nam_lite.asm'])
    let base = 'build/stock.hxf'
    if (slots) {
      job.steps.forEach((s, k) => {
        const out = `build/nam_lite_${k}.l6ia`
        step(4, ['tools/patch_amp.py', s[0], base, out, ...s.slice(1)])
        if (base !== 'build/stock.hxf') unlink(base)
        base = out
      })
    }
    step(4, ['tools/patch_menu.py', base, 'build/nam_lite_menu.l6ia'])
    if (base !== 'build/stock.hxf') unlink(base)
    base = 'build/nam_lite_menu.l6ia'
    if (slots) {
      step(5, ['tools/patch_amp.py', 'patch', base, 'build/nam_lite.l6ia', '--asm', 'build/nam_lite.asm'])
      unlink(base)
    } else {
      rename(base, 'build/nam_lite.l6ia')
    }
    // The DSP features, in build.py's order; the GR meter last: every step that adds a model rebuilds the tails its knobs live in.
    const dspSteps: [flag: string, script: string, out: string][] = [
      ['HX_CLICK', 'tools/patch_click.py', 'build/nam_lite_click.l6ia'],
      ['HX_FX_GATE', 'tools/patch_gate.py', 'build/nam_lite_gate.l6ia'],
      ['HX_GATE_SC', 'tools/patch_sidechain.py', 'build/nam_lite_sc.l6ia'],
      ['HX_USB_MONITOR', 'tools/patch_usbmon.py', 'build/nam_lite_usbmon.l6ia'],
      ['HX_GR', 'tools/patch_comp.py', 'build/nam_lite_comp.l6ia'],
    ]
    for (const [flag, script, out] of dspSteps) {
      if (!job.flags.includes(flag)) continue
      step(5, [script, 'build/nam_lite.l6ia', out])
      rename(out, 'build/nam_lite.l6ia')
    }
    const report = step(6, ['tools/l6ia_verify.py', 'build/nam_lite.l6ia', '--e3-max', `0x${job.e3Max.toString(16)}`])
    if (!report.includes('ALL OK')) throw new Error('The built image failed its check.')
    step(6, ['tools/hxf.py', 'pack', 'build/nam_lite.l6ia', file, '--donor', 'build/stock.hxf'])
  } finally {
    run.destroy()
  }
  return py.FS.readFile(`/repo/${file}`) as Uint8Array
}

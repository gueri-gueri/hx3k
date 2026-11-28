// The worker thread a firmware build runs in (engineHost.ts starts it).
// In:  workerData, an EngineJob.
// Out: EngineEvents, then { type: 'done', bytes } or { type: 'error', text }.

import { createRequire } from 'node:module'
import { join } from 'node:path'
import { parentPort, workerData } from 'node:worker_threads'
import type { loadPyodide as LoadPyodide } from 'pyodide'
import { type EngineEvent, type EngineJob, runEngine } from './engine'

const job = workerData as EngineJob
const port = parentPort
if (!port) throw new Error('engine.worker.ts runs as a worker thread')

// Pyodide from its own folder: in the packaged app that is outside the archive, where its .wasm can be read.
const { loadPyodide } = createRequire(join(job.indexURL, 'pyodide.js'))('./pyodide.js') as { loadPyodide: typeof LoadPyodide }

runEngine(job, (event: EngineEvent) => port.postMessage(event), loadPyodide).then(
  (bytes) => {
    const copy = bytes.slice()
    port.postMessage({ type: 'done', bytes: copy }, [copy.buffer])
  },
  (err: unknown) => port.postMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) }),
)

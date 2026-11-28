// Starts a firmware build in its own worker thread. Only the app loads this
// file: the tests drive runEngine() directly.

import type { EngineEvent, EngineJob } from './engine'
import createWorker from './engine.worker?nodeWorker'

export interface EngineRun {
  /** The built file's bytes. */
  done: Promise<Uint8Array>
  /** Stops the build where it is. `done` then rejects with "canceled". */
  cancel(): void
}

export function startEngine(job: EngineJob, onEvent: (event: EngineEvent) => void): EngineRun {
  const worker = createWorker({ workerData: job })
  let canceled = false
  const done = new Promise<Uint8Array>((resolve, reject) => {
    worker.on('message', (m: EngineEvent | { type: 'done'; bytes: Uint8Array } | { type: 'error'; text: string }) => {
      if (m.type === 'done') resolve(m.bytes)
      else if (m.type === 'error') reject(new Error(m.text))
      else onEvent(m)
    })
    worker.on('error', reject)
    worker.on('exit', (code) => reject(new Error(canceled ? 'canceled' : `The build stopped (exit code ${code}).`)))
  }).finally(() => void worker.terminate())
  return {
    done,
    cancel: () => {
      canceled = true
      void worker.terminate()
    },
  }
}

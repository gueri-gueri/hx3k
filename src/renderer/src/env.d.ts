/// <reference types="vite/client" />

import type { Bridge } from '@shared/ipc'

declare global {
  interface Window {
    /** The preload bridge (src/preload/index.ts). */
    hx: Bridge
  }
}

/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  /** TONE3000 publishable key baked in at build time (.env), if any. */
  readonly MAIN_VITE_T3K_PUBLISHABLE_KEY?: string
  readonly MAIN_VITE_T3K_REDIRECT_URI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

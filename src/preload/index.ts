/// <reference lib="dom" />
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { type Bridge, IPC } from '@shared/ipc'
import type { AuthResult, HxtraProgress } from '@shared/types'

// The theme the window was opened with (src/main/index.ts), put on the document
// before its first paint: a light-theme user never sees a dark flash.
const initialTheme = process.argv.includes('--hx-theme=light') ? 'light' : 'dark'
function applyTheme(): boolean {
  if (!document.documentElement) return false
  document.documentElement.dataset.theme = initialTheme
  return true
}
if (!applyTheme()) {
  const observer = new MutationObserver(() => {
    if (applyTheme()) observer.disconnect()
  })
  observer.observe(document, { childList: true })
}

// The whole surface the page gets: named calls, no ipcRenderer, no Node.
const bridge: Bridge = {
  initialTheme,
  state: () => ipcRenderer.invoke(IPC.state),
  updateSettings: (patch) => ipcRenderer.invoke(IPC.settingsUpdate, patch),
  chooseOutputDir: () => ipcRenderer.invoke(IPC.chooseOutputDir),

  beginAuth: (request, bounds, flowId) => ipcRenderer.invoke(IPC.authBegin, request, bounds, flowId),
  setAuthBounds: (bounds) => ipcRenderer.send(IPC.authBounds, bounds),
  cancelAuth: (flowId) => ipcRenderer.invoke(IPC.authCancel, flowId),
  onAuthResult: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, flowId: string, result: AuthResult): void => listener(flowId, result)
    ipcRenderer.on(IPC.authResult, handler)
    return () => {
      ipcRenderer.off(IPC.authResult, handler)
    }
  },
  focusAuth: () => ipcRenderer.send(IPC.authFocus),
  onAuthKeyboardExit: (listener) => {
    const handler = (): void => listener()
    ipcRenderer.on(IPC.authKeyboardExit, handler)
    return () => {
      ipcRenderer.off(IPC.authKeyboardExit, handler)
    }
  },
  signOut: () => ipcRenderer.invoke(IPC.signOut),

  tones: (kind, page) => ipcRenderer.invoke(IPC.tones, kind, page),
  tone: (id) => ipcRenderer.invoke(IPC.tone, id),
  models: (toneId) => ipcRenderer.invoke(IPC.models, toneId),

  convertModel: (toneId, modelId) => ipcRenderer.invoke(IPC.convertModel, toneId, modelId),
  convertLocal: (files) => ipcRenderer.invoke(IPC.convertLocal, files),

  library: () => ipcRenderer.invoke(IPC.library),
  removeConversion: (id) => ipcRenderer.invoke(IPC.libraryRemove, id),
  sendToDevice: (id) => ipcRenderer.invoke(IPC.deviceSend, id),
  reveal: (id) => ipcRenderer.invoke(IPC.reveal, id),

  hxtraState: () => ipcRenderer.invoke(IPC.hxtraState),
  hxtraChoose: (version, choice) => ipcRenderer.invoke(IPC.hxtraChoose, version, choice),
  // The page knows the file it was given, not where it is: its path is asked here, where the page cannot.
  hxtraSetStock: (file) => ipcRenderer.invoke(IPC.hxtraSetStock, webUtils.getPathForFile(file)),
  hxtraBuild: (version, choice) => ipcRenderer.invoke(IPC.hxtraBuild, version, choice),
  hxtraCancel: () => ipcRenderer.invoke(IPC.hxtraCancel),
  onHxtraProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: HxtraProgress): void => listener(progress)
    ipcRenderer.on(IPC.hxtraProgress, handler)
    return () => {
      ipcRenderer.off(IPC.hxtraProgress, handler)
    }
  },
  hxtraSave: () => ipcRenderer.invoke(IPC.hxtraSave),
  hxtraReveal: () => ipcRenderer.invoke(IPC.hxtraReveal),
  hxtraOpenUpdater: () => ipcRenderer.invoke(IPC.hxtraOpenUpdater),
  openOutputDir: () => ipcRenderer.invoke(IPC.openOutputDir),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
}

contextBridge.exposeInMainWorld('hx', bridge)

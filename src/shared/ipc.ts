import type {
  AppState,
  AuthRequest,
  AuthResult,
  ConversionRecord,
  LocalNam,
  LocalOutcome,
  Model,
  Result,
  Settings,
  Tone,
  ToneListKind,
  TonePage,
  ViewBounds,
} from './types'

export const IPC = {
  state: 'app:state',
  settingsUpdate: 'settings:update',
  chooseOutputDir: 'settings:choose-output-dir',
  authBegin: 'auth:begin',
  authBounds: 'auth:bounds',
  authCancel: 'auth:cancel',
  authFocus: 'auth:focus',
  authKeyboardExit: 'auth:keyboard-exit',
  authResult: 'auth:result',
  signOut: 'auth:sign-out',
  tones: 't3k:tones',
  tone: 't3k:tone',
  models: 't3k:models',
  convertModel: 'convert:model',
  convertLocal: 'convert:local',
  library: 'library:list',
  libraryRemove: 'library:remove',
  reveal: 'shell:reveal',
  openOutputDir: 'shell:open-output-dir',
  openExternal: 'shell:open-external',
} as const

/** `window.hx`: everything the renderer can ask of the main process. */
export interface Bridge {
  /** The theme the window was opened with, known before the first paint. */
  initialTheme: 'dark' | 'light'
  state(): Promise<Result<AppState>>
  updateSettings(patch: Partial<Settings>): Promise<Result<AppState>>
  /** Opens the folder picker; resolves with the new state, unchanged if the user cancels. */
  chooseOutputDir(): Promise<Result<AppState>>

  /**
   * Opens the embedded TONE3000 view at `bounds`. `flowId` names this flow: its
   * outcome arrives through onAuthResult under the same id, and only that id cancels it.
   */
  beginAuth(request: AuthRequest, bounds: ViewBounds, flowId: string): Promise<Result<null>>
  setAuthBounds(bounds: ViewBounds): void
  /** Closes the flow `flowId`, if it is still the one open. */
  cancelAuth(flowId: string): Promise<Result<null>>
  onAuthResult(listener: (flowId: string, result: AuthResult) => void): () => void
  /** Puts the keyboard in TONE3000's page. */
  focusAuth(): void
  /** The user pressed F6 in TONE3000's page: the keyboard is back on the app. */
  onAuthKeyboardExit(listener: () => void): () => void
  signOut(): Promise<Result<AppState>>

  tones(kind: ToneListKind, page: number): Promise<Result<TonePage>>
  tone(id: number): Promise<Result<Tone>>
  models(toneId: number): Promise<Result<Model[]>>

  /** Downloads one model of a tone and writes its .wav. */
  convertModel(toneId: number, modelId: number): Promise<Result<ConversionRecord>>
  convertLocal(files: LocalNam[]): Promise<Result<LocalOutcome[]>>

  library(): Promise<Result<ConversionRecord[]>>
  /** Forgets a conversion and moves its .wav, if still there, to the system trash. */
  removeConversion(id: string): Promise<Result<ConversionRecord[]>>
  reveal(id: string): Promise<Result<null>>
  openOutputDir(): Promise<Result<null>>
  /** Opens an https link in the system browser. */
  openExternal(url: string): Promise<Result<null>>
}

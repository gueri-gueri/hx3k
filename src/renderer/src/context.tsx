import { type RefObject, createContext, useContext, useEffect } from 'react'
import type { AppState, ConversionRecord, ToneListKind, TonePage } from '@shared/types'
import type { Lang, T } from './i18n'

export type View =
  | { name: 'tones' }
  | { name: 'tone'; id: number }
  /**
   * TONE3000's own pages, inside the app. `start`: the user already said
   * Continue on the splash, so a visit before sign-in goes straight to sign-in.
   */
  | { name: 'tone3000'; start?: boolean }
  | { name: 'converted' }
  | { name: 'local' }
  | { name: 'guide' }
  | { name: 'settings' }

export interface AppContext {
  state: AppState
  /** Takes a state the main process sent back (after a settings change, say). */
  applyState(next: AppState): void
  t: T
  lang: Lang

  view: View
  go(view: View): void

  /** The tab of the tone lists, kept while the user looks at a tone and comes back. */
  tab: ToneListKind
  setTab(tab: ToneListKind): void
  /** Pages already fetched, by "kind:page", so going back asks TONE3000 nothing. */
  pages: Map<string, TonePage>

  /** Goes to the TONE3000 screen: its catalog, or the splash before the first sign-in. */
  browse(): void

  library: ConversionRecord[]
  setLibrary(records: ConversionRecord[]): void
  reloadLibrary(): Promise<void>

  notify(kind: 'ok' | 'error', text: string): void
  /**
   * Tells the user about a failed call, and drops to the splash when the session
   * ended. `quiet`: the view shows the error itself, so no toast unless it ended.
   */
  fail(err: unknown, quiet?: boolean): void
  /** Opens an https link in the system browser. */
  open(url: string): void

  /** Says `text` to assistive technology, without moving focus. */
  announce(text: string): void
  /** Puts focus at the start of the screen, when what had it is gone. */
  focusScreen(): void
  /** What to give focus back to on returning to the lists: "tone:<id>" is the card a tone was opened from. */
  focusOnReturn: RefObject<string | null>
}

export const Ctx = createContext<AppContext | null>(null)

export function useApp(): AppContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp outside the app')
  return ctx
}

/** The id every screen gives its title, so the screen's region is named by it. */
export const SCREEN_TITLE_ID = 'screen-title'

/**
 * Names the screen: in the window's title and, said once, to assistive
 * technology. A screen change is otherwise silent to someone who cannot see it.
 */
export function useScreenTitle(title: string | null | undefined): void {
  const { announce } = useApp()
  useEffect(() => {
    if (!title) return
    document.title = `${title} · HXtra 3000`
    announce(title)
  }, [title, announce])
}

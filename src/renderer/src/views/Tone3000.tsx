import { type ReactNode, useEffect, useRef } from 'react'
import type { AuthResult, ViewBounds } from '@shared/types'
import { call, hx } from '../api'
import { Spinner } from '../components/ui'
import { useApp, useScreenTitle } from '../context'

/**
 * The TONE3000 screen: TONE3000's own pages (sign-in, then its catalog) beside
 * the app's menu. The main process lays a native view over the stage below, at
 * the bounds measured here. The flow lives as long as this screen is shown:
 * leaving it closes the flow, and `onDone` says how a flow ended by itself
 * (a tone picked, the catalog closed, an error).
 *
 * Keyboard: Tab cannot cross between the app's page and the embedded one, so
 * the crossing is made here. Tab past the menu (or F6) goes into TONE3000's
 * page; F6 there comes back to the menu (src/main/oauth.ts).
 */
export function Tone3000Stage({ onDone }: { onDone(result: AuthResult): void }): ReactNode {
  const { t, state, fail } = useApp()
  const stage = useRef<HTMLElement>(null)
  useScreenTitle('TONE3000')

  // The newest callbacks, for an effect that must run once per visit.
  const done = useRef(onDone)
  done.current = onDone
  const failed = useRef(fail)
  failed.current = fail

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const bounds = (): ViewBounds => {
      const r = el.getBoundingClientRect()
      return { x: r.left, y: r.top, width: r.width, height: r.height }
    }

    // This visit's flow. An answer about any other flow is not for this screen.
    const flowId = crypto.randomUUID()
    let shown = true
    const unsubscribe = hx.onAuthResult((id, result) => {
      if (shown && id === flowId) done.current(result)
    })

    call(hx.beginAuth({ prompt: 'select_tone' }, bounds(), flowId)).catch((err: unknown) => {
      if (!shown) return
      failed.current(err)
      done.current({ status: 'canceled' })
    })

    const follow = (): void => hx.setAuthBounds(bounds())
    const observer = new ResizeObserver(follow)
    observer.observe(el)
    window.addEventListener('resize', follow)

    // F6 in TONE3000's page: the keyboard lands on this screen's entry in the menu.
    const offExit = hx.onAuthKeyboardExit(() => {
      document.querySelector<HTMLElement>('.nav-item[aria-current="page"]')?.focus()
    })
    // F6 in the app: back into TONE3000's page.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'F6') return
      e.preventDefault()
      hx.focusAuth()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      shown = false
      unsubscribe()
      offExit()
      observer.disconnect()
      window.removeEventListener('resize', follow)
      window.removeEventListener('keydown', onKey)
      void hx.cancelAuth(flowId)
    }
  }, [])

  // Hands the keyboard to TONE3000's page. Focus is dropped here first, or it
  // would come straight back in when the app's page gets the keyboard again.
  const enter = (el: HTMLElement): void => {
    el.blur()
    hx.focusAuth()
  }

  return (
    <main className="stage" ref={stage} aria-label="TONE3000">
      {/* Where Tab arrives after the menu: it goes on into TONE3000's page. */}
      <button type="button" className="sr-only" onFocus={(e) => enter(e.currentTarget)} onClick={(e) => enter(e.currentTarget)}>
        {t('tone3000.enter')}
      </button>
      <div className="stage-wait">
        <Spinner label={state.mock ? t('flow.mock') : t('flow.opening')} />
        <strong>{state.mock ? t('flow.mock') : t('flow.opening')}</strong>
        {!state.mock && !state.connected && <span>{t('flow.hint')}</span>}
      </div>
    </main>
  )
}

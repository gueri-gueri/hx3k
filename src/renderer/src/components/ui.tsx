import { type ReactNode, useState } from 'react'
import type { Fit } from '@shared/compat'
import type { EmbeddedUser } from '@shared/types'
import { useApp } from '../context'
import type { Key } from '../i18n'
import { T3KMark } from './Brand'
import { Icon, Verified } from './Icon'

/** With `label` it is a status of its own; without, decoration beside text that says what is happening. */
export function Spinner({ label }: { label?: string }): ReactNode {
  return label ? <span className="spinner" role="status" aria-label={label} /> : <span className="spinner" aria-hidden="true" />
}

/** A picture from TONE3000, with a neutral stand-in when there is none or it fails. */
export function ToneImage({ src, className }: { src: string | null | undefined; className: string }): ReactNode {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className={`${className} tone-image-empty`} aria-hidden="true">
        <Icon name="wave" />
      </div>
    )
  }
  return <img className={className} src={src} alt="" loading="lazy" draggable={false} onError={() => setFailed(true)} />
}

export function Avatar({ name, src, size = 22 }: { name: string; src: string | null | undefined; size?: number }): ReactNode {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size, fontSize: Math.round(size * 0.45) }
  if (!src || failed) {
    return (
      <span className="avatar" style={style} aria-hidden="true">
        {name.replace(/[^a-z0-9]/gi, '').slice(0, 1) || '?'}
      </span>
    )
  }
  return <img className="avatar" style={style} src={src} alt="" draggable={false} onError={() => setFailed(true)} />
}

/** A creator as TONE3000 shows one: avatar and @username. */
export function Creator({
  user,
  size,
}: {
  user: Pick<EmbeddedUser, 'username' | 'avatar_url' | 'is_verified'>
  size?: number
}): ReactNode {
  const { t } = useApp()
  return (
    <span className="creator">
      <Avatar name={user.username} src={user.avatar_url} size={size} />
      <span className="creator-name">@{user.username}</span>
      {user.is_verified && <Verified title={t('common.verified')} />}
    </span>
  )
}

const FIT_CLASS: Record<Fit, string> = { ready: 'chip chip-ready', no: 'chip chip-line chip-off' }

/** Whether a tone or a model can be converted for the HX Stomp. */
export function FitChip({ fit }: { fit: Fit }): ReactNode {
  const { t } = useApp()
  return (
    <span className={FIT_CLASS[fit]} title={t(`fit.${fit}.title` as Key)}>
      {fit === 'ready' && <span className="dot" />}
      {t(`fit.${fit}` as Key)}
    </span>
  )
}

/** The persistent way into the full TONE3000 catalog (the Select flow). */
export function BrowseButton({ large }: { large?: boolean }): ReactNode {
  const { t, browse } = useApp()
  return (
    <button type="button" className={large ? 'btn btn-browse btn-lg' : 'btn btn-browse'} onClick={browse} title={t('browse.title')}>
      <T3KMark decorative />
      {t('browse.button')}
    </button>
  )
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }): ReactNode {
  const { open } = useApp()
  return (
    <a
      className="link"
      href={href}
      onClick={(e) => {
        e.preventDefault()
        open(href)
      }}
    >
      {children}
    </a>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange(next: boolean): void; label: string }): ReactNode {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={() => onChange(!checked)} />
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error'; children: ReactNode }): ReactNode {
  return (
    <div className={kind === 'error' ? 'notice notice-error' : 'notice'} role={kind === 'error' ? 'alert' : undefined}>
      <Icon name={kind === 'error' ? 'alert' : 'info'} />
      <div>{children}</div>
    </div>
  )
}

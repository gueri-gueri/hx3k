// The app's shell (src/renderer/src/App.tsx), for the screen showcases: the menu, the top bar and the content area.
import { ME } from './_sample.jsx'

const { Avatar, Hx3kLogo, Hx3kMark, Icon, T3KMark, Tone3000Logo } = window.HX3K

const NAV = [
  { view: 'tone3000' },
  { view: 'tones', icon: 'tones', label: 'Tones' },
  { view: 'converted', icon: 'wave', label: 'Converted' },
  { view: 'local', icon: 'file', label: 'Local files' },
  { view: 'guide', icon: 'guide', label: 'Load on the HX Stomp' },
  { view: 'settings', icon: 'settings', label: 'Settings' },
]

export function Menu({ current, count = 0, keysHint = false }) {
  return (
    <nav className="sidebar" aria-label="HX3K">
      <div className="wordmark">
        <Hx3kLogo />
        <div className="wordmark-tag">TONE3000 captures for the HX Stomp</div>
      </div>
      <Hx3kMark className="when-rail" />
      {NAV.map((item) => {
        const name = item.label ?? 'TONE3000'
        return (
          <button key={item.view} type="button" className="nav-item" aria-label={name} aria-current={current === item.view ? 'page' : undefined}>
            {item.icon ? (
              <Icon name={item.icon} />
            ) : (
              <>
                <Tone3000Logo className="when-wide" />
                <T3KMark className="when-rail" decorative />
              </>
            )}
            {item.label && <span className="nav-label">{name}</span>}
            {item.view === 'converted' && count > 0 && <span className="nav-count">{count}</span>}
          </button>
        )
      })}
      <div className="sidebar-foot">
        {keysHint && (
          <p className="keys-hint">
            <kbd>F6</kbd> <span>moves between this menu and TONE3000</span>
          </p>
        )}
        <button type="button" className="powered" aria-label="Powered by TONE3000" title="tone3000.com">
          <span className="powered-label">Powered by</span>
          <Tone3000Logo className="when-wide" />
          <T3KMark className="when-rail" decorative />
        </button>
      </div>
    </nav>
  )
}

/** The whole window. `height` stands in for the window's own height. */
export function Shell({ current, count = 0, signedIn = true, banner = false, height = 640, toasts = null, bare = false, children }) {
  return (
    <div style={{ height, background: 'var(--t3k-canvas)' }}>
      <div className="shell">
        <Menu current={current} count={count} keysHint={bare} />
        <div className="main">
          {banner && <div className="banner">Sample mode: TONE3000 is replaced by made-up tones.</div>}
          {signedIn && !bare && (
            <header className="topbar">
              <div className="who" title={`Signed in as @${ME.username}`}>
                <span className="muted">Signed in as</span>
                <Avatar name={ME.username} src={ME.avatar_url} size={24} />
                <span className="creator-name">@{ME.username}</span>
              </div>
            </header>
          )}
          {bare ? (
            children
          ) : (
            <main className="content" tabIndex={-1}>
              {children}
            </main>
          )}
          <div className="toasts">{toasts}</div>
        </div>
      </div>
    </div>
  )
}

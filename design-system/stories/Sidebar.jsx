export const Menu = () => {
  const NAV = [
    { view: 'tone3000' },
    { view: 'tones', icon: 'tones', label: 'Tones' },
    { view: 'converted', icon: 'wave', label: 'Converted' },
    { view: 'local', icon: 'file', label: 'Local files' },
    { view: 'guide', icon: 'guide', label: 'Load on the HX Stomp' },
    { view: 'settings', icon: 'settings', label: 'Settings' },
  ]
  const [current, setCurrent] = useState('converted')
  return (
    <div style={{ height: 500, width: 232, background: 'var(--t3k-canvas)', display: 'grid' }}>
      <nav className="sidebar" aria-label="HX3K">
        <div className="wordmark">
          <Hx3kLogo />
          <div className="wordmark-tag">TONE3000 captures for the HX Stomp</div>
        </div>
        <Hx3kMark className="when-rail" />
        {NAV.map((item) => {
          const name = item.label ?? 'TONE3000'
          return (
            <button
              key={item.view}
              type="button"
              className="nav-item"
              aria-label={name}
              aria-current={current === item.view ? 'page' : undefined}
              onClick={() => setCurrent(item.view)}
            >
              {/* An entry point to TONE3000 carries its full logo (its compact mark
                  where the menu is only a rail); the others an icon and a word. */}
              {item.icon ? (
                <Icon name={item.icon} />
              ) : (
                <>
                  <Tone3000Logo className="when-wide" />
                  <T3KMark className="when-rail" decorative />
                </>
              )}
              {item.label && <span className="nav-label">{name}</span>}
              {item.view === 'converted' && <span className="nav-count">4</span>}
            </button>
          )
        })}
        <div className="sidebar-foot">
          {/* Only on the TONE3000 screen: the way across by keyboard, said where it is needed. */}
          {current === 'tone3000' && (
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
    </div>
  )
}

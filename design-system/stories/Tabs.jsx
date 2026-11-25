export const ToneLists = () => {
  const KINDS = ['Favorites', 'Downloaded', 'Created', 'Trending', 'Latest']
  const [tab, setTab] = useState(0)
  const tabs = useRef([])
  // The tabs are one stop for Tab; the arrows move between them.
  const onKeyDown = (e) => {
    const to =
      e.key === 'ArrowRight' ? (tab + 1) % KINDS.length : e.key === 'ArrowLeft' ? (tab - 1 + KINDS.length) % KINDS.length : e.key === 'Home' ? 0 : e.key === 'End' ? KINDS.length - 1 : -1
    if (to < 0) return
    e.preventDefault()
    setTab(to)
    tabs.current[to]?.focus()
  }
  return (
    <div className="tabbar">
      <div className="tablist" role="tablist" aria-label="Tone lists" onKeyDown={onKeyDown}>
        {KINDS.map((kind, i) => (
          <button
            key={kind}
            ref={(el) => {
              tabs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={tab === i}
            tabIndex={tab === i ? 0 : -1}
            // "Trending" starts the second group: the lists that are not the user's own.
            className={i === 3 ? 'tab tab-group' : 'tab'}
            onClick={() => setTab(i)}
          >
            {kind}
          </button>
        ))}
      </div>
      <div className="tabbar-end">
        <button type="button" className="btn btn-quiet btn-sm">
          <Icon name="refresh" />
          Refresh
        </button>
      </div>
    </div>
  )
}

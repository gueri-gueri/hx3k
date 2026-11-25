import { Shell } from './_shell.jsx'
import { TONES } from './_sample.jsx'

export const TonesScreen = () => (
  <Shell
    current="tones"
    count={4}
    height={980}
    toasts={
      <div className="toast-stack" role="status">
        <div className="toast toast-ok">
          <Icon name="check" />
          <span className="selectable">3 captures converted</span>
        </div>
      </div>
    }
  >
    <div className="page">
      <div className="page-head">
        <h1>Your tones</h1>
      </div>

      <div className="tabbar">
        <div className="tablist" role="tablist" aria-label="Tone lists">
          {['Favorites', 'Downloaded', 'Created', 'Trending', 'Latest'].map((kind, i) => (
            <button key={kind} type="button" role="tab" aria-selected={i === 0} tabIndex={i === 0 ? 0 : -1} className={i === 3 ? 'tab tab-group' : 'tab'}>
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

      <div className="tabpanel" role="tabpanel">
        <div className="tone-grid">
          {TONES.slice(1).map((tone) => (
            <article key={tone.id} className={tone.fit === 'no' ? 'tone-card tone-card-dim' : 'tone-card'}>
              <ToneImage className="tone-image" src={tone.image} />
              <div className="tone-card-body">
                <h2 className="tone-title">
                  <button type="button" className="card-link">{tone.title}</button>
                </h2>
                <div className="chips">
                  <span className="chip">{tone.gear}</span>
                  <span className="chip">{tone.format}</span>
                </div>
                <div className="tone-card-foot">
                  <Creator user={tone.user} />
                  <FitChip fit={tone.fit} />
                </div>
              </div>
            </article>
          ))}
          <article className="tone-card more-card">
            <T3KMark decorative />
            <h2 className="tone-title">
              <button type="button" className="card-link">Discover more on TONE3000</button>
            </h2>
            <p>Search the whole library and bring back the tone you want.</p>
          </article>
        </div>
        <div className="pager">
          <button type="button" className="btn btn-outline btn-sm" disabled>Previous</button>
          <span>Page 1 of 3</span>
          <button type="button" className="btn btn-outline btn-sm">Next</button>
        </div>
      </div>
    </div>
  </Shell>
)

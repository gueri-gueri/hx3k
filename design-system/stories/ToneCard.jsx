import { TONES } from './_sample.jsx'

export const Grid = () => (
  <div className="tone-grid">
    {TONES.slice(0, 2).map((tone) => (
      <article key={tone.id} className="tone-card">
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
            <FitChip fit="ready" />
          </div>
        </div>
      </article>
    ))}
    {/* A list is a starting point: the whole catalog is one click away. */}
    <article className="tone-card more-card">
      <T3KMark decorative />
      <h2 className="tone-title">
        <button type="button" className="card-link">Discover more on TONE3000</button>
      </h2>
      <p>Search the whole library and bring back the tone you want.</p>
    </article>
  </div>
)

export const NotForTheStomp = () => (
  <div style={{ maxWidth: 260 }}>
    {/* A tone the HX Stomp cannot play steps back: the picture fades, the title goes to the secondary color. */}
    <article className="tone-card tone-card-dim">
      <ToneImage className="tone-image" src={TONES[4].image} />
      <div className="tone-card-body">
        <h2 className="tone-title">
          <button type="button" className="card-link">Vintage 4x12 Greenbacks</button>
        </h2>
        <div className="chips">
          <span className="chip">Cabinet</span>
          <span className="chip">IR</span>
        </div>
        <div className="tone-card-foot">
          <Creator user={{ username: 'ir_maker', avatar_url: null, is_verified: true }} />
          <FitChip fit="no" />
        </div>
      </div>
    </article>
  </div>
)

export const NoPicture = () => (
  <div style={{ maxWidth: 260 }}>
    <article className="tone-card">
      <ToneImage className="tone-image" src={null} />
      <div className="tone-card-body">
        <h2 className="tone-title">
          <button type="button" className="card-link">AC30 Top Boost Chime</button>
        </h2>
        <div className="chips">
          <span className="chip">Amp + Cab</span>
          <span className="chip">NAM</span>
        </div>
        <div className="tone-card-foot">
          <Creator user={{ username: 'valve_hunter', avatar_url: null, is_verified: false }} />
          <FitChip fit="ready" />
        </div>
      </div>
    </article>
  </div>
)

export const Loading = () => (
  <div style={{ maxWidth: 260 }} role="status" aria-label="Loading…">
    <div className="tone-card" aria-hidden="true">
      <div className="tone-image skeleton" />
      <div className="tone-card-body">
        <div className="skeleton sk-line sk-w75" />
        <div className="skeleton sk-chip sk-w50" />
        <div className="skeleton sk-chip sk-w40" />
      </div>
    </div>
  </div>
)

export const TitleLeadActions = () => (
  <div className="page-head">
    <div>
      <h1>Converted</h1>
      <p>Captures ready for the User IR slots of your HX Stomp.</p>
    </div>
    <div className="actions">
      <button type="button" className="btn btn-outline">How to load them</button>
      <button type="button" className="btn btn-outline">
        <Icon name="folder" />
        Open folder
      </button>
    </div>
  </div>
)

export const SectionHead = () => (
  <section className="section">
    <div className="section-head">
      <div>
        <h2>Model</h2>
        <p>The HX Stomp runs the A2 Lite size, and every A2 file carries it. Pick the models you want and convert them.</p>
      </div>
      <button type="button" className="btn btn-primary">Convert all (3)</button>
    </div>
  </section>
)

export const SectionResults = () => (
  <section className="section">
    <div className="section-head">
      <h2>2 of 3 converted</h2>
      <button type="button" className="btn btn-quiet btn-sm">Clear</button>
    </div>
  </section>
)

export const TightSection = () => (
  <div className="section section-tight" style={{ maxWidth: 420 }}>
    <h2>Description</h2>
    <p className="description description-clamped selectable">
      Sample tone for development. Captured through a made-up signal chain: guitar, the amp at noon, a 4x12 and one dynamic microphone slightly off axis. Three gain settings, each with the same
      microphone position, so the captures can be compared directly. Nothing was added after the amp: no EQ, no compression, no reverb. Recorded at 48 kHz, the rate the HX Stomp runs at.
    </p>
    <button type="button" className="link link-start" aria-expanded={false}>
      Read more
    </button>
  </div>
)

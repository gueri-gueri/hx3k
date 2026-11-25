import { Shell } from './_shell.jsx'
import { TONES } from './_sample.jsx'

export const Tone = () => (
  <Shell current="tones" count={1} height={840}>
    <div className="page">
      <div>
        <button type="button" className="btn btn-quiet btn-sm">
          <Icon name="back" />
          Back
        </button>
      </div>

      <div className="detail">
        <ToneImage className="detail-image" src={TONES[0].image} />
        <div className="detail-info">
          <h1 className="selectable">Plexi Lead 100</h1>
          <div className="chips">
            <span className="chip">Amp Head</span>
            <span className="chip">NAM</span>
            <span className="chip chip-line" title="License">
              License: TONE3000
            </span>
          </div>
          <Creator user={{ username: 'valve_hunter', avatar_url: null, is_verified: true }} size={26} />

          <div className="section section-tight">
            <h2>Description</h2>
            <p className="description selectable">
              Sample tone for development. Captured through a made-up signal chain: guitar, the amp at noon, a 4x12 and one dynamic microphone slightly off axis.
            </p>
          </div>

          <div className="chips">
            <span className="chip chip-line">crunch</span>
            <span className="chip chip-line">british</span>
          </div>

          <div className="meta-row">
            <span>1,301 downloads</span>
            <span>181 favorites</span>
          </div>

          <div>
            <button type="button" className="btn btn-outline btn-sm">
              Open on TONE3000
              <Icon name="external" />
            </button>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Model</h2>
            <p>The HX Stomp runs the A2 Lite size, and every A2 file carries it. Pick the models you want and convert them.</p>
          </div>
          <button type="button" className="btn btn-primary">Convert all (3)</button>
        </div>

        <div className="rows">
          <div className="row">
            <div className="row-main">
              <div className="row-title selectable">Gain 4 - SM57</div>
              <div className="chips">
                <span className="chip chip-ready">
                  <span className="dot" />
                  A2 Lite
                </span>
              </div>
              <div className="row-status row-ok">
                <Icon name="check" />
                <span className="selectable">Saved as Plexi Lead 100 - Gain 4 - SM57 NAM.wav</span>
              </div>
            </div>
            <div className="actions">
              <button type="button" className="btn btn-quiet btn-sm">
                <Icon name="folder" />
                Show in folder
              </button>
              <button type="button" className="btn btn-accent btn-sm">
                <Icon name="upload" />
                Send to the HX Stomp
              </button>
              <button type="button" className="btn btn-quiet btn-sm">Convert again</button>
            </div>
          </div>
          <div className="row">
            <div className="row-main">
              <div className="row-title selectable">Gain 7 - SM57</div>
              <div className="chips">
                <span className="chip chip-ready">
                  <span className="dot" />
                  A2 Lite
                </span>
              </div>
            </div>
            <div className="actions">
              <button type="button" className="btn btn-accent btn-sm">Convert</button>
            </div>
          </div>
          <div className="row">
            <div className="row-main">
              <div className="row-title selectable">Gain 9 - SM57</div>
              <div className="chips">
                <span className="chip chip-ready">
                  <span className="dot" />
                  A2 Standard
                </span>
              </div>
            </div>
            <div className="actions">
              <button type="button" className="btn btn-accent btn-sm">Convert</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Shell>
)

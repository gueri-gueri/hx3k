import { Shell } from './_shell.jsx'

export const WithResults = () => (
  <Shell current="local" count={1} height={760}>
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Local files</h1>
          <p>Already have .nam files? Convert them here. Nothing leaves this computer.</p>
        </div>
      </div>

      <button type="button" className="dropzone" data-over={false}>
        <Icon name="upload" />
        <strong>Drop .nam files here</strong>
        <span className="muted">or click to browse</span>
      </button>

      <p className="muted">Only the 3-channel A2 Lite size works (on capture sites, look for “A2 Lite”). A .nam with several sizes in one file works too: its A2 Lite model is used.</p>

      <section className="section">
        <div className="section-head">
          <h2>1 of 2 converted</h2>
          <button type="button" className="btn btn-quiet btn-sm">Clear</button>
        </div>
        <div className="rows">
          <div className="row">
            <div className="row-main">
              <div className="row-title selectable">Bedroom Combo Clean.nam</div>
              <div className="row-status row-ok">
                <Icon name="check" />
                <span className="selectable">Saved as Bedroom Combo Clean NAM.wav</span>
              </div>
              <div className="chips">
                <span className="chip chip-line chip-off">A2 Lite · 1,871 weights</span>
                <span className="chip chip-line chip-off">from a multi-size .nam</span>
              </div>
            </div>
            <button type="button" className="btn btn-outline btn-sm">
              <Icon name="folder" />
              Show in folder
            </button>
          </div>
          <div className="row">
            <div className="row-main">
              <div className="row-title selectable">Old Standard Capture.nam</div>
              <div className="row-status row-bad">
                <Icon name="alert" />
                <span className="selectable">No A2 Lite model inside. The HX Stomp can run the A2 Lite size only.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Notice>The .wav isn't a sound: it carries the capture's 1,871 numbers. Don't load it into a Cab or IR block. It is for the NAM A2 Lite block only.</Notice>
    </div>
  </Shell>
)

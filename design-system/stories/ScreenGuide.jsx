import { Shell } from './_shell.jsx'

export const LoadOnTheStomp = () => (
  <Shell current="guide" count={1} height={860}>
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Load a capture and play</h1>
          <p>Import the .wav files with HX Edit, then point the NAM A2 Lite block at them.</p>
        </div>
      </div>

      <div className="card setting">
        <div className="setting-text">
          <strong>Your HX Stomp needs HXtra</strong>
          <span>
            The NAM A2 Lite block comes with HXtra, the custom firmware. Stock firmware cannot play these files.{' '}
            <ExternalLink href="https://wisemandenny.github.io/hxtra/web/">HXtra setup page</ExternalLink>
          </span>
        </div>
      </div>

      <ol className="steps steps-lg">
        <li>Open HX Edit with the HX Stomp connected, and open the Impulses list.</li>
        <li>
          <div>
            Drag a .wav from the output folder onto a free slot. Write down its number, for example 5.
            <div className="actions step-actions">
              <button type="button" className="btn btn-outline btn-sm">
                <Icon name="folder" />
                Open folder
              </button>
              <span className="mono muted selectable">/Users/sample/Music/HX3K</span>
            </div>
          </div>
        </li>
        <li>Add a block and pick Amp › NAM › NAM A2 Lite.</li>
        <li>Turn Model (the first knob of page 3) to that slot number. You hear the capture.</li>
      </ol>

      <Notice>The .wav isn't a sound: it carries the capture's 1,871 numbers. Don't load it into a Cab or IR block. It is for the NAM A2 Lite block only.</Notice>

      <section className="section">
        <h2>Good to know</h2>
        <div className="card">
          <div className="setting">
            <div className="setting-text">
              <span className="note">Presets remember the model number, so if you move a capture to another slot, update the presets that use it.</span>
            </div>
          </div>
          <div className="setting">
            <div className="setting-text">
              <span className="note">A slot with a normal cab IR, or nothing, is silent in the NAM A2 Lite block.</span>
            </div>
          </div>
          <div className="setting">
            <div className="setting-text">
              <span className="note">Each block uses about a quarter of the HX Stomp’s DSP.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Shell>
)

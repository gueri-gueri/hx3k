import { Shell } from './_shell.jsx'
import { TONES } from './_sample.jsx'

// The same shell in a window 720px wide or less (or the default window zoomed to 200%):
// the menu is a rail of icons, the paddings step down, and nothing else changes.
export const ConvertedScreen = () => (
  <Shell current="converted" count={2} height={800} banner>
    <div className="page">
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

      <Notice>The .wav isn't a sound: it carries the capture's 1,871 numbers. Don't load it into a Cab or IR block. It is for the NAM A2 Lite block only.</Notice>

      <div className="rows">
        <div className="row">
          <div className="thumb">
            <ToneImage className="thumb-image" src={TONES[0].image} />
            <span className="thumb-mark">
              <T3KMark />
            </span>
          </div>
          <div className="row-main">
            <button type="button" className="row-title row-link">Plexi Lead 100</button>
            <div className="row-sub selectable">Gain 4 - SM57</div>
            <div className="chips">
              <span className="chip">Amp Head</span>
              <span className="chip">NAM</span>
              <span className="chip chip-line">
                <Avatar name="valve_hunter" src={null} size={14} />
                @valve_hunter
              </span>
            </div>
            <div className="row-sub mono selectable">Plexi Lead 100 - Gain 4 - SM57 NAM.wav</div>
          </div>
          <div className="actions actions-end">
            <button type="button" className="btn btn-accent btn-sm">
              <Icon name="upload" />
              Send to the HX Stomp
            </button>
            <button type="button" className="btn btn-outline btn-sm">
              <Icon name="folder" />
              Show in folder
            </button>
            <button type="button" className="btn btn-quiet btn-sm">
              <Icon name="trash" />
              Remove
            </button>
          </div>
        </div>
        <div className="row">
          <div className="thumb">
            <ToneImage className="thumb-image" src={null} />
          </div>
          <div className="row-main">
            <div className="row-title selectable">Bedroom Combo Clean</div>
            <div className="row-sub selectable">Bedroom Combo Clean.nam</div>
            <div className="chips">
              <span className="chip">Local file</span>
            </div>
            <div className="row-sub mono selectable">Bedroom Combo Clean NAM.wav</div>
            <div className="row-status row-ok">
              <Icon name="check" />
              <span className="selectable">Sent to the HX Stomp: slot 12</span>
            </div>
          </div>
          <div className="actions actions-end">
            <button type="button" className="btn btn-outline btn-sm">
              <Icon name="upload" />
              Send again
            </button>
            <button type="button" className="btn btn-outline btn-sm">
              <Icon name="folder" />
              Show in folder
            </button>
            <button type="button" className="btn btn-quiet btn-sm">
              <Icon name="trash" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  </Shell>
)

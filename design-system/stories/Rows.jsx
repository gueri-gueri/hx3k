import { TONES } from './_sample.jsx'

export const Models = () => (
  <div className="rows">
    {/* Not converted yet: the accent button is the row's action. */}
    <div className="row">
      <div className="row-main">
        <div className="row-title selectable">Gain 4 - SM57</div>
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
    {/* Working. */}
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
        <button type="button" className="btn btn-outline btn-sm" disabled>
          <Spinner />
          Converting…
        </button>
      </div>
    </div>
    {/* Done: the outcome stays in the row, and the action steps back to an outline. */}
    <div className="row">
      <div className="row-main">
        <div className="row-title selectable">Gain 9 - SM57</div>
        <div className="chips">
          <span className="chip chip-ready">
            <span className="dot" />
            A2 Standard
          </span>
        </div>
        <div className="row-status row-ok">
          <Icon name="check" />
          <span className="selectable">Saved as Plexi Lead 100 - Gain 9 - SM57 NAM.wav</span>
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-quiet btn-sm">
          <Icon name="folder" />
          Show in folder
        </button>
        <button type="button" className="btn btn-outline btn-sm">Convert again</button>
      </div>
    </div>
    {/* Failed: the reason, in the row. */}
    <div className="row">
      <div className="row-main">
        <div className="row-title selectable">All sizes</div>
        <div className="chips">
          <span className="chip chip-ready">
            <span className="dot" />
            A2 Custom
          </span>
        </div>
        <div className="row-status row-bad" role="alert">
          <Icon name="alert" />
          <span className="selectable">Trained at 44100 Hz. The HX Stomp runs at 48 kHz and does not resample, so it would sound off.</span>
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-accent btn-sm">Convert</button>
      </div>
    </div>
  </div>
)

export const Converted = () => (
  <div className="rows">
    {/* A capture that came from TONE3000: its picture, with the origin marker. */}
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
          <span className="chip chip-line">License: TONE3000</span>
        </div>
        <div className="chips">
          <span className="chip chip-line chip-off">A2 Lite · 1,871 weights</span>
          <span className="chip chip-line chip-off">captured at 12.5 dBu · input −6.5 dB</span>
        </div>
        <div className="row-sub mono selectable">Plexi Lead 100 - Gain 4 - SM57 NAM.wav</div>
      </div>
      <div className="actions actions-end">
        <button type="button" className="btn btn-outline btn-sm">
          <Icon name="folder" />
          Show in folder
        </button>
        <button type="button" className="btn btn-quiet btn-sm" aria-label="Remove: Plexi Lead 100 - Gain 4 - SM57 NAM.wav">
          <Icon name="trash" />
          Remove
        </button>
      </div>
    </div>
    {/* A local file, and the question that replaces the button that asked it. */}
    <div className="row">
      <div className="thumb">
        <ToneImage className="thumb-image" src={null} />
      </div>
      <div className="row-main">
        <div className="row-title selectable">Bedroom Combo Clean</div>
        <div className="row-sub selectable">Bedroom Combo Clean.nam</div>
        <div className="chips">
          <span className="chip">Local file</span>
          <span className="chip chip-line">by sample_player</span>
        </div>
        <div className="chips">
          <span className="chip chip-line chip-off">A2 Lite · 1,871 weights</span>
          <span className="chip chip-line chip-off">from a multi-size .nam</span>
          <span className="chip chip-line chip-off">normalised +3.2 dB</span>
        </div>
        <div className="row-sub mono selectable">Bedroom Combo Clean NAM.wav</div>
      </div>
      <div className="actions actions-end">
        <span className="muted">Move the .wav to the trash?</span>
        <button type="button" className="btn btn-danger btn-sm">Move to trash</button>
        <button type="button" className="btn btn-quiet btn-sm">Cancel</button>
      </div>
    </div>
    {/* The file is gone from disk: nothing left to trash, so it is only forgotten. */}
    <div className="row">
      <div className="thumb">
        <ToneImage className="thumb-image" src={TONES[2].image} />
        <span className="thumb-mark">
          <T3KMark />
        </span>
      </div>
      <div className="row-main">
        <button type="button" className="row-title row-link">Green Overdrive 808</button>
        <div className="row-sub selectable">Gain 7 - SM57</div>
        <div className="chips">
          <span className="chip">Pedal</span>
          <span className="chip">NAM</span>
          <span className="chip chip-line">
            <Avatar name="pedal_shelf" src={null} size={14} />
            @pedal_shelf
          </span>
          <span className="chip chip-line">License: CC BY</span>
        </div>
        <div className="chips">
          <span className="chip chip-line chip-off">A2 Lite · 1,871 weights</span>
        </div>
        <div className="row-sub mono selectable">Green Overdrive 808 - Gain 7 - SM57 NAM.wav</div>
        <div className="row-status row-warn">
          <Icon name="alert" />
          File not found
        </div>
      </div>
      <div className="actions actions-end">
        <button type="button" className="btn btn-quiet btn-sm" aria-label="Remove from list: Green Overdrive 808 - Gain 7 - SM57 NAM.wav">
          <Icon name="trash" />
          Remove from list
        </button>
      </div>
    </div>
  </div>
)

export const LocalResults = () => (
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
)

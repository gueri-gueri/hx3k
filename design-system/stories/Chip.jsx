export const Kinds = () => (
  <div className="chips">
    <span className="chip">Amp Head</span>
    <span className="chip">NAM</span>
    <span className="chip chip-line">License: CC BY</span>
    <span className="chip chip-ready">
      <span className="dot" />
      A2 Lite
    </span>
    <span className="chip chip-line chip-off">Not for the HX Stomp</span>
  </div>
)

export const ModelSize = () => (
  <div className="chips">
    <span className="chip chip-ready" title="A NAM A2 tone: its A2 Lite model converts for the HX Stomp">
      <span className="dot" />
      A2 Lite
    </span>
    <span className="chip chip-ready" title="A NAM A2 tone: its A2 Lite model converts for the HX Stomp">
      <span className="dot" />
      A2 Standard
    </span>
    <span className="chip chip-ready" title="A NAM A2 tone: its A2 Lite model converts for the HX Stomp">
      <span className="dot" />
      A2 Custom
    </span>
  </div>
)

export const ConversionFacts = () => (
  <div className="chips">
    <span className="chip chip-line chip-off">A2 Lite · 1,871 weights</span>
    <span className="chip chip-line chip-off">from a multi-size .nam</span>
    <span className="chip chip-line chip-off">scaled ÷2</span>
    <span className="chip chip-line chip-off">captured at 12.5 dBu · input −6.5 dB</span>
    <span className="chip chip-line chip-off">normalised +3.2 dB</span>
  </div>
)

export const CreatorAndTags = () => (
  <div className="chips">
    <span className="chip chip-line">
      <Avatar name="valve_hunter" src={null} size={14} />
      @valve_hunter
    </span>
    <span className="chip chip-line">crunch</span>
    <span className="chip chip-line">british</span>
    <span className="chip">Local file</span>
    <span className="chip chip-line">by sample_player</span>
  </div>
)

export const PathAndActions = () => (
  <div className="card">
    <div className="setting">
      <div className="setting-text">
        <strong className="mono selectable path">/Users/sample/Music/HX3K</strong>
        <span>Where the .wav files are written.</span>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-quiet btn-sm">
          <Icon name="folder" />
          Open folder
        </button>
        <button type="button" className="btn btn-outline btn-sm">Choose…</button>
      </div>
    </div>
  </div>
)

export const Toggles = () => {
  const [level, setLevel] = useState(true)
  const [loudness, setLoudness] = useState(false)
  return (
    <div className="card">
      <div className="setting">
        <div className="setting-text">
          <strong>Match the capture’s input level</strong>
          <span>When a capture gives its input level, the HX Stomp trims its input so the capture is driven as it was recorded. Off: no trim.</span>
        </div>
        <Toggle checked={level} onChange={setLevel} label="Match the capture’s input level" />
      </div>
      <div className="setting">
        <div className="setting-text">
          <strong>Even out loudness</strong>
          <span>When a capture gives its loudness, its output is set to −18 dB so captures play at about the same volume. Off: as it comes out.</span>
        </div>
        <Toggle checked={loudness} onChange={setLoudness} label="Even out loudness" />
      </div>
    </div>
  )
}

export const Account = () => (
  <div className="card">
    <div className="setting">
      <div className="setting-text setting-text-row">
        <Tone3000Logo />
        <span className="account">
          <Avatar name="sample_player" src={null} size={22} />
          Connected as @sample_player
        </span>
      </div>
      <button type="button" className="btn btn-outline btn-sm">Sign out</button>
    </div>
    <div className="setting">
      <div className="setting-text">
        <strong>Publishable key</strong>
        <span className="mono">t3k_pub_4f1c…</span>
      </div>
      <button type="button" className="btn btn-quiet btn-sm">Change key</button>
    </div>
  </div>
)

export const Notes = () => (
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
  </div>
)

export const About = () => (
  <div className="card about">
    <strong className="about-title">HX3K · Version 0.1.0</strong>
    <p>HX3K downloads the NAM captures you pick on TONE3000 and converts them with HXtra’s own converter, so the files are the ones HXtra’s setup page would give.</p>
    <p>
      Free software under the GNU General Public License, version 3 or later. <ExternalLink href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0-or-later</ExternalLink>
    </p>
    <p className="actions actions-loose">
      <ExternalLink href="https://www.tone3000.com">TONE3000</ExternalLink>
      <ExternalLink href="https://github.com/wisemandenny/hxtra">HXtra</ExternalLink>
      <ExternalLink href="https://www.neuralampmodeler.com">Neural Amp Modeler</ExternalLink>
    </p>
    <small>TONE3000 is a trademark of its owner. Line 6, Helix, HX Stomp and HX Edit are trademarks of Yamaha Guitar Group, Inc. This project is not affiliated with, endorsed by or supported by any of them.</small>
  </div>
)

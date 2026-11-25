import { Shell } from './_shell.jsx'

export const AllSections = () => {
  const [level, setLevel] = useState(true)
  const [loudness, setLoudness] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('system')
  return (
    <Shell current="settings" count={1} height={1180}>
      <div className="page page-narrow">
        <div className="page-head">
          <h1>Settings</h1>
        </div>

        <section className="section">
          <h2>Output folder</h2>
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
        </section>

        <section className="section">
          <h2>Conversion</h2>
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
        </section>

        <section className="section">
          <h2>Appearance</h2>
          <div className="card">
            <div className="setting">
              <div className="setting-text">
                <strong>
                  <label htmlFor="language">Language</label>
                </strong>
              </div>
              <span className="select-wrap">
                <select id="language" className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="system">System</option>
                  <option value="en">English</option>
                  <option value="pt-BR">Português (Brasil)</option>
                </select>
              </span>
            </div>
            <div className="setting">
              <div className="setting-text">
                <strong>Theme</strong>
              </div>
              <div className="segmented" role="group" aria-label="Theme">
                {['Dark', 'Light', 'System'].map((name) => (
                  <button key={name} type="button" aria-pressed={theme === name.toLowerCase()} onClick={() => setTheme(name.toLowerCase())}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>TONE3000 account</h2>
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
        </section>

        <section className="section">
          <h2>About</h2>
          <div className="card about">
            <strong className="about-title">HX3K · Version 0.1.0</strong>
            <p>HX3K downloads the NAM captures you pick on TONE3000 and converts them with HXtra’s own converter, so the files are the ones HXtra’s setup page would give.</p>
            <p>Each capture belongs to its creator and keeps the license shown on its tone. A credits file is written beside the .wav files.</p>
            <p>
              Free software under the GNU General Public License, version 3 or later. <ExternalLink href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0-or-later</ExternalLink>
            </p>
            <p className="actions actions-loose">
              <ExternalLink href="https://www.tone3000.com">TONE3000</ExternalLink>
              <ExternalLink href="https://github.com/wisemandenny/hxtra">HXtra</ExternalLink>
              <ExternalLink href="https://www.neuralampmodeler.com">Neural Amp Modeler</ExternalLink>
              <ExternalLink href="https://www.tone3000.com/api/terms">TONE3000 API Terms</ExternalLink>
            </p>
            <small>TONE3000 is a trademark of its owner. Line 6, Helix, HX Stomp and HX Edit are trademarks of Yamaha Guitar Group, Inc. This project is not affiliated with, endorsed by or supported by any of them.</small>
          </div>
        </section>
      </div>
    </Shell>
  )
}

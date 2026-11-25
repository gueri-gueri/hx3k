import { Shell } from './_shell.jsx'

// First run: the app has no TONE3000 key yet.
export const FirstRun = () => {
  const [key, setKey] = useState('')
  return (
    <Shell current="tones" signedIn={false} height={720}>
      <div className="center">
        <section className="setup">
          <Tone3000Logo />
          <div className="stack-sm">
            <h1>Connect HX3K to TONE3000</h1>
            <p className="muted">TONE3000 gives each app its own key. Create yours once, and paste it here.</p>
          </div>
          <ol className="steps">
            <li>Sign in at tone3000.com and open Settings → API Keys.</li>
            <li>Create a key. No redirect URI needs registering for this app.</li>
            <li>Copy the publishable key (it starts with t3k_pub_) and paste it below.</li>
          </ol>
          <div>
            <button type="button" className="btn btn-outline">
              Open TONE3000 settings
              <Icon name="external" />
            </button>
          </div>
          <form className="field" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="t3k-key">Publishable key</label>
            <div className="input-row">
              <input id="t3k-key" className="input mono" value={key} onChange={(e) => setKey(e.target.value)} placeholder="t3k_pub_…" spellCheck={false} autoComplete="off" />
              <button type="submit" className="btn btn-primary" disabled={key.trim() === ''}>
                Save key
              </button>
            </div>
          </form>
          <p className="muted small">Never paste the secret key (t3k_cs_…). This app has no use for it.</p>
          <button type="button" className="link link-start">
            Only have .nam files on this computer? Convert them without a key in Local files.
          </button>
        </section>
      </div>
    </Shell>
  )
}

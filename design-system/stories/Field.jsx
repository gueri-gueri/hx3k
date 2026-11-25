export const KeyForm = () => {
  const [key, setKey] = useState('')
  return (
    <form className="field" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="t3k-key">Publishable key</label>
      <div className="input-row">
        <input id="t3k-key" className="input mono" value={key} onChange={(e) => setKey(e.target.value)} placeholder="t3k_pub_…" spellCheck={false} autoComplete="off" />
        <button type="submit" className="btn btn-primary" disabled={key.trim() === ''}>
          Save key
        </button>
      </div>
      <p className="muted small">Never paste the secret key (t3k_cs_…). This app has no use for it.</p>
    </form>
  )
}

export const Invalid = () => (
  <form className="field" onSubmit={(e) => e.preventDefault()}>
    <label htmlFor="t3k-key-bad">Publishable key</label>
    <div className="input-row">
      <input id="t3k-key-bad" className="input mono" defaultValue="t3k_cs_4f1c9a…" spellCheck={false} autoComplete="off" aria-invalid aria-describedby="t3k-key-error" />
      <button type="submit" className="btn btn-primary">
        Save key
      </button>
    </div>
    <p id="t3k-key-error" className="field-error" role="alert">
      That is a secret key. Use the publishable key (it starts with t3k_pub_).
    </p>
  </form>
)

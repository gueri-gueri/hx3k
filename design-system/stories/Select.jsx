export const Language = () => {
  const [value, setValue] = useState('system')
  return (
    <div className="setting" style={{ padding: 0 }}>
      <div className="setting-text">
        <strong>
          <label htmlFor="language">Language</label>
        </strong>
      </div>
      {/* The wrap draws the arrow, so it sits at the same 12px inset as the text. */}
      <span className="select-wrap">
        <select id="language" className="select" value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="system">System</option>
          <option value="en">English</option>
          <option value="pt-BR">Português (Brasil)</option>
        </select>
      </span>
    </div>
  )
}

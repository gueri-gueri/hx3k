export const Theme = () => {
  const [theme, setTheme] = useState('dark')
  return (
    <div className="segmented" role="group" aria-label="Theme">
      {['Dark', 'Light', 'System'].map((name) => (
        <button key={name} type="button" aria-pressed={theme === name.toLowerCase()} onClick={() => setTheme(name.toLowerCase())}>
          {name}
        </button>
      ))}
    </div>
  )
}

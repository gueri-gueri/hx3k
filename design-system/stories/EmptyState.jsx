export const TextAndAction = () => (
  <div className="empty">
    <p>No favorites yet. Favorite a tone on TONE3000 and it shows up here.</p>
    <div className="actions">
      <BrowseButton />
    </div>
  </div>
)

export const WithTitle = () => (
  <div className="empty">
    <h2 className="empty-title">Nothing converted yet</h2>
    <p>Pick a tone on TONE3000, or drop your own .nam files, and the .wav files appear here.</p>
    <div className="actions">
      <BrowseButton />
      <button type="button" className="btn btn-outline">Convert local files</button>
    </div>
  </div>
)

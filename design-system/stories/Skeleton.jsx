export const Parts = () => (
  <div className="stack-sm" style={{ maxWidth: 320 }} aria-hidden="true">
    <div className="skeleton sk-title sk-w60" />
    <div className="skeleton sk-line sk-w75" />
    <div className="skeleton sk-chip sk-w35" />
    <div className="skeleton sk-block sk-w90" />
  </div>
)

export const ToneDetailLoading = () => (
  <div className="detail" style={{ gridTemplateColumns: '200px minmax(0, 1fr)' }} role="status" aria-label="Loading…">
    <div className="detail-image skeleton" />
    <div className="detail-info">
      <div className="skeleton sk-title sk-w60" />
      <div className="skeleton sk-chip sk-w35" />
      <div className="skeleton sk-block sk-w90" />
    </div>
  </div>
)

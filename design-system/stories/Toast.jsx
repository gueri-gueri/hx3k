export const Stack = () => (
  // In the app the stack is pinned to the bottom right of `.main`; this box stands in for it.
  <div style={{ position: 'relative', height: 150 }}>
    <div className="toasts">
      <div className="toast-stack" role="status">
        <div className="toast toast-ok">
          <Icon name="check" />
          <span className="selectable">3 captures converted</span>
        </div>
      </div>
      <div className="toast-stack" role="alert">
        <div className="toast toast-error">
          <Icon name="alert" />
          <span className="selectable">TONE3000 could not be reached. Check your connection.</span>
        </div>
      </div>
    </div>
  </div>
)

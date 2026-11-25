export const Idle = () => (
  <button type="button" className="dropzone" data-over={false}>
    <Icon name="upload" />
    <strong>Drop .nam files here</strong>
    <span className="muted">or click to browse</span>
  </button>
)

export const DragOver = () => (
  <button type="button" className="dropzone" data-over={true}>
    <Icon name="upload" />
    <strong>Drop .nam files here</strong>
    <span className="muted">or click to browse</span>
  </button>
)

export const Busy = () => (
  <button type="button" className="dropzone" data-over={false} disabled>
    <Spinner label="Converting…" />
    <strong>Drop .nam files here</strong>
    <span className="muted">or click to browse</span>
  </button>
)

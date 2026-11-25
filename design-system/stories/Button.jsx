export const Variants = () => (
  <div className="actions">
    <button type="button" className="btn btn-primary">Convert all (3)</button>
    <button type="button" className="btn btn-accent">Convert</button>
    <button type="button" className="btn btn-outline">Open folder</button>
    <button type="button" className="btn btn-quiet">Cancel</button>
    <button type="button" className="btn btn-danger">Move to trash</button>
  </div>
)

export const Sizes = () => (
  <div className="actions">
    <button type="button" className="btn btn-primary btn-lg">Continue</button>
    <button type="button" className="btn btn-primary">Save key</button>
    <button type="button" className="btn btn-primary btn-sm">Connect</button>
  </div>
)

export const WithIcon = () => (
  <div className="actions">
    <button type="button" className="btn btn-quiet btn-sm">
      <Icon name="back" />
      Back
    </button>
    <button type="button" className="btn btn-outline">
      <Icon name="folder" />
      Open folder
    </button>
    <button type="button" className="btn btn-outline btn-sm">
      Open on TONE3000
      <Icon name="external" />
    </button>
    <button type="button" className="btn btn-quiet btn-sm">
      <Icon name="trash" />
      Remove
    </button>
  </div>
)

export const DisabledAndBusy = () => (
  <div className="actions">
    <button type="button" className="btn btn-primary" disabled>Save key</button>
    <button type="button" className="btn btn-outline btn-sm" disabled>Previous</button>
    <button type="button" className="btn btn-outline btn-sm" disabled>
      <Spinner />
      Converting…
    </button>
  </div>
)

export const ConfirmInPlace = () => (
  <div className="actions actions-end">
    <span className="muted">Move the .wav to the trash?</span>
    <button type="button" className="btn btn-danger btn-sm">Move to trash</button>
    <button type="button" className="btn btn-quiet btn-sm">Cancel</button>
  </div>
)

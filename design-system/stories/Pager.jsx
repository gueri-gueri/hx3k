export const Middle = () => (
  <div className="pager">
    <button type="button" className="btn btn-outline btn-sm">Previous</button>
    <span>Page 2 of 7</span>
    <button type="button" className="btn btn-outline btn-sm">Next</button>
  </div>
)

export const FirstPage = () => (
  <div className="pager">
    <button type="button" className="btn btn-outline btn-sm" disabled>Previous</button>
    <span>Page 1 of 7</span>
    <button type="button" className="btn btn-outline btn-sm">Next</button>
  </div>
)

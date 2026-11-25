import { Shell } from './_shell.jsx'

// The TONE3000 screen: the menu stays, and TONE3000's own pages (sign-in, then its catalog)
// are laid over the stage as a native view. This is what shows while that view opens.
export const Opening = () => (
  <Shell current="tone3000" bare height={480}>
    <main className="stage" aria-label="TONE3000">
      <div className="stage-wait">
        <Spinner label="Opening TONE3000…" />
        <strong>Opening TONE3000…</strong>
        <span>Sign in with your email, then pick a tone.</span>
      </div>
    </main>
  </Shell>
)

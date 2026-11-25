import { Shell } from './_shell.jsx'

// Before sign-in: the two logos are the picture, and the one primary action is Continue.
export const ConnectToTone3000 = () => (
  <Shell current="tone3000" signedIn={false} height={640}>
    <div className="center">
      <section className="splash">
        <h1 className="sr-only">Connect to TONE3000</h1>
        <div className="partners">
          <Hx3kLogo />
          <span className="times" aria-hidden="true">
            ×
          </span>
          <Tone3000Logo />
        </div>
        <p className="splash-copy">
          HX3K connects to TONE3000 to give you access to a massive library of Neural Amp Modeler (NAM) captures of real analog gear, created by a global community of musicians.
        </p>
        <p className="muted">Pick a tone there, and it comes back as the .wav your HX Stomp loads with HXtra.</p>
        <button type="button" className="btn btn-primary btn-lg">Continue</button>
        <p className="splash-fine">
          An independent project. Not affiliated with TONE3000, Line 6 or Yamaha Guitar Group. <ExternalLink href="https://www.tone3000.com">tone3000.com</ExternalLink>
        </p>
      </section>
    </div>
  </Shell>
)

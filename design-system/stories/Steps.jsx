export const Setup = () => (
  <ol className="steps">
    <li>Sign in at tone3000.com and open Settings → API Keys.</li>
    <li>Create a key. No redirect URI needs registering for this app.</li>
    <li>Copy the publishable key (it starts with t3k_pub_) and paste it below.</li>
  </ol>
)

export const Guide = () => (
  <ol className="steps steps-lg">
    <li>Connect the HX Stomp by USB, with HX Edit closed.</li>
    <li>
      <div>
        Press Send to the HX Stomp on a capture, in Converted. It goes to a free User IR slot, and the app tells you the slot’s number.
        <div className="actions step-actions">
          <button type="button" className="btn btn-outline btn-sm">Converted</button>
        </div>
      </div>
    </li>
    <li>Add a block and pick Amp › NAM › NAM A2 Lite.</li>
    <li>Turn Model (the first knob of page 3) to that slot number. You hear the capture.</li>
  </ol>
)

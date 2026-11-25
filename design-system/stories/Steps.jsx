export const Setup = () => (
  <ol className="steps">
    <li>Sign in at tone3000.com and open Settings → API Keys.</li>
    <li>Create a key. No redirect URI needs registering for this app.</li>
    <li>Copy the publishable key (it starts with t3k_pub_) and paste it below.</li>
  </ol>
)

export const Guide = () => (
  <ol className="steps steps-lg">
    <li>Open HX Edit with the HX Stomp connected, and open the Impulses list.</li>
    <li>
      <div>
        Drag a .wav from the output folder onto a free slot. Write down its number, for example 5.
        <div className="actions step-actions">
          <button type="button" className="btn btn-outline btn-sm">
            <Icon name="folder" />
            Open folder
          </button>
          <span className="mono muted selectable">/Users/sample/Music/HX3K</span>
        </div>
      </div>
    </li>
    <li>Add a block and pick Amp › NAM › NAM A2 Lite.</li>
    <li>Turn Model (the first knob of page 3) to that slot number. You hear the capture.</li>
  </ol>
)

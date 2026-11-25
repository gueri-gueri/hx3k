# Content and voice

HX3K talks like a careful friend who knows the gear: short, exact, and never excited. It ships in English and Brazilian Portuguese with the same set of strings, and follows the system's language until told otherwise.

## Voice

- **Say what happens, then what to do.** "TONE3000 could not be reached. Check your connection." "Your TONE3000 session ended. Connect again."
- **Speak to the user as "you"**, and about the app by its name or as "this app": "Pick a tone there, and it comes back as the .wav your HX Stomp loads with HXtra." In Portuguese, "você".
- **Plain words, full sentences, full stops.** No exclamation marks, no emoji, no "Oops", no "Please".
- **Explain the odd thing once, where it matters.** "The .wav isn't a sound: it carries the capture's 1,871 numbers. Don't load it into a Cab or IR block."
- **Be exact about limits.** "Only NAM captures of the A2 Lite size can be converted for the HX Stomp." "Trained at 44100 Hz. The HX Stomp runs at 48 kHz and does not resample, so it would sound off."
- **Be honest about what the app is.** "An independent project. Not affiliated with TONE3000, Line 6 or Yamaha Guitar Group."

## Casing and punctuation

- Sentence case everywhere: titles ("Load a capture and play"), menu entries ("Load on the HX Stomp"), buttons ("Show in folder"), tabs, labels.
- Section labels and "Powered by" are uppercase on screen, by CSS. Write them in sentence case.
- Buttons and labels take no full stop. Sentences in leads, help lines, notices and errors do.
- A colon introduces an explanation ("Off: no trim."). No dashes between clauses.
- An ellipsis is one character (…) and means either "a dialog follows" ("Choose…") or "working" ("Converting…", "Loading…", "Opening TONE3000…").

## Buttons and links

- Start with the verb: Convert, Convert again, Convert all (3), Open folder, Show in folder, Save key, Sign out, Try again.
- Name the destination when a button leaves the app: "Open on TONE3000", "Open TONE3000 settings". These carry the `external` icon after the label.
- The confirmation repeats the action, not "Yes": "Move the .wav to the trash?" is answered by "Move to trash" and "Cancel".
- A link inside a sentence is the name of the place: "HXtra setup page", "tone3000.com".

## Names

Write every name as its owner does.

| Name | Never |
|---|---|
| TONE3000 | Tone3000, T3K in running text |
| HX3K | Hx3k, HX 3K |
| HX Stomp, HX Edit, HXtra | HXStomp, Hx Edit, HXTRA |
| NAM, NAM A2 Lite, A2 Lite, A2 Standard | Nam, a2 lite |
| User IR, IR | user ir |
| .nam, .wav | NAM file, WAV |
| Publishable key (`t3k_pub_…`), secret key (`t3k_cs_…`) | API key, token |

Gear, formats, sizes and licenses are worded as TONE3000's own interface words them: "Amp Head", "Amp + Cab", "Cabinet", "CC BY-NC". An unknown value shows as itself.

The words *tone* (a TONE3000 entry), *capture* (a model of real gear) and *model* (one file of a tone) are not interchangeable: a tone has models; a converted model is a capture ready for the unit. In Portuguese, "tone" stays "tone" and "publishable key" stays in English, as TONE3000 shows them.

## Numbers and units

- A real minus sign and an explicit plus on a change: "−6.5 dB", "+3.2 dB".
- A space before the unit: "48 kHz", "12.5 dBu", "−18 dB".
- Thousands separated as the language does: "1,871 weights" in English, "1.871 pesos" in Portuguese.
- Counts in full: "Page 2 of 7", "1 of 2 converted", "3 captures converted".
- A file is named, not described: "Saved as Plexi Lead 100 - Gain 4 - SM57 NAM.wav".

## Patterns

**A screen's lead** is one sentence saying what the screen holds or does: "Captures ready for the User IR slots of your HX Stomp." "Already have .nam files? Convert them here. Nothing leaves this computer."

**An empty state** says what is missing and what will fill it: "No favorites yet. Favorite a tone on TONE3000 and it shows up here." When nothing can fill it, it only says so: "Nothing trending right now."

**A setting** is named for what it does ("Even out loudness"). Its help line says what happens and ends with what Off means: "…so captures play at about the same volume. Off: as it comes out."

**An error** names the cause in the user's terms and gives the next step. It never shows a code, except the sign-in's own, in brackets at the end. It never blames: "That is a secret key. Use the publishable key (it starts with t3k_pub_)."

**A step** is one action, verb first, naming controls as the other program writes them: "Add a block and pick Amp › NAM › NAM A2 Lite."

**What is said to a screen reader only** is as plain as the rest: a screen's title when it opens, "Saved as {file}", "Removed: {file}", "1 of 2 converted".

## Credit

- "Powered by TONE3000", with its full logo, is at the foot of the menu on every screen.
- Each capture belongs to its creator: show the creator and the license wherever a capture is shown, and say so in About.
- The trademark line closes About, in the smallest type: TONE3000's, then Line 6's and Yamaha Guitar Group's, then that the project is not affiliated with any of them.

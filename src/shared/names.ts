// How the .wav files are named. HXtra's setup page names a converted capture
// "<the .nam's name> NAM.wav"; this keeps that, so files from both look alike.

const MAX_BASE = 80

/** Characters no file system here refuses, trimmed, never empty. */
export function cleanName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, '_')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[. ]+|[. ]+$/g, '')
  return cleaned || 'capture'
}

export function stripNamExtension(name: string): string {
  return name.replace(/\.nam$/i, '')
}

/** "<base> NAM.wav", the base cut to a length HX Edit's list still shows usefully. */
export function wavFileName(base: string): string {
  const cleaned = cleanName(stripNamExtension(base))
  const cut = cleaned.length > MAX_BASE ? cleaned.slice(0, MAX_BASE).replace(/[. ]+$/, '') : cleaned
  return `${cut} NAM.wav`
}

/**
 * The name for a TONE3000 model's file. A model is often named for its settings
 * alone ("Gain 5", "Lite"), which says nothing in a folder of captures, so the
 * tone's title goes in front unless the model's name already has it.
 */
export function modelBaseName(toneTitle: string, modelName: string): string {
  const tone = toneTitle.trim()
  const model = stripNamExtension(modelName.trim())
  if (!model) return tone || 'capture'
  if (!tone || model.toLowerCase().includes(tone.toLowerCase())) return model
  return `${tone} - ${model}`
}

/** "name NAM.wav" -> "name NAM (2).wav" */
export function numbered(fileName: string, n: number): string {
  return fileName.replace(/(\.wav)$/i, ` (${n})$1`)
}

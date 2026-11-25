// The converted captures: the .wav files in the output folder, and the record
// of where each came from. A capture from TONE3000 keeps its creator, license
// and link, here and in a credits file beside the .wav files.

import { app, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { numbered, wavFileName } from '@shared/names'
import type { ConversionInfo, ConversionRecord, DevicePlace, Size, ToneRef } from '@shared/types'
import { AppError } from './errors'
import { readJson, writeJson } from './jsonFile'
import { getSettings } from './settings'

export const CREDITS_FILE = 'TONE3000 credits.txt'

const file = (): string => join(app.getPath('userData'), 'library.json')

let cached: ConversionRecord[] | null = null

function records(): ConversionRecord[] {
  cached ??= readJson<ConversionRecord[]>(file(), []).filter((r) => r && typeof r.filePath === 'string')
  return cached
}

function save(next: ConversionRecord[]): void {
  cached = next
  writeJson(file(), next)
}

/** Newest first, each marked when its .wav is gone from where it was written. */
export function listConversions(): ConversionRecord[] {
  return records().map((r) => ({ ...r, missing: !existsSync(r.filePath) }))
}

export interface NewConversion {
  /** The name to build the file's from, without " NAM.wav". */
  baseName: string
  wav: Uint8Array
  info: ConversionInfo
  source: 'tone3000' | 'local'
  sourceName: string
  tone?: ToneRef
  model?: { id: number; name: string; size: Size }
}

/** The earlier conversion of the same capture, whose file a new one replaces. */
function previous(c: NewConversion, dir: string): ConversionRecord | undefined {
  return records().find((r) => {
    if (dirname(r.filePath) !== dir || r.source !== c.source) return false
    if (c.source === 'tone3000') return r.tone?.id === c.tone?.id && r.model?.id === c.model?.id
    return r.sourceName === c.sourceName
  })
}

/** A path in `dir` that no other capture's file has. */
function freePath(dir: string, fileName: string): string {
  let path = join(dir, fileName)
  for (let n = 2; existsSync(path); n++) path = join(dir, numbered(fileName, n))
  return path
}

export async function saveConversion(c: NewConversion): Promise<ConversionRecord> {
  const dir = getSettings().outputDir
  const earlier = previous(c, dir)
  // Converting a capture again writes over its own file, never over another's.
  const filePath = earlier?.filePath ?? freePath(dir, wavFileName(c.baseName))
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(filePath, c.wav)
  } catch (err) {
    throw new AppError('write_failed', `Could not write to ${dir}: ${err instanceof Error ? err.message : String(err)}`)
  }

  const record: ConversionRecord = {
    id: earlier?.id ?? randomUUID(),
    createdAt: new Date().toISOString(),
    fileName: basename(filePath),
    filePath,
    source: c.source,
    sourceName: c.sourceName,
    info: c.info,
    tone: c.tone,
    model: c.model,
    // Converted again, it is still the capture that was sent to that slot.
    device: earlier?.device,
  }
  save([record, ...records().filter((r) => r.id !== record.id)])
  await writeCredits(dir)
  return record
}

/** Forgets a conversion and moves its .wav, if still there, to the system trash. */
export async function removeConversion(id: string): Promise<ConversionRecord[]> {
  const record = records().find((r) => r.id === id)
  if (!record) return listConversions()
  if (existsSync(record.filePath)) {
    try {
      await shell.trashItem(record.filePath)
    } catch (err) {
      throw new AppError('write_failed', `Could not move the file to the trash: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  save(records().filter((r) => r.id !== id))
  await writeCredits(dirname(record.filePath))
  return listConversions()
}

export function findConversion(id: string): ConversionRecord | undefined {
  return records().find((r) => r.id === id)
}

/** Notes where on the HX Stomp a capture was put. */
export function setDevicePlace(id: string, device: DevicePlace): ConversionRecord {
  const record = findConversion(id)
  if (!record) throw new AppError('not_found', 'This conversion is no longer listed.')
  const next: ConversionRecord = { ...record, device }
  save(records().map((r) => (r.id === id ? next : r)))
  return { ...next, missing: !existsSync(next.filePath) }
}

/** The text of the credits file for the TONE3000 captures among `list`. */
export function creditsText(list: ConversionRecord[]): string {
  const lines = [
    'These captures were downloaded from TONE3000 (https://www.tone3000.com) and',
    "converted for the HX Stomp's NAM A2 Lite block (HXtra). Each one belongs to its",
    'creator and stays under the license its creator chose. Keep this file with them.',
    '',
  ]
  for (const r of list) {
    if (r.source !== 'tone3000' || !r.tone) continue
    lines.push(
      r.fileName,
      `  Tone:    ${r.tone.title}`,
      `  Model:   ${r.model?.name ?? r.sourceName}`,
      `  Creator: @${r.tone.creator.username}${r.tone.creator.url ? ` (${r.tone.creator.url})` : ''}`,
      `  License: ${r.tone.license}`,
      `  Source:  ${r.tone.url}`,
      '',
    )
  }
  return lines.join('\n')
}

/** Rewrites the credits file of `dir` from the TONE3000 captures still there. */
async function writeCredits(dir: string): Promise<void> {
  if (!existsSync(dir)) return
  const here = records().filter((r) => dirname(r.filePath) === dir && r.source === 'tone3000' && existsSync(r.filePath))
  const path = join(dir, CREDITS_FILE)
  try {
    if (here.length) await writeFile(path, creditsText(here), 'utf8')
    else await rm(path, { force: true })
  } catch (err) {
    console.warn('The credits file could not be updated.', err)
  }
}

// The HXtra releases the app can build, each from its manifest in releases/
// (written by scripts/hxtra-release.mjs from HXtra's own repository).

import { dspFits, slotChoices } from '@shared/hxtra'
import type { DspTable, HxtraChoice, HxtraRelease } from '@shared/types'
import { AppError } from '../errors'
import v121 from './releases/v1.2.1.json'

/** What a release's setup page runs, and the hash of every file it loads. */
export interface HxtraManifest {
  version: string
  tag: string
  /** owner/name on GitHub. */
  repository: string
  /** The commit the tag points at: every file is fetched from it. */
  commit: string
  /** The Pyodide its setup page builds with: package.json pins the same. */
  pyodide: string
  stock: { unit: string; fileName: string; md5: string }
  /** The NAM kernel's command, before --slots and -o. */
  kernel: string[]
  /** patch_amp.py's steps that add NAM A2 Lite, each CMD then its arguments. */
  steps: string[][]
  /** The largest Entry 3 an HX Stomp loads (tools/l6ia_verify.py --e3-max). */
  e3Max: number
  /** The release's m4cache.json: the features' code made in advance, and the MD5 of each build. */
  cache: { path: string; url: string; sha256: string }
  features: string[]
  options: string[]
  dsp: DspTable
  /** The MD5 of every build the release tested, by md5Key() of its switches. */
  tested: Record<string, string>
  /** SHA-256 of each file the build reads, by its path in the repository. */
  files: Record<string, string>
}

/** Newest first. */
export const RELEASES: HxtraManifest[] = [v121 as HxtraManifest]

export function findRelease(version: unknown): HxtraManifest {
  const found = RELEASES.find((r) => r.version === version)
  if (!found) throw new AppError('invalid', `HXtra ${String(version)} is not offered.`)
  return found
}

/**
 * What the setup page starts with: NAM A2 Lite on 2 blocks, every DSP feature,
 * the other features off. Should a release's features not all fit beside 2
 * blocks, the last ones listed are left off.
 */
export function defaultChoice(m: Pick<HxtraManifest, 'dsp'>): HxtraChoice {
  const slots = slotChoices(m.dsp)
  const choice: HxtraChoice = { nam: slots.length > 0, slots: slots.includes(2) ? 2 : (slots[0] ?? 0), dsp: [...m.dsp.features], options: [] }
  while (choice.dsp.length && !dspFits(m.dsp, choice)) choice.dsp.pop()
  return choice
}

/** The output's name, as the setup page names its download. */
export function builtName(m: Pick<HxtraManifest, 'tag'>): string {
  return `HXtra_${m.tag}.hxf`
}

export function releaseInfo(m: HxtraManifest): HxtraRelease {
  return {
    version: m.version,
    tag: m.tag,
    notesUrl: `https://github.com/${m.repository}/releases/tag/${m.tag}`,
    stockFileName: m.stock.fileName,
    features: m.features,
    options: m.options,
    dsp: m.dsp,
    defaults: defaultChoice(m),
  }
}

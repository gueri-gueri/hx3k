// HXtra's build tools for one release: the files its setup page loads (build.py,
// tools/, src/m4/, src/sharc/) and the release's m4cache.json, fetched once from
// GitHub at the release's commit and kept. Each file must have the SHA-256 the
// manifest gives, or it is not used: what runs is exactly that release's code.

import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, normalize, sep } from 'node:path'
import { AppError } from '../errors'
import type { HxtraManifest } from './release'

/** Gets the bytes at a URL; throws when they cannot be had. */
export type Fetcher = (url: string) => Promise<Uint8Array>

const PARALLEL = 8

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Every file of the release: its path in the repository (and on disk), where it comes from, its hash. */
export function sourceList(m: HxtraManifest): { path: string; url: string; sha256: string }[] {
  const files = Object.entries(m.files).map(([path, hash]) => ({
    path,
    url: `https://raw.githubusercontent.com/${m.repository}/${m.commit}/${path}`,
    sha256: hash,
  }))
  return [...files, { path: m.cache.path, url: m.cache.url, sha256: m.cache.sha256 }]
}

/** `path` under `dir`, refusing one that would leave it. */
function inside(dir: string, path: string): string {
  const full = normalize(join(dir, path))
  if (isAbsolute(path) || !full.startsWith(normalize(dir) + sep)) throw new AppError('hxtra_tools', `${path} is not a path of the release.`)
  return full
}

async function kept(file: string, hash: string): Promise<boolean> {
  try {
    return sha256(await readFile(file)) === hash
  } catch {
    return false
  }
}

/**
 * Puts the release's files in `dir`, fetching those missing or changed.
 * `onFetched` says how many it fetched, when there were any.
 */
export async function ensureSources(m: HxtraManifest, dir: string, fetcher: Fetcher, onFetched?: (count: number) => void): Promise<void> {
  const list = sourceList(m).map((f) => ({ ...f, file: inside(dir, f.path) }))
  const missing: typeof list = []
  for (const f of list) if (!(await kept(f.file, f.sha256))) missing.push(f)
  if (!missing.length) return

  let next = 0
  const fetchOne = async (): Promise<void> => {
    while (next < missing.length) {
      const f = missing[next++]
      let bytes: Uint8Array
      try {
        bytes = await fetcher(f.url)
      } catch (err) {
        throw new AppError('hxtra_tools', `${f.path} could not be downloaded: ${err instanceof Error ? err.message : String(err)}`)
      }
      if (sha256(bytes) !== f.sha256) throw new AppError('hxtra_tools', `${f.path} is not the file of HXtra ${m.version}.`)
      await mkdir(dirname(f.file), { recursive: true })
      // Written beside it first, so a file half written is never taken for the release's.
      await writeFile(`${f.file}.part`, bytes)
      await rename(`${f.file}.part`, f.file)
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, missing.length) }, fetchOne))
  onFetched?.(missing.length)
}

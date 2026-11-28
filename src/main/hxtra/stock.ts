// Line 6's own firmware file, which HXtra is built from: refused unless it is
// the one release's build takes, byte for byte (its MD5), as build.py and the
// setup page refuse it.

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type { StockFirmware } from '@shared/types'
import { AppError } from '../errors'
import type { HxtraManifest } from './release'

/** The setup page's bounds: the stock file is about 45 MB. */
const MIN_BYTES = 2e6
const MAX_BYTES = 120e6

export function md5File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5')
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * The file at `path`, when it is the stock firmware `m` is built from.
 * `anyHxf`: sample mode, where any .hxf stands in for it.
 */
export async function checkStock(path: string, m: Pick<HxtraManifest, 'stock'>, anyHxf = false): Promise<StockFirmware> {
  const name = basename(path)
  if (!/\.hxf$/i.test(name)) throw new AppError('firmware_not_hxf', `${name} is not a firmware file (.hxf).`)
  // The names the setup page and build.py give what they build.
  if (/^HXtra/i.test(name) || /_(NAM_A2_Lite|HXtra)\.hxf$/i.test(name)) throw new AppError('firmware_built', `${name} was built by HXtra.`)
  let size: number
  try {
    const info = await stat(path)
    if (!info.isFile()) throw new Error('not a file')
    size = info.size
  } catch {
    throw new AppError('not_found', `${name} could not be read.`)
  }
  if (anyHxf) return { path, name, size }
  if (size < MIN_BYTES || size > MAX_BYTES) {
    throw new AppError('firmware_wrong', `${name} is ${(size / 1e6).toFixed(1)} MB; ${m.stock.fileName} is about 45 MB.`)
  }
  const md5 = await md5File(path).catch(() => {
    throw new AppError('not_found', `${name} could not be read.`)
  })
  if (md5 !== m.stock.md5) throw new AppError('firmware_wrong', `${name} has the MD5 ${md5}, not that of ${m.stock.fileName}.`)
  return { path, name, size }
}

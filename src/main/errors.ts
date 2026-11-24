import type { ErrorCode, Result } from '@shared/types'

/** An error the renderer can tell apart by `code` and show by `message`. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export async function toResult<T>(work: () => T | Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await work() }
  } catch (err) {
    if (err instanceof AppError) return { ok: false, code: err.code, message: err.message }
    console.error(err)
    return { ok: false, code: 'unknown', message: err instanceof Error ? err.message : String(err) }
  }
}
